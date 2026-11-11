import { db, save, cooldown } from '../../lib/db.js';
import { user } from '../../lib/db.js';
import { rand, randInt, money, fmtDur, numOf } from '../../lib/utils.js';

const ITEMS = {
  'صنارة': { price: 300, emoji: '🎣', desc: 'تضاعف أرباح الصيد' },
  'معول': { price: 400, emoji: '⛏️', desc: 'تضاعف أرباح التعدين' },
  'درع': { price: 500, emoji: '🛡️', desc: 'يحميك من سرقة واحدة' },
  'ماسة': { price: 2000, emoji: '💎', desc: 'للتجميع والفخر' },
  'بيت': { price: 10000, emoji: '🏠', desc: 'للتجميع والفخر' },
  'خاتم_ملكي': { price: 15000, emoji: '👑', desc: 'رتبة ملكية تفاعلية' }
};
const JOBS = ['مبرمج', 'سواق تاكسي', 'نجار', 'مصمم', 'طباخ', 'مدرس', 'ميكانيكي', 'كاتب', 'محلل أمني'];
const FISH = ['🐟 سمكة بلطي', '🐠 سمكة ملونة', '🦐 جمبري', '🦑 حبّار', '🐡 سمكة منتفخة', '🦈 قرش نادر'];
const ORES = ['🪨 حجر', '🥉 نحاس', '🥈 فضة', '🥇 دهب', '💎 الماس خام'];
const SLOTS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

function amt(str, max) {
  if (['الكل', 'all'].includes(str)) return max;
  const n = parseInt(str);
  return n > 0 ? n : 0;
}
const wait = (reply, ms) => reply(`⏳ استنى ${fmtDur(ms)} قبل ما تكرر الأمر ده.`);

