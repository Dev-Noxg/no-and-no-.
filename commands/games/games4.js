import { rand, randInt, numOf, normAr, sleep } from '../../lib/utils.js';
import { user, save } from '../../lib/db.js';
import { games } from '../../lib/state.js';

const HARD_TRIVIA = [
  ['ما هو العنصر الكيميائي الذي رمزه Au؟', ['الذهب']],
  ['في أي عام سقطت الدولة العباسية على يد المغول؟', ['1258']],
  ['ما اسم أصغر عظمة في جسم الإنسان؟', ['الركابي', 'عظمة الركاب']],
  ['من هو العالم المسلم الذي يُلقب بأبي الجبر؟', ['الخوارزمي']],
  ['ما هي أطول سلسلة جبال في العالم (تحت الماء)؟', ['منتصف الأطلسي', 'سلسلة منتصف المحيط الأطلسي']],
  ['كم عدد العظام في جسم الإنسان البالغ؟', ['206']],
  ['ما هي عاصمة أستراليا؟ (ليست سيدني)', ['كانبرا']],
  ['من الذي اكتشف البنسلين؟', ['ألكسندر فليمنج', 'فلمنج']],
  ['ما هو أعمق خندق محيطي في العالم؟', ['خندق ماريانا', 'ماريانا']],
  ['في أي معركة انتصر المسلمون على الفرس انتصارًا حاسمًا عام 636م؟', ['القادسية']],
  ['ما هو الاسم العلمي لعملية تحول الماء من سائل إلى غاز؟', ['التبخر']],
  ['كم عدد الكروموسومات في الخلية البشرية؟', ['46']],
  ['من بنى سد مأرب الشهير في اليمن القديم؟', ['السبئيون', 'سبأ']],
  ['ما هي الوحدة المستخدمة لقياس شدة الزلازل؟', ['ريختر', 'مقياس ريختر']],
  ['ما اسم أول قمر صناعي أطلقه الإنسان للفضاء؟', ['سبوتنيك', 'سبوتنيك 1']],
];

const blitz = new Map(); // jid -> { answers, winner }

export default [
  { name: 'سؤال_صعب', aliases: ['hardquiz', 'hardtrivia'], desc: 'سؤال ثقافي صعب جدًا (جاوب بـ /جاوب)',
    async run({ jid, reply }) {
      const [q, a] = rand(HARD_TRIVIA);
      games.set(jid, { type: 'trivia', answers: a, until: Date.now() + 120000, hard: true });
      reply(`🔥 *سؤال صعب!* (مكافأة مضاعفة)\n\n${q}\n\nاكتب: /جاوب <إجابتك>\n⏳ معاك دقيقتين`);
    } },

  { name: 'مسابقة_سريعة', aliases: ['blitz'], desc: '5 أسئلة صعبة متتالية، كل واحد يجاوب يكسب نقطة', group: true,
    async run({ jid, reply, react }) {
      if (blitz.has(jid)) return reply('ℹ️ فيه مسابقة سريعة شغالة بالفعل في الجروب ده.');
      const pool = [...HARD_TRIVIA].sort(() => Math.random() - 0.5).slice(0, 5);
      const scores = new Map();
      await reply('🏆 *مسابقة سريعة بدأت!* 5 أسئلة، أول واحد يجاوب صح ياخد نقطة.\n\n⏳ السؤال الأول بعد 3 ثواني...');
      await react('🔥');
      await sleep(3000);
      for (let i = 0; i < pool.length; i++) {
        const [q, answers] = pool[i];
        blitz.set(jid, { answers, winner: null });
        await reply(`❓ *سؤال ${i + 1}/5:*\n${q}\n\nجاوب بـ: /جاوب_سريع <إجابتك>`);
        const start = Date.now();
        while (Date.now() - start < 15000) {
          await sleep(500);
          if (blitz.get(jid)?.winner) break;
        }
        const st = blitz.get(jid);
        if (st?.winner) {
          scores.set(st.winner, (scores.get(st.winner) || 0) + 1);
          await reply(`✅ صح! نقطة لـ @${numOf(st.winner)}`, [st.winner]);
        } else {
          await reply(`⌛ محدش جاوب. الإجابة كانت: ${answers[0]}`);
        }
        blitz.delete(jid);
        if (i < pool.length - 1) await sleep(2000);
      }
      if (!scores.size) return reply('🏁 خلصت المسابقة، محدش سجل نقاط.');
      const top = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      const winner = top[0][0]; const u = user(winner); u.money += 300; save();
      reply(`🏁 *انتهت المسابقة!*\n\n` + top.map(([j, s], i) => `${i === 0 ? '🏆' : `${i + 1}.`} @${numOf(j)}: ${s} نقطة`).join('\n') +
        `\n\n💰 @${numOf(winner)} كسب 300 جايزة!`, top.map(([j]) => j));
    } },

  { name: 'جاوب_سريع', aliases: ['ablitz'], desc: 'إجابة سؤال المسابقة السريعة', group: true,
    async run({ jid, sender, text, reply }) {
      const st = blitz.get(jid);
      if (!st) return reply('ℹ️ مفيش مسابقة سريعة شغالة دلوقتي.');
      if (st.winner) return; // حد سبقك
      if (!st.answers.some(a => normAr(a) === normAr(text))) return reply('❌ غلط!');
      st.winner = sender;
    } },
];
