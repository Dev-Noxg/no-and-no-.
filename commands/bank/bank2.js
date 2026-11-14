import { user, save, cooldown } from '../../lib/db.js';
import { rand, randInt, money, numOf, fmtDur } from '../../lib/utils.js';

const auctions = new Map(); // jid -> { item, price, highBidder, until }
const pools = new Map();    // jid -> { bets:Map(jid->amount), until }

const TIERS = [
  { min: 0, name: 'مبتدئ', emoji: '🔘' }, { min: 2000, name: 'برونزي', emoji: '🥉' },
  { min: 10000, name: 'فضي', emoji: '🥈' }, { min: 50000, name: 'ذهبي', emoji: '🥇' },
  { min: 200000, name: 'ماسي', emoji: '💎' }, { min: 1000000, name: 'أسطوري', emoji: '👑' },
];
const tierOf = total => [...TIERS].reverse().find(t => total >= t.min);

const INVEST_PLANS = {
  قصير: { ms: 10 * 60000, min: -10, max: 30, label: '10 دقايق' },
  متوسط: { ms: 60 * 60000, min: -20, max: 60, label: 'ساعة' },
  طويل: { ms: 6 * 3600000, min: -35, max: 120, label: '6 ساعات' },
};
const LOAN_LIMIT = u => 500 + u.level * 300;
const LOAN_INTEREST = 0.2;
const LOAN_MS = 24 * 3600000;