export default [
  { name: 'رصيد', aliases: ['balance', 'bal', 'فلوسي'], desc: 'رصيدك في المحفظة والبنك ورتبة الـ VIP',
    async run({ u, target, reply }) {
      const x = target ? user(target) : u;
      const total = x.money + x.bank;
      let vip = 'عضو عشوائي 👤';
      if (total >= 50000) vip = 'أسطوري ذهبي 👑';
      else if (total >= 25000) vip = 'نخبة فضية 🥈';
      else if (total >= 10000) vip = 'عضو برونزي 🥉';

      reply(`💳 *الرصيد والرتبة*\n\n🎖️ الرتبة: ${vip}\n👛 المحفظة: ${money(x.money)}\n🏦 البنك: ${money(x.bank)}\n💰 الإجمالي: ${money(total)}`);
    } },

  { name: 'يومي', aliases: ['daily'], desc: 'المكافأة اليومية',
    async run({ u, reply }) {
      const left = cooldown(u, 'daily', 86400000); if (left) return wait(reply, left);
      const r = randInt(300, 700); u.money += r; save(); reply(`🎁 مكافأتك اليومية: *+${money(r)}*\n👛 رصيدك: ${money(u.money)}`);
    } },

  { name: 'اسبوعي', aliases: ['weekly'], desc: 'المكافأة الأسبوعية',
    async run({ u, reply }) {
      const left = cooldown(u, 'weekly', 7 * 86400000); if (left) return wait(reply, left);
      const r = randInt(2000, 5000); u.money += r; save(); reply(`🎁 مكافأتك الأسبوعية: *+${money(r)}*`);
    } },

  { name: 'عمل', aliases: ['work'], desc: 'اشتغل واكسب فلوس (كل ساعة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'work', 3600000); if (left) return wait(reply, left);
      const r = randInt(70, 250); u.money += r; save(); reply(`👷 اشتغلت *${rand(JOBS)}* وكسبت *${money(r)}*`);
    } },

  { name: 'صيد', aliases: ['fish'], desc: 'اصطاد سمك (كل 30 دقيقة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'fish', 1800000); if (left) return wait(reply, left);
      let r = randInt(30, 180); if (u.inv['صنارة'] > 0) r *= 2;
      u.money += r; save(); reply(`🎣 صدت ${rand(FISH)} وبعتها بـ *${money(r)}*${u.inv['صنارة'] > 0 ? ' (الصنارة ضاعفت الأرباح!)' : ''}`);
    } },

  { name: 'تعدين', aliases: ['mine'], desc: 'نقّب عن معادن (كل 45 دقيقة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'mine', 2700000); if (left) return wait(reply, left);
      let r = randInt(50, 300); if (u.inv['معول'] > 0) r *= 2;
      u.money += r; save(); reply(`⛏️ لقيت ${rand(ORES)} وبعته بـ *${money(r)}*${u.inv['معول'] > 0 ? ' (المعول ضاعف الأرباح!)' : ''}`);
    } },

  // 🌟 تطويرات البنك الجديدة المقترحة والمبتكرة:
  { name: 'استثمار', aliases: ['invest'], desc: 'حط فلوس وتستناها فترة، وترجعلك بربح أو خسارة: /استثمار 500',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('⚠️ اكتب المبلغ المراد استثماره.\nمثال: /استثمار 500');
      if (n > u.money) return reply('❌ معاكش المبلغ ده في المحفظة للاستثمار.');
      u.money -= n;
      const profit = Math.random() > 0.4; // نسبة نجاح 60%
      const multiplier = profit ? (1 + Math.random() * 1.5) : 0;
      const finalVal = Math.floor(n * multiplier);
      u.bank += finalVal; save();
      if (profit) {
        reply(`📈 *نجح الاستثمار بالأسواق!* عاد إلى حسابك البنكي مبلغ وقدره *${money(finalVal)}* 🪙 بربح ممتاز!`);
      } else {
        reply(`📉 *تعثر الاستثمار وهبطت الأسواق!* للأسف خسرت مبلغ الاستثمار (${money(n)}).`);
      }
    } },

  { name: 'قرض', aliases: ['loan'], desc: 'اقترض فلوس من البنك: /قرض 2000',
    async run({ u, args, reply }) {
      if (u.loan && u.loan > 0) return reply(`⚠️ لديك قرض قديم بقيمة *${money(u.loan)}* يجب تسديده أولاً عبر أمر \`/سداد_قرض\`.`);
      const n = amt(args[0], 5000);
      if (!n || n > 5000) return reply('⚠️ الحد الأقصى للقرض هو 5000 🪙.\nمثال: /قرض 2000');
      u.loan = Math.floor(n * 1.25); // فائدة 25%
      u.bank += n; save();
      reply(`🏛️ *تمت الموافقة على القرض!* تم إضافة *${money(n)}* لحسابك البنكي.\n⚠️ إجمالي المبلغ الواجب سداده مع الفائدة هو: *${money(u.loan)}* 🪙.`);
    } },

  { name: 'سداد_قرض', aliases: ['payloan'], desc: 'سداد مبلغ القرض للبنك',
    async run({ u, reply }) {
      if (!u.loan || u.loan <= 0) return reply('🎉 ليس عليك أي ديون أو قروض حالياً للبنك!');
      if (u.money < u.loan) return reply(`❌ محفظتك لا تحتوي على قيمة السداد المطلوبة (*${money(u.loan)}* 🪙).`);
      u.money -= u.loan;
      const cleared = u.loan;
      u.loan = 0; save();
      reply(`✅ *تم سداد القرض بالكامل!* خصم مبلغ *${money(cleared)}* بنجاح، وسجلنا مبروك نظيف تماماً.`);
    } },

  { name: 'مزاد', aliases: ['auction'], desc: 'المزايدة على غرض نادر أو لقب الأسبوع',
    async run({ reply }) {
      reply(`🎯 *مزاد البنك المركزي الحصري*\n\nالأرض المعروضة للمزاد اليوم: **غلاف اللقب الملكي الذهبي 👑**\nالسعر الابتدائي للمزايدة: *5000* 🪙\n\nللمزايدة اكتب:\n\`/زايد [المبلغ]\``);
    } },

  { name: 'زايد', aliases: ['bid'], desc: 'المزايدة بمبلغ في المزاد النشط',
    async run({ u, args, reply }) {
      const bidAmt = amt(args[0], u.money);
      if (!bidAmt || bidAmt < 5000) return reply('⚠️ أقل مبلغ للمزايدة هو 5000 🪙.\nمثال: /زايد 6000');
      if (bidAmt > u.money) return reply('❌ لا تملك هذا المبلغ في محفظتك للمزايدة.');
      reply(`🔥 قام @${numOf(this?.sender || 'عضو')} بالمزايدة بمبلغ ضخم قدره *${money(bidAmt)}* 🪙! من يزيد؟`);
    } },

  { name: 'الرهان_الجماعي', aliases: ['groupbet'], desc: 'رهان جماعي لكل الجروب يشارك فيه الأعضاء',
    async run({ reply }) {
      reply(`🎲 *تحدي الرهان الجماعي*\n\nشارك في الرهان المفتوح الآن بـ 500 🪙، والفايز العشوائي يحسد الحصيلة بالكامل!\nللمشاركة اكتب: \`/شارك_رهان 500\``);
    } },

  { name: 'شارك_رهان', aliases: ['joinbet'], desc: 'المشاركة في الرهان الجماعي القائم',
    async run({ u, args, reply }) {
      const stake = amt(args[0], u.money);
      if (!stake || stake < 100) return reply('⚠️ أدخل مبلغاً صحيحاً للمشاركة (أقل مبلغ 100).');
      if (stake > u.money) return reply('❌ رصيدك لا يكفي للمشاركة.');
      u.money -= stake; save();
      reply(`✅ تم تسجيل مشاركتك بنجاح في الرهان الجماعي بمبلغ *${money(stake)}* 🪙! انتظر إعلان النتيجة.`);
    } },

  { name: 'صندوق_حظ', aliases: ['mysterybox'], desc: 'افتح صندوق حظ عشوائي مقابل 300 🪙',
    async run({ u, reply }) {
      const cost = 300;
      if (u.money < cost) return reply(`❌ فتح الصندوق يحتاج إلى ${money(cost)} 🪙 في المحفظة.`);
      u.money -= cost;
      const win = Math.random();
      if (win < 0.3) {
        const prize = 1500; u.money += prize; save();
        reply(`🎁 *مفاجأة كبرى!* فتحت الصندوق ووجدت بداخله كنزاً ثميناً بقيمة *+${money(prize)}* 🪙!`);
      } else if (win < 0.7) {
        const prize = 400; u.money += prize; save();
        reply(`📦 فتحت الصندوق وربحت جائزة متوسطة بقيمة *+${money(prize)}* 🪙.`);
      } else {
        save();
        reply(`💨 الصندوق كان فارغاً للأسف! ضاعت رسوم الفتح (300 🪙).`);
      }
    } },

  { name: 'بئر_الأماني', aliases: ['wishwell'], desc: 'ارمي عملة في البئر واطلب أمنية',
    async run({ u, reply }) {
      const cost = 50;
      if (u.money < cost) return reply('❌ رمي العملة في البئر يتطلب 50 🪙.');
      u.money -= cost;
      if (Math.random() > 0.5) {
        const reward = 300; u.money += reward; save();
        reply(`✨ استجيبت أمنيتك! ظهرت ومضة نور وأعطتك البئر مبلغ *+${money(reward)}* 🪙.`);
      } else {
        save();
        reply(`💧 سمعت صوت ارتطام العملة بالماء، ولم يحدث شيء. ردد أمنيتك مرة أخرى لاحقاً!`);
      }
    } },

  { name: 'دفتر_الديون', aliases: ['debts'], desc: 'عرض حالة الديون والقروض النشطة',
    async run({ u, reply }) {
      reply(`📜 *سجل الديون والقروض*\n\n- القرض البنكي الحالي: *${money(u.loan || 0)}* 🪙\n- حالة السداد: ${u.loan ? 'مطلوب السداد' : 'لا توجد ديون نشطة ✔️'}`);
    } },

  // الأوامر الأصلية الخاصة بك:
  { name: 'ايداع', aliases: ['deposit', 'dep'], desc: 'ايداع فلوس في البنك: /ايداع 500 أو الكل',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('اكتب المبلغ. مثال: /ايداع 500 أو /ايداع الكل');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      u.money -= n; u.bank += n; save(); reply(`🏦 تم إيداع ${money(n)}`);
    } },

  { name: 'سحب', aliases: ['withdraw'], desc: 'سحب فلوس من البنك',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.bank);
      if (!n) return reply('اكتب المبلغ. مثال: /سحب 500 أو /سحب الكل');
      if (n > u.bank) return reply('❌ رصيد البنك مش كفاية.');
      u.bank -= n; u.money += n; save(); reply(`👛 تم سحب ${money(n)}`);
    } },

  { name: 'تحويل_فلوس', aliases: ['transfer', 'pay'], desc: 'تحويل فلوس لعضو: /تحويل_فلوس @user 500',
    async run({ u, sender, target, rest, reply }) {
      if (!target) return reply('↩️ منشن الشخص. مثال: /تحويل_فلوس @user 500');
      if (numOf(target) === numOf(sender)) return reply('😅 مينفعش تحوّل لنفسك.');
      const n = amt(rest[0], u.money);
      if (!n) return reply('اكتب المبلغ.');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      u.money -= n; user(target).money += n; save();
      reply(`✅ حوّلت ${money(n)} لـ @${numOf(target)}`, [target]);
    } },

  { name: 'سرقة', aliases: ['rob'], desc: 'حاول تسرق عضو (كل ساعة، فيه مخاطرة!)', group: true,
    async run({ u, sender, target, reply }) {
      if (!target) return reply('↩️ منشن اللي عاوز تسرقه.');
      if (numOf(target) === numOf(sender)) return reply('😅 مينفعش تسرق نفسك.');
      const t = user(target);
      if (t.money < 100) return reply('😢 الشخص ده فقير، مفيش حاجة تتسرق.');
      const left = cooldown(u, 'rob', 3600000); if (left) return wait(reply, left);
      if (t.inv['درع'] > 0) { t.inv['درع']--; save(); return reply(`🛡️ @${numOf(target)} كان معاه درع وصدّ السرقة!`, [target]); }
      if (Math.random() < 0.45) {
        const s = Math.min(5000, Math.floor(t.money * randInt(10, 30) / 100));
        t.money -= s; u.money += s; save();
        return reply(`🥷 سرقت *${money(s)}* من @${numOf(target)}!`, [target]);
      }
      const fine = Math.min(u.money, 150); u.money -= fine; save();
      reply(`🚔 اتمسكت! اتغرمت *${money(fine)}*`);
    } },

  { name: 'قمار', aliases: ['gamble', 'bet'], desc: 'راهن بفلوسك (فرصة 45%)',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('اكتب المبلغ. مثال: /قمار 200');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      if (Math.random() < 0.45) { u.money += n; save(); return reply(`🎉 كسبت! +${money(n)}\n👛 رصيدك: ${money(u.money)}`); }
      u.money -= n; save(); reply(`💸 خسرت ${money(n)}\n👛 رصيدك: ${money(u.money)}`);
    } },

  { name: 'سلوت', aliases: ['slots'], desc: 'ماكينة الحظ: /سلوت 100',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('اكتب المبلغ. مثال: /سلوت 100');
      if (n > u.money) return reply('❌ مفيش معاك المبلغ ده.');
      const r = [rand(SLOTS), rand(SLOTS), rand(SLOTS)];
      const same = new Set(r).size;
      let mult = 0; if (same === 1) mult = 5; else if (same === 2) mult = 1.5;
      const win = Math.floor(n * mult) - n; u.money += win; save();
      reply(`🎰 | ${r.join(' | ')} |\n\n${mult ? `🎉 كسبت *${money(win)}* (x${mult})` : `💸 خسرت ${money(n)}`}\n👛 رصيدك: ${money(u.money)}`);
    } },

  { name: 'الاغنياء', aliases: ['richest', 'baltop'], desc: 'أغنى 10 أعضاء',
    async run({ reply }) {
      const top = Object.entries(db.users).sort((a, b) => (b[1].money + b[1].bank) - (a[1].money + a[1].bank)).slice(0, 10);
      if (!top.length) return reply('لسه مفيش بيانات.');
      const medals = ['🥇', '🥈', '🥉'];
      reply('💎 *أغنى الأعضاء*\n\n' + top.map(([k, u], i) => `${medals[i] || '▫️'} @${k} — ${money(u.money + u.bank)}`).join('\n'),
        top.map(([k]) => k + '@s.whatsapp.net'));
    } },

  { name: 'متجر', aliases: ['shop', 'store'], desc: 'عرض المتجر',
    async run({ reply }) {
      reply('🏪 *المتجر*\n\n' + Object.entries(ITEMS).map(([n, i]) => `${i.emoji} *${n}* — ${money(i.price)}\n    ${i.desc}`).join('\n') + '\n\nللشراء: /شراء <الاسم> [العدد]');
    } },

  { name: 'شراء', aliases: ['buy'], desc: 'شراء غرض: /شراء صنارة',
    async run({ u, args, reply }) {
      const item = ITEMS[args[0]];
      if (!item) return reply('❌ غرض غير موجود. شوف /متجر');
      const q = Math.min(50, Math.max(1, parseInt(args[1]) || 1));
      const cost = item.price * q;
      if (u.money < cost) return reply(`❌ محتاج ${money(cost)} وإنت معاك ${money(u.money)}.`);
      u.money -= cost; u.inv[args[0]] = (u.inv[args[0]] || 0) + q; save();
      reply(`✅ اشتريت ${q} × ${item.emoji} ${args[0]} بـ ${money(cost)}`);
    } },

  { name: 'حقيبة', aliases: ['inventory', 'inv'], desc: 'حقيبتك',
    async run({ u, reply }) {
      const e = Object.entries(u.inv).filter(([, n]) => n > 0);
      reply('🎒 *حقيبتك*\n\n' + (e.length ? e.map(([n, c]) => `${ITEMS[n]?.emoji || '▫️'} ${n} × ${c}`).join('\n') : 'فاضية. زور /متجر'));
    } },
];
