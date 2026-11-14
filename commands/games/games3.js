import { rand, randInt, numOf, money, fmtDur, normAr } from '../../lib/utils.js';
import { user, save, cooldown } from '../../lib/db.js';

const memory = new Map(); // sender -> { seq, until }
const duels = new Map();  // jid -> true (منع تكرار سريع)

const EMOJIS = ['🍎','🍌','🍇','🍉','🍋','🍓','🥝','🍒','🥭','🍑'];
const WHEEL = [
  { label: '💰 500', money: 500 }, { label: '💰 1000', money: 1000 }, { label: '😢 صفر', money: 0 },
  { label: '💰 200', money: 200 }, { label: '🎉 2000', money: 2000 }, { label: '😭 خسارة 100', money: -100 },
  { label: '💰 300', money: 300 }, { label: '🔥 5000', money: 5000 },
];
const dig = (n, max) => randInt(0, max) < n; // احتمال الكنز

export default [
  { name: 'بلاك_جاك', aliases: ['blackjack', 'bj'], desc: 'بلاك جاك ضد البوت: /بلاك_جاك 100',
    async run({ u, args, reply }) {
      const bet = parseInt(args[0]);
      if (!bet || bet < 10) return reply('اكتب مبلغ الرهان. مثال: /بلاك_جاك 100');
      if (bet > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      const card = () => Math.min(11, randInt(1, 13));
      const sum = arr => arr.reduce((a, b) => a + b, 0);
      let player = [card(), card()], bot = [card(), card()];
      while (sum(player) < 17) player.push(card());
      while (sum(bot) < 17) bot.push(card());
      const ps = sum(player), bs = sum(bot);
      let result, delta;
      if (ps > 21) { result = '💥 فرقعت! خسرت'; delta = -bet; }
      else if (bs > 21 || ps > bs) { result = '🎉 كسبت!'; delta = bet; }
      else if (ps === bs) { result = '🤝 تعادل'; delta = 0; }
      else { result = '😢 خسرت'; delta = -bet; }
      u.money += delta; save();
      reply(`🃏 *بلاك جاك*\n\nإنت: ${player.join(' + ')} = ${ps}\nالبوت: ${bot.join(' + ')} = ${bs}\n\n${result} (${delta >= 0 ? '+' : ''}${delta})`);
    } },

  { name: 'حرب_الورق', aliases: ['war'], desc: 'حرب ورق بسيطة ضد البوت: /حرب_الورق 100',
    async run({ u, args, reply }) {
      const bet = parseInt(args[0]);
      if (!bet || bet < 10) return reply('اكتب مبلغ الرهان. مثال: /حرب_الورق 100');
      if (bet > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      const my = randInt(1, 13), bo = randInt(1, 13);
      const win = my > bo; const draw = my === bo;
      u.money += draw ? 0 : win ? bet : -bet; save();
      reply(`🂡 ورقتك: *${my}*  مقابل  🂱 ورقة البوت: *${bo}*\n\n${draw ? '🤝 تعادل، رجع الرهان' : win ? `🎉 كسبت +${bet}` : `😢 خسرت -${bet}`}`);
    } },

  { name: 'حفر', aliases: ['dig'], desc: 'ابحث عن كنز مدفون (مرة كل ساعتين)',
    async run({ u, reply }) {
      const left = cooldown(u, 'dig', 2 * 3600000);
      if (left) return reply(`⏳ ارجع بعد ${fmtDur(left)}`);
      const found = Math.random() < 0.35;
      if (found) {
        const r = randInt(100, 800); u.money += r; save();
        return reply(`⛏️💰 حفرت ولقيت كنز! +${money(r)}`);
      }
      reply('⛏️ حفرت كويس بس مفيش حاجة النهاردة. جرب تاني بعد شوية.');
    } },

  { name: 'دولاب_الحظ', aliases: ['wheel'], desc: 'لف دولاب الحظ (كل 3 ساعات)',
    async run({ u, reply }) {
      const left = cooldown(u, 'wheel', 3 * 3600000);
      if (left) return reply(`⏳ ارجع بعد ${fmtDur(left)}`);
      const r = rand(WHEEL);
      u.money = Math.max(0, u.money + r.money); save();
      reply(`🎡 الدولاب وقف على: *${r.label}*\n👛 رصيدك: ${money(u.money)}`);
    } },

  { name: 'مصارعة', aliases: ['duel'], desc: 'بارز عضو في مصارعة (رهان اختياري): /مصارعة @خصم 100', group: true,
    async run({ jid, sender, target, u, args, reply }) {
      if (!target) return reply('↩️ منشن اللي عايز تبارزه.\nمثال: /مصارعة @صديقك 100');
      if (numOf(target) === numOf(sender)) return reply('😅 مينفعش تبارز نفسك.');
      if (duels.get(jid)) return reply('⏳ في مبارزة لسه شغالة، استنى شوية.');
      const bet = parseInt(args.find(a => /^\d+$/.test(a))) || 0;
      const opp = user(target);
      if (bet && (bet > u.money || bet > opp.money)) return reply('❌ أحد الطرفين مالوش المبلغ ده.');
      duels.set(jid, true);
      const myPower = randInt(1, 100) + (u.level * 2), oppPower = randInt(1, 100) + (opp.level * 2);
      const winner = myPower >= oppPower ? sender : target;
      const loser = winner === sender ? target : sender;
      if (bet) { user(winner).money += bet; user(loser).money -= bet; save(); }
      setTimeout(() => duels.delete(jid), 3000);
      reply(`🥊 *مبارزة!*\n\n@${numOf(sender)} (قوة ${myPower}) ضد @${numOf(target)} (قوة ${oppPower})\n\n🏆 الفايز: @${numOf(winner)}${bet ? `\n💰 كسب ${money(bet)} من @${numOf(loser)}` : ''}`,
        [sender, target]);
    } },

  { name: 'تذكر', aliases: ['memory'], desc: 'لعبة الذاكرة: احفظ الترتيب وجاوب بـ /رد_تذكر',
    async run({ sender, reply }) {
      const seq = Array.from({ length: 4 }, () => rand(EMOJIS));
      memory.set(sender, { seq, until: Date.now() + 15000 });
      reply(`🧠 *احفظ الترتيب ده:*\n\n${seq.join(' ')}\n\nعندك 15 ثانية، جاوب بـ:\n/رد_تذكر ${seq.join(' ')} (بس متنسخوش، اكتبهم من دماغك 😉)`);
    } },

  { name: 'رد_تذكر', aliases: ['recall'], desc: 'إجابة لعبة الذاكرة',
    async run({ sender, u, text, reply }) {
      const g = memory.get(sender);
      if (!g) return reply('ℹ️ ابدأ اللعبة الأول بـ /تذكر');
      if (g.until < Date.now()) { memory.delete(sender); return reply('⌛ خلص الوقت.'); }
      const given = text.trim().split(/\s+/);
      memory.delete(sender);
      if (given.join('') === g.seq.join('')) {
        const r = randInt(80, 180); u.money += r; save();
        return reply(`✅ تمام! فاكر صح.\n💰 +${r}`);
      }
      reply(`❌ غلط. الترتيب الصح كان: ${g.seq.join(' ')}`);
    } },
];
