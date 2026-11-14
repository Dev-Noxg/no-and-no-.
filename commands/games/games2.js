import { rand, randInt, numOf, normAr, sleep } from '../../lib/utils.js';
import { db, user, save } from '../../lib/db.js';

// خرائط منفصلة عن ملف الألعاب الأساسي، كل لعبة ليها حالتها الخاصة
const xo = new Map();       // jid -> { board, turn, players, until }
const hang = new Map();     // jid -> { word, guessed:Set, wrong, until }
const race = new Map();     // jid -> { bets:Map(jid->amount), until, started }
const typing = new Map();   // jid -> { word, until }

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const HANG_WORDS = ['برمجة','اتصالات','مستشفى','مكتبة','طائرة','حديقة','شوكولاتة','استراحة','مفتاح','شجرة','سيارة','مدرسة','كمبيوتر','تليفون','صحراء'];
const HANG_STAGES = ['🙂','😕','😟','😨','😱','💀','⚰️'];
const RIDDLES = [
  ['إيه اللي بيزيد كل ما تاخد منه؟', 'الحفرة'], ['إيه اللي ليه أسنان ومابيعضش؟', 'المشط'],
  ['إيه اللي بينزل الجبل وما بيتحركش؟', 'الطريق'], ['إيه اللي له رجل واحدة ومايمشيش؟', 'الفطر'],
  ['إيه اللي تقدر تمسكه من غير ما تشوفه؟', 'الريح'], ['إيه اللي كل ما تقطع منه يكبر؟', 'الحفرة'],
];
const win = (jid, u) => { u.gameWins ??= {}; u.gameWins[jid] = (u.gameWins[jid] || 0) + 1; save(); };

