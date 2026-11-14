import { db, user, save, cooldown } from '../../lib/db.js';
import { rand, randInt, money, numOf, fmtDur } from '../../lib/utils.js';

const STOCKS = ['نور', 'فجر', 'أمل', 'نجم', 'بريق'];
const JOBS = {
  عامل: { salary: [40, 100], cost: 0 },
  مبرمج: { salary: [100, 250], cost: 2000 },
  طبيب: { salary: [150, 350], cost: 5000 },
  مستثمر: { salary: [200, 500], cost: 15000 },
};

function ensureStocks() {
  db.settings.stocks ??= {};
  for (const s of STOCKS) db.settings.stocks[s] ??= { price: randInt(50, 200), updated: 0 };
  return db.settings.stocks;
}
function tickPrice(stock) {
  if (Date.now() - stock.updated < 600000) return; // يتحدث كل 10 دقايق بس
  const pct = randInt(-15, 15);
  stock.price = Math.max(5, Math.round(stock.price * (1 + pct / 100)));
  stock.updated = Date.now();
}

export default [
  { name: 'الاسهم', aliases: ['stocks', 'market'], desc: 'أسعار الأسهم الحالية',
    async run({ reply }) {
      const stocks = ensureStocks();
      for (const s of STOCKS) tickPrice(stocks[s]);
      reply('📈 *سوق الأسهم*\n\n' + STOCKS.map(s => `🏢 ${s}: ${money(stocks[s].price)}`).join('\n') +
        '\n\nشراء: /شراء_سهم <الاسم> <العدد>\nبيع: /بيع_سهم <الاسم> <العدد>');
    } },

  { name: 'شراء_سهم', aliases: ['buystock'], desc: 'شراء أسهم: /شراء_سهم نور 10',
    async run({ u, args, reply }) {
      const stocks = ensureStocks();
      const name = args[0], qty = parseInt(args[1]) || 1;
      if (!stocks[name]) return reply(`الأسهم المتاحة: ${STOCKS.join(', ')}`);
      tickPrice(stocks[name]);
      const cost = stocks[name].price * qty;
      if (cost > u.money) return reply(`❌ محتاج ${money(cost)} وإنت معاك ${money(u.money)}.`);
      u.money -= cost;
      u.stocks ??= {}; u.stocks[name] = (u.stocks[name] || 0) + qty;
      save(); reply(`✅ اشتريت ${qty} سهم في "${name}" بـ ${money(cost)}`);
    } },

  { name: 'بيع_سهم', aliases: ['sellstock'], desc: 'بيع أسهم: /بيع_سهم نور 5',
    async run({ u, args, reply }) {
      const stocks = ensureStocks();
      const name = args[0], qty = parseInt(args[1]) || 1;
      u.stocks ??= {};
      if (!stocks[name]) return reply(`الأسهم المتاحة: ${STOCKS.join(', ')}`);
      if ((u.stocks[name] || 0) < qty) return reply('❌ مالكش عدد الأسهم ده.');
      tickPrice(stocks[name]);
      const total = stocks[name].price * qty;
      u.stocks[name] -= qty; u.money += total; save();
      reply(`✅ بعت ${qty} سهم في "${name}" بـ ${money(total)}`);
    } },

  { name: 'محفظتي', aliases: ['portfolio'], desc: 'أسهمك الحالية',
    async run({ u, reply }) {
      const stocks = ensureStocks();
      const e = Object.entries(u.stocks || {}).filter(([, n]) => n > 0);
      if (!e.length) return reply('📭 مالكش أسهم. شوف /الاسهم');
      reply('💼 *محفظتك*\n\n' + e.map(([n, q]) => `🏢 ${n}: ${q} سهم (قيمة ${money((stocks[n]?.price || 0) * q)})`).join('\n'));
    } },

  { name: 'وظيفة', aliases: ['job'], desc: 'اختيار وظيفة ثابتة: /وظيفة مبرمج',
    async run({ u, args, reply }) {
      const name = args[0];
      if (!name) return reply('🧑‍💼 *الوظائف المتاحة*\n\n' + Object.entries(JOBS).map(([n, j]) => `${n}: ${money(j.salary[0])}-${money(j.salary[1])} (تكلفة ${money(j.cost)})`).join('\n') + '\n\nمثال: /وظيفة مبرمج');
      const job = JOBS[name];
      if (!job) return reply('❌ وظيفة مش موجودة.');
      if (job.cost > u.money) return reply(`❌ محتاج ${money(job.cost)} عشان تتدرب على الوظيفة دي.`);
      u.money -= job.cost; u.job = name; save();
      reply(`✅ بقيت *${name}* دلوقتي! اكسب راتبك بـ /راتب`);
    } },

  { name: 'راتب', aliases: ['salary'], desc: 'اقبض راتب وظيفتك (كل ساعتين)',
    async run({ u, reply }) {
      if (!u.job) return reply('ℹ️ مالكش وظيفة. اختار واحدة بـ /وظيفة');
      const left = cooldown(u, 'salary', 2 * 3600000);
      if (left) return reply(`⏳ ارجع بعد ${fmtDur(left)}`);
      const job = JOBS[u.job]; const r = randInt(job.salary[0], job.salary[1]);
      u.money += r; save();
      reply(`💼 قبضت راتبك كـ ${u.job}: +${money(r)}`);
    } },

  { name: 'تأمين', aliases: ['insurance'], desc: 'اشترِ تأمين ضد السرقة ليوم كامل (300)',
    async run({ u, reply }) {
      if (u.insurance && u.insurance > Date.now()) return reply(`✅ عندك تأمين فعّال لمدة ${fmtDur(u.insurance - Date.now())}`);
      if (u.money < 300) return reply('❌ محتاج 300 عشان تشتري تأمين.');
      u.money -= 300; u.insurance = Date.now() + 86400000; save();
      reply('🛡️ اشتريت تأمين لمدة يوم كامل ضد السرقة.');
    } },

  { name: 'تبرع', aliases: ['donate'], desc: 'تبرع لصندوق الجروب الجماعي', group: true,
    async run({ jid, u, args, reply }) {
      const n = parseInt(args[0]);
      if (!n || n < 1) return reply('اكتب المبلغ. مثال: /تبرع 100');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      u.money -= n;
      db.groups[jid] ??= {}; db.groups[jid].fund = (db.groups[jid].fund || 0) + n;
      save(); reply(`🤝 تبرعت بـ ${money(n)} لصندوق الجروب.\n💰 رصيد الصندوق: ${money(db.groups[jid].fund)}`);
    } },

  { name: 'صندوق_الجروب', aliases: ['groupfund'], desc: 'رصيد صندوق الجروب الجماعي', group: true,
    async run({ jid, reply }) { reply(`🏦 صندوق الجروب: ${money(db.groups[jid]?.fund || 0)}`); } },

  { name: 'تحويل_جماعي', aliases: ['splitpay'], desc: 'قسّم مبلغ بينك وبين أعضاء: /تحويل_جماعي 300 @a @b', group: true,
    async run({ u, args, mentioned, reply }) {
      const n = parseInt(args[0]);
      if (!n || !mentioned.length) return reply('مثال: /تحويل_جماعي 300 @a @b (يتقسم بينكم)');
      const share = Math.floor(n / (mentioned.length + 1));
      if (n > u.money) return reply('❌ مفيش معاك المبلغ الكامل.');
      u.money -= n - share;
      mentioned.forEach(m => { user(m).money += share; });
      save();
      reply(`✅ اتقسم ${money(n)} على ${mentioned.length + 1} حصص (كل واحد ${money(share)})`, mentioned);
    } },
];