export default [
  { name: 'استثمار', aliases: ['invest'], desc: 'استثمر فلوسك: /استثمار 500 متوسط', 
    async run({ u, args, reply }) {
      if (u.invest) return reply('ℹ️ عندك استثمار شغال بالفعل. اجمعه بـ /جمع_الاستثمار');
      const n = parseInt(args[0]);
      const plan = INVEST_PLANS[args[1]];
      if (!n || !plan) return reply(`مثال: /استثمار 500 متوسط\nالخطط المتاحة: ${Object.keys(INVEST_PLANS).join(' , ')}`);
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      u.money -= n;
      u.invest = { amount: n, plan: args[1], due: Date.now() + plan.ms };
      save();
      reply(`📈 استثمرت ${money(n)} في خطة *${args[1]}* (${plan.label}).\nهتقدر تجمعه بعد المدة دي بـ /جمع_الاستثمار`);
    } },

  { name: 'جمع_الاستثمار', aliases: ['collectinvest'], desc: 'جمع أرباح/خسائر الاستثمار',
    async run({ u, reply }) {
      if (!u.invest) return reply('ℹ️ مفيش استثمار شغال. ابدأ بـ /استثمار');
      if (u.invest.due > Date.now()) return reply(`⏳ لسه باقي ${fmtDur(u.invest.due - Date.now())} على الاستثمار.`);
      const plan = INVEST_PLANS[u.invest.plan] || INVEST_PLANS['متوسط'];
      const pct = randInt(plan.min, plan.max);
      const profit = Math.round(u.invest.amount * pct / 100);
      const back = u.invest.amount + profit;
      u.money += Math.max(0, back);
      u.invest = null; save();
      reply(pct >= 0 ? `📈 استثمارك كسب *${pct}%*!\n💰 رجعلك ${money(back)} (ربح ${money(profit)})`
                     : `📉 استثمارك خسر *${Math.abs(pct)}%*.\n💰 رجعلك ${money(Math.max(0, back))}`);
    } },

  { name: 'قرض', aliases: ['loan'], desc: 'اقترض فلوس من البنك (فايدة 20%، يترد خلال 24 ساعة)',
    async run({ u, args, reply }) {
      if (u.loan) return reply(`ℹ️ عليك قرض ${money(u.loan.amount)} لسه. سدده بـ /سداد_القرض`);
      const n = parseInt(args[0]);
      const limit = LOAN_LIMIT(u);
      if (!n) return reply(`اكتب المبلغ. أقصى قرض ليك: ${money(limit)}\nمثال: /قرض 500`);
      if (n > limit) return reply(`❌ أقصى قرض ليك دلوقتي: ${money(limit)} (بيزيد مع مستواك)`);
      u.money += n;
      u.loan = { amount: Math.round(n * (1 + LOAN_INTEREST)), due: Date.now() + LOAN_MS };
      save();
      reply(`🏦 اتقرضت ${money(n)}.\n⚠️ المطلوب سداده: ${money(u.loan.amount)} خلال 24 ساعة (فايدة 20%)`);
    } },

  { name: 'سداد_القرض', aliases: ['payloan'], desc: 'سداد القرض',
    async run({ u, reply }) {
      if (!u.loan) return reply('✅ مفيش عليك قرض.');
      if (u.money < u.loan.amount) return reply(`❌ محتاج ${money(u.loan.amount)} وإنت معاك ${money(u.money)}.`);
      u.money -= u.loan.amount; u.loan = null; save();
      reply('✅ تم سداد القرض بالكامل.');
    } },

  { name: 'قرضي', aliases: ['myloan'], desc: 'حالة قرضك الحالي',
    async run({ u, reply }) {
      if (!u.loan) return reply('✅ مفيش عليك قرض.');
      const left = u.loan.due - Date.now();
      reply(`🏦 المديونية: ${money(u.loan.amount)}\n⏱️ ${left > 0 ? `باقي ${fmtDur(left)} للسداد` : '⚠️ الموعد فات!'}`);
    } },

  { name: 'رتبتي', aliases: ['vip', 'rank2'], desc: 'رتبتك حسب إجمالي ثروتك',
    async run({ u, target, reply }) {
      const x = target ? user(target) : u;
      const t = tierOf(x.money + x.bank);
      const next = TIERS[TIERS.indexOf(t) + 1];
      reply(`${t.emoji} رتبتك: *${t.name}*\n💰 إجمالي الثروة: ${money(x.money + x.bank)}` +
        (next ? `\n📊 محتاج ${money(next.min - (x.money + x.bank))} عشان توصل لـ ${next.emoji} ${next.name}` : '\n🏆 إنت في أعلى رتبة!'));
    } },

  { name: 'مزاد', aliases: ['auction'], desc: 'ابدأ مزاد: /مزاد اسم_الغرض 100 5 (دقايق)', group: true, admin: true,
    async run({ jid, args, reply }) {
      if (auctions.has(jid)) return reply('ℹ️ فيه مزاد شغال بالفعل.');
      const mins = parseInt(args.at(-1));
      const price = parseInt(args.at(-2));
      const item = args.slice(0, -2).join(' ');
      if (!item || !price || !mins) return reply('مثال: /مزاد تاج_نادر 500 5');
      auctions.set(jid, { item, price, highBidder: null, until: Date.now() + mins * 60000 });
      await reply(`🔨 *مزاد جديد!*\n\n🎁 الغرض: ${item}\n💰 السعر الابتدائي: ${money(price)}\n⏱️ المدة: ${mins} دقيقة\n\nزايد بـ: /مزايدة <مبلغ>`);
      setTimeout(() => {
        const a = auctions.get(jid); if (!a) return;
        auctions.delete(jid);
        if (!a.highBidder) return reply(`🔨 المزاد خلص من غير أي مزايدة على "${a.item}".`);
        const w = user(a.highBidder);
        w.inv[a.item] = (w.inv[a.item] || 0) + 1; save();
        reply(`🔨 *خلص المزاد!*\n🏆 الفايز بـ "${a.item}": @${numOf(a.highBidder)}\n💰 بسعر: ${money(a.price)}`, [a.highBidder]);
      }, mins * 60000);
    } },

  { name: 'مزايدة', aliases: ['bid'], desc: 'زايد في المزاد الحالي', group: true,
    async run({ jid, sender, u, args, reply }) {
      const a = auctions.get(jid);
      if (!a || a.until < Date.now()) return reply('ℹ️ مفيش مزاد شغال دلوقتي.');
      const n = parseInt(args[0]);
      if (!n || n <= a.price) return reply(`اكتب مبلغ أكبر من ${money(a.price)}`);
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      a.price = n; a.highBidder = sender;
      reply(`✅ @${numOf(sender)} زايد بـ ${money(n)} على "${a.item}"`, [sender]);
    } },

  { name: 'رهان_جماعي', aliases: ['pool'], desc: 'رهان جماعي: كل اللي يشارك يدخل في سحب على المجموع', group: true,
    async run({ jid, reply }) {
      if (pools.has(jid)) return reply('ℹ️ فيه رهان جماعي شغال. انضم بـ /انضم <مبلغ>');
      pools.set(jid, { bets: new Map(), until: Date.now() + 60000 });
      await reply('🎰 *رهان جماعي جديد!* عندكم دقيقة. انضموا بـ: /انضم <مبلغ>');
      setTimeout(async () => {
        const p = pools.get(jid); if (!p) return;
        pools.delete(jid);
        const entries = [...p.bets.entries()];
        if (entries.length < 2) return reply('🎰 اتلغى، محتاجين 2 على الأقل.');
        const total = entries.reduce((s, [, a]) => s + a, 0);
        let r = Math.random() * total, winner;
        for (const [j, a] of entries) { r -= a; if (r <= 0) { winner = j; break; } }
        const w = user(winner); w.money += total; save();
        reply(`🎰 *الفايز بالرهان الجماعي:* @${numOf(winner)}\n💰 اكتسح البوت كله: ${money(total)}`, [winner]);
      }, 60000);
    } },

  { name: 'انضم', aliases: ['join_pool'], desc: 'الانضمام للرهان الجماعي', group: true,
    async run({ jid, sender, u, args, reply }) {
      const p = pools.get(jid);
      if (!p || p.until < Date.now()) return reply('ℹ️ مفيش رهان جماعي شغال.');
      if (p.bets.has(sender)) return reply('ℹ️ إنت داخل بالفعل.');
      const n = parseInt(args[0]);
      if (!n || n < 10) return reply('اكتب مبلغ 10 أو أكتر.');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      u.money -= n; p.bets.set(sender, n); save();
      reply(`✅ دخلت بـ ${money(n)}. عدد المشاركين: ${p.bets.size}`);
    } },
];