function checkXO(board) {
  for (const [a, b, c] of WIN_LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.includes(null) ? null : 'draw';
}
function drawXO(board) {
  const s = v => v === 'X' ? '❌' : v === 'O' ? '⭕' : '▫️';
  return [0, 3, 6].map(i => [0, 1, 2].map(j => s(board[i + j])).join('')).join('\n');
}

export default [
  { name: 'اكس_او', aliases: ['xo', 'tictactoe'], desc: 'إكس أو ضد عضو: /اكس_او @الخصم', group: true,
    async run({ jid, sender, target, reply }) {
      if (xo.has(jid)) return reply('ℹ️ فيه لعبة إكس أو شغالة في الجروب ده بالفعل.');
      if (!target) return reply('↩️ منشن اللي عايز تلعب معاه.\nمثال: /اكس_او @صديقك');
      if (numOf(target) === numOf(sender)) return reply('😅 مينفعش تلعب مع نفسك.');
      xo.set(jid, { board: Array(9).fill(null), turn: sender, players: [sender, target], until: Date.now() + 300000 });
      reply(`❌⭕ *إكس أو*\n\n@${numOf(sender)} ضد @${numOf(target)}\n\n${drawXO(Array(9).fill(null))}\n\nدور @${numOf(sender)}! العب بـ: /حط <1-9>`,
        [sender, target]);
    } },

  { name: 'حط', aliases: ['move'], desc: 'لعب خانة في إكس أو: /حط 5', group: true,
    async run({ jid, sender, args, reply }) {
      const g = xo.get(jid);
      if (!g || g.until < Date.now()) { xo.delete(jid); return reply('ℹ️ مفيش لعبة إكس أو شغالة. ابدأ بـ /اكس_او'); }
      if (numOf(sender) !== numOf(g.turn)) return reply('⏳ مش دورك!');
      const i = parseInt(args[0]) - 1;
      if (isNaN(i) || i < 0 || i > 8) return reply('اكتب رقم من 1 لـ 9.');
      if (g.board[i]) return reply('❌ الخانة دي متاخدة.');
      const mark = numOf(sender) === numOf(g.players[0]) ? 'X' : 'O';
      g.board[i] = mark;
      const result = checkXO(g.board);
      if (result === 'draw') { xo.delete(jid); return reply(`🤝 *تعادل!*\n\n${drawXO(g.board)}`); }
      if (result) {
        xo.delete(jid);
        const winnerJid = result === 'X' ? g.players[0] : g.players[1];
        win(jid, user(winnerJid));
        return reply(`🏆 *فاز @${numOf(winnerJid)}!*\n\n${drawXO(g.board)}`, [winnerJid]);
      }
      g.turn = g.players.find(p => numOf(p) !== numOf(sender));
      reply(`${drawXO(g.board)}\n\nدور @${numOf(g.turn)}! /حط <1-9>`, [g.turn]);
    } },

  { name: 'شنطة', aliases: ['hangman'], desc: 'لعبة تخمين كلمة حرف بحرف', group: true,
    async run({ jid, reply }) {
      if (hang.has(jid)) return reply('ℹ️ فيه لعبة شنطة شغالة بالفعل. خمّن بـ /حرف');
      const word = rand(HANG_WORDS);
      hang.set(jid, { word, guessed: new Set(), wrong: 0, until: Date.now() + 300000 });
      reply(`🪢 *لعبة الشنطة*\n\n${HANG_STAGES[0]}\n${[...word].map(() => '_').join(' ')}\n\nخمّن حرف بـ: /حرف <الحرف>`);
    } },

  { name: 'حرف', aliases: ['letter'], desc: 'تخمين حرف في لعبة الشنطة', group: true,
    async run({ jid, sender, u, text, reply }) {
      const g = hang.get(jid);
      if (!g || g.until < Date.now()) { hang.delete(jid); return reply('ℹ️ مفيش لعبة شنطة شغالة. ابدأ بـ /شنطة'); }
      const ch = normAr((text || '').trim()[0] || '');
      if (!ch) return reply('اكتب حرف واحد. مثال: /حرف ا');
      if (g.guessed.has(ch)) return reply('ℹ️ جربت الحرف ده قبل كده.');
      g.guessed.add(ch);
      const word = normAr(g.word);
      if (!word.includes(ch)) {
        g.wrong++;
        if (g.wrong >= HANG_STAGES.length - 1) {
          hang.delete(jid);
          return reply(`${HANG_STAGES.at(-1)} *خسرتوا!* الكلمة كانت: *${g.word}*`);
        }
        return reply(`${HANG_STAGES[g.wrong]} غلط! الحرف "${ch}" مش موجود.\n${[...word].map(c => g.guessed.has(c) ? c : '_').join(' ')}`);
      }
      const display = [...word].map(c => g.guessed.has(c) ? c : '_').join(' ');
      if (![...word].some(c => !g.guessed.has(c))) {
        hang.delete(jid);
        const r = randInt(80, 200); u.money += r; win(jid, u);
        return reply(`🎉 *كسبتوا!* الكلمة كانت: *${g.word}*\n💰 @${numOf(sender)} +${r}`, [sender]);
      }
      reply(`${HANG_STAGES[g.wrong]} صح! \n${display}`);
    } },

  { name: 'سباق', aliases: ['race'], desc: 'سباق رهان جماعي: /سباق ثم /راهن <مبلغ>', group: true,
    async run({ jid, reply }) {
      if (race.has(jid)) return reply('ℹ️ فيه سباق شغال بالفعل. انضم بـ /راهن <مبلغ>');
      race.set(jid, { bets: new Map(), until: Date.now() + 30000 });
      await reply('🏁 *سباق جديد!* عندكم 30 ثانية. انضموا بـ: /راهن <مبلغ>');
      setTimeout(async () => {
        const g = race.get(jid); if (!g) return;
        race.delete(jid);
        const entries = [...g.bets.entries()];
        if (entries.length < 2) return reply('🏁 السباق اتلغى، محتاجين لاعبين 2 على الأقل.');
        const horses = ['🐎', '🐴', '🦄', '🐪'];
        const order = entries.map(([j], i) => ({ j, horse: horses[i % horses.length], pos: 0 }));
        let log = '🏁 *السباق بدأ!*\n\n';
        for (let lap = 0; lap < 3; lap++) order.forEach(o => (o.pos += randInt(1, 5)));
        order.sort((a, b) => b.pos - a.pos);
        const winner = order[0];
        const pot = entries.reduce((s, [, a]) => s + a, 0);
        const u = user(winner.j); u.money += pot; win(jid, u); save();
        log += order.map((o, i) => `${i === 0 ? '🏆' : `${i + 1}.`} ${o.horse} @${numOf(o.j)}`).join('\n');
        reply(`${log}\n\n💰 @${numOf(winner.j)} كسب البوت كله: ${pot}`, entries.map(([j]) => j));
      }, 30000);
    } },

  { name: 'راهن', aliases: ['bet_race'], desc: 'انضمام لسباق برهان', group: true,
    async run({ jid, sender, u, args, reply }) {
      const g = race.get(jid);
      if (!g || g.until < Date.now()) return reply('ℹ️ مفيش سباق شغال. ابدأ بـ /سباق');
      if (g.bets.has(sender)) return reply('ℹ️ إنت داخل السباق بالفعل.');
      const n = parseInt(args[0]);
      if (!n || n < 10) return reply('اكتب مبلغ 10 أو أكتر. مثال: /راهن 100');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      u.money -= n; g.bets.set(sender, n); save();
      reply(`✅ دخلت السباق بـ ${n}. المتسابقين: ${g.bets.size}`);
    } },

  { name: 'لغز', aliases: ['riddle'], desc: 'لغز عشوائي (جاوب بـ /جاوب)',
    async run({ jid, reply }) {
      const [q, a] = rand(RIDDLES);
      typing.set('riddle:' + jid, { answer: a, until: Date.now() + 60000 });
      reply(`🧩 *لغز*\n\n${q}\n\nجاوب بـ: /جاوب_لغز <إجابتك>`);
    } },

  { name: 'جاوب_لغز', aliases: ['ariddle'], desc: 'إجابة اللغز',
    async run({ jid, u, sender, text, reply }) {
      const g = typing.get('riddle:' + jid);
      if (!g || g.until < Date.now()) return reply('ℹ️ مفيش لغز شغال. ابدأ بـ /لغز');
      if (normAr(text) !== normAr(g.answer)) return reply('❌ إجابة غلط، حاول تاني.');
      typing.delete('riddle:' + jid);
      const r = randInt(50, 100); u.money += r; win(jid, u);
      reply(`✅ صح يا @${numOf(sender)}! الإجابة: ${g.answer}\n💰 +${r}`, [sender]);
    } },

  { name: 'تحدي_السرعة', aliases: ['speedtype'], desc: 'أول واحد يكتب الكلمة صح ياخد فلوس', group: true,
    async run({ jid, reply }) {
      if (typing.has(jid)) return reply('ℹ️ فيه تحدي شغال بالفعل.');
      const word = rand(HANG_WORDS) + randInt(1, 99);
      typing.set(jid, { word, until: Date.now() + 20000 });
      await reply(`⚡ *تحدي سرعة!* اكتب الكلمة دي بالظبط أول واحد يكسب:\n\n*${word}*`);
      setTimeout(() => { if (typing.get(jid)?.word === word) { typing.delete(jid); reply('⌛ خلص الوقت، محدش كسب.'); } }, 20000);
    } },

  { name: 'نجوم_الالعاب', aliases: ['gamerank'], desc: 'أكتر اللاعبين فوزًا في الجروب', group: true,
    async run({ jid, reply }) {
      const top = Object.entries(db.users).filter(([, u]) => u.gameWins?.[jid]).sort((a, b) => b[1].gameWins[jid] - a[1].gameWins[jid]).slice(0, 10);
      if (!top.length) return reply('لسه محدش كسب في ألعاب الجروب ده.');
      reply('🌟 *نجوم الألعاب*\n\n' + top.map(([k, u], i) => `${i + 1}. @${k} — ${u.gameWins[jid]} فوز`).join('\n'), top.map(([k]) => k + '@s.whatsapp.net'));
    } },
];
