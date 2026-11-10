import { db, save, cooldown } from '../../lib/db.js';
import { user } from '../../lib/db.js';
import { rand, randInt, money, fmtDur, numOf } from '../../lib/utils.js';

const ITEMS = {
  'صنارة': { price: 300, emoji: '🎣', desc: 'تضاعف أرباح الصيد' },
  'معول': { price: 400, emoji: '⛏️', desc: 'تضاعف أرباح التعدين' },
  'درع': { price: 500, emoji: '🛡️', desc: 'يحميك من سرقة واحدة' },
  'ماسة': { price: 2000, emoji: '💎', desc: 'للتجميع والفخر' },
  'بيت': { price: 10000, emoji: '🏠', desc: 'للتجميع والفخر' },
  'سيف': { price: 1500, emoji: '⚔️', desc: 'للدفاع والمغامرة القوية' },
  'خريطة_كنز': { price: 3500, emoji: '🗺️', desc: 'تفتح لك مغامرات سرية مضاعفة الأرباح' },
  'خاتم_ملكي': { price: 8000, emoji: '💍', desc: 'دليل الفخامة والثراء السريع' }
};
const JOBS = ['مبرمج', 'سواق تاكسي', 'نجار', 'مصمم', 'طباخ', 'مدرس', 'ميكانيكي', 'كاتب', 'مهندس أمن سيبراني', 'طيار', 'طبيب', 'محامي'];
const FISH = ['🐟 سمكة بلطي', '🐠 سمكة ملونة', '🦐 جمبري', '🦑 حبّار', '🐡 سمكة منتفخة', '🦈 سمكة قرش نادرة', '🐋 حوت أزرق'];
const ORES = ['🪨 حجر', '🥉 نحاس', '🥈 فضة', '🥇 دهب', '💎 الماس نقي', '🪙 يورانيوم خام'];
const SLOTS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

function amt(str, max) {
  if (['الكل', 'all'].includes(str)) return max;
  const n = parseInt(str);
  return n > 0 ? n : 0;
}
const wait = (reply, ms) => reply(`⏳ استنى ${fmtDur(ms)} قبل ما تكرر الأمر ده.`);

export default [
  { name: 'رصيد', aliases: ['balance', 'bal', 'فلوسي'], desc: 'رصيدك في المحفظة والبنك',
    async run({ u, target, reply }) {
      const x = target ? user(target) : u;
      reply(`💳 *الرصيد*\n\n👛 المحفظة: ${money(x.money)}\n🏦 البنك: ${money(x.bank)}\n💰 الإجمالي: ${money(x.money + x.bank)}`);
    } },

  { name: 'يومي', aliases: ['daily'], desc: 'المكافأة اليومية',
    async run({ u, reply }) {
      const left = cooldown(u, 'daily', 86400000); if (left) return wait(reply, left);
      const r = randInt(200, 500); u.money += r; save(); reply(`🎁 مكافأتك اليومية: *+${money(r)}*\n👛 رصيدك: ${money(u.money)}`);
    } },

  { name: 'اسبوعي', aliases: ['weekly'], desc: 'المكافأة الأسبوعية',
    async run({ u, reply }) {
      const left = cooldown(u, 'weekly', 7 * 86400000); if (left) return wait(reply, left);
      const r = randInt(1500, 3000); u.money += r; save(); reply(`🎁 مكافأتك الأسبوعية: *+${money(r)}*`);
    } },

  { name: 'عمل', aliases: ['work'], desc: 'اشتغل واكسب فلوس (كل ساعة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'work', 3600000); if (left) return wait(reply, left);
      const r = randInt(50, 200); u.money += r; save(); reply(`👷 اشتغلت *${rand(JOBS)}* وكسبت *${money(r)}*`);
    } },

  { name: 'صيد', aliases: ['fish'], desc: 'اصطاد سمك (كل 30 دقيقة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'fish', 1800000); if (left) return wait(reply, left);
      let r = randInt(20, 150); if (u.inv['صنارة'] > 0) r *= 2;
      u.money += r; save(); reply(`🎣 صدت ${rand(FISH)} وبعتها بـ *${money(r)}*${u.inv['صنارة'] > 0 ? ' (صنارتك ضاعفت الربح!)' : ''}`);
    } },

  { name: 'تعدين', aliases: ['mine'], desc: 'نقّب عن معادن (كل 45 دقيقة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'mine', 2700000); if (left) return wait(reply, left);
      let r = randInt(40, 250); if (u.inv['معول'] > 0) r *= 2;
      u.money += r; save(); reply(`⛏️ لقيت ${rand(ORES)} وبعته بـ *${money(r)}*${u.inv['معول'] > 0 ? ' (معولك ضاعف الربح!)' : ''}`);
    } },

  // 🌟 أوامر إضافية عميقة في البنك والاقتصاد (أكثر من 20 أمر جديد ومطور):
  { name: 'استثمار', aliases: ['invest'], desc: 'استثمار أموالك في الأسواق المالية',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('اكتب المبلغ للاستثمار. مثال: /استثمار 300');
      if (n > u.money) return reply('❌ معاكش المبلغ ده في المحفظة.');
      u.money -= n;
      const profit = Math.random() > 0.4;
      const mult = profit ? (1 + Math.random() * 1.5) : 0;
      const finalAmt = Math.floor(n * mult);
      u.money += finalAmt; save();
      if (profit) reply(`📈 نجح الاستثمار وجاب أرباح ضخمة! عاد إليك *${money(finalAmt)}* 🪙`);
      else reply(`📉 انهيار في السوق! خسرت مبلغ الاستثمار بالكامل (${money(n)}).`);
    } },

  { name: 'تسول', aliases: ['beg'], desc: 'اطلب مساعدة مالية من المارة (كل 15 دقيقة)',
    async run({ u, reply }) {
      const left = cooldown(u, 'beg', 900000); if (left) return wait(reply, left);
      if (Math.random() > 0.3) {
        const r = randInt(20, 100); u.money += r; save();
        reply(`🤲 شخص طيب أعطاك صدقة بقيمة *+${money(r)}* 🪙`);
      } else {
        reply(`🚶 محدش عبرك ومحدش رضي يديك حاجة اليوم!`);
      }
    } },

  { name: 'مغامرة_كبرى', aliases: ['adventure', 'مغامرة'], desc: 'انطلق في مغامرة محفوفة بالمخاطر للبحث عن كنز',
    async run({ u, reply }) {
      const left = cooldown(u, 'adventure', 1800000); if (left) return wait(reply, left);
      if (u.money < 150) return reply('❌ تحتاج إلى 150 🪙 على الأقل لبدء المغامرة.');
      u.money -= 150;
      const win = Math.random() > 0.45;
      const prize = randInt(400, 1200);
      if (win) {
        u.money += prize; save();
        reply(`⚔️ خضت معركة شرسة في الكهف المظلم وانتصرت! عثرت على كنز بقيمة *+${money(prize)}* 🪙`);
      } else {
        save();
        reply(`💀 واجهتك وحوش ضارية وهزمتك في المغامرة، خسرت رسوم الرحلة (150 🪙).`);
      }
    } },

  { name: 'قرض', aliases: ['loan'], desc: 'اطلب قرضاً سريعاً من البنك المركزي',
    async run({ u, reply }) {
      const left = cooldown(u, 'loan', 86400000); if (left) return wait(reply, left);
      const loanAmt = 2000;
      u.bank += loanAmt; save();
      reply(`🏛️ وافق البنك المركزي على منحك قرضاً بقيمة *${money(loanAmt)}* 🪙 (يتم سحبه لاحقاً تلقائياً).`);
    } },

  { name: 'سرقة_بنك', aliases: ['heist'], desc: 'عملية سطو مسلح على البنك (مخاطرة عالية)',
    async run({ u, reply }) {
      const left = cooldown(u, 'heist', 7200000); if (left) return wait(reply, left);
      if (u.money < 300) return reply('❌ تحتاج 300 🪙 لتجهيز معدات السطو.');
      u.money -= 300;
      if (Math.random() < 0.25) {
        const loot = randInt(3000, 8000);
        u.bank += loot; save();
        reply(`🚨 نجحت عملية السطو بذكاء خيالي! سرقت خزنة البنك وأودعت *${money(loot)}* 🪙 في حسابك!`);
      } else {
        const fine = randInt(500, 1500);
        u.money = Math.max(0, u.money - fine); save();
        reply(`🚔 فشلت العملية وقبضت عليك الشرطة! غرامة فورية قدرها *${money(fine)}* 🪙.`);
      }
    } },

  { name: 'مكافأة_تنشيطية', aliases: ['bonus'], desc: 'مكافأة عشوائية سريعة',
    async run({ u, reply }) {
      const left = cooldown(u, 'bonus', 10800000); if (left) return wait(reply, left);
      const b = randInt(100, 400); u.money += b; save();
      reply(`🎯 حصلت على مكافأة تنشيطية بقيمة *+${money(b)}* 🪙!`);
    } },

  { name: 'يانصيب', aliases: ['lottery'], desc: 'اشتري تذكرة يانصيب واربح الجوائز الكبرى',
    async run({ u, reply }) {
      const cost = 200;
      if (u.money < cost) return reply(`❌ تذكرة اليانصيب تكلف ${money(cost)} 🪙.`);
      u.money -= cost;
      const roll = Math.random();
      if (roll < 0.15) {
        const win = 5000; u.money += win; save();
        reply(`🎟️ ربحت الجائزة الكبرى في اليانصيب! مبروك *+${money(win)}* 🪙🎉`);
      } else if (roll < 0.45) {
        const win = 400; u.money += win; save();
        reply(`🎟️ ربحت جائزة متوسطة بقيمة *+${money(win)}* 🪙.`);
      } else {
        save();
        reply(`🎟️ للأسف تذكرتك لم تكن الرابحة هذه المرة. حظاً أوفر!`);
      }
    } },

  { name: 'بيع_ممتلكات', aliases: ['sell'], desc: 'بيع جزء من محتويات حقيبتك للسيولة',
    async run({ u, args, reply }) {
      const itemName = args[0];
      if (!itemName || !u.inv[itemName] || u.inv[itemName] <= 0) {
        return reply('❌ اذكر اسم الغرض الصحيح الموجود في حقيبتك لبيعه.\nمثال: /بيع صنارة');
      }
      const itemPrice = ITEMS[itemName]?.price ? Math.floor(ITEMS[itemName].price * 0.6) : 100;
      u.inv[itemName]--;
      u.money += itemPrice; save();
      reply(`💰 بعت عدد 1 من (${itemName}) وحصلت على *${money(itemPrice)}* 🪙 كاش.`);
    } },

  { name: 'تحويل_بنكي', aliases: ['banktransfer'], desc: 'تحويل أموال مباشرة من حسابك البنكي',
    async run({ u, sender, target, rest, reply }) {
      if (!target) return reply('↩️ منشن الشخص. مثال: /تحويل_بنكي @user 500');
      if (numOf(target) === numOf(sender)) return reply('😅 مينفعش تحوّل لنفسك.');
      const n = amt(rest[0], u.bank);
      if (!n) return reply('اكتب المبلغ.');
      if (n > u.bank) return reply('❌ رصيد البنك مش كفاية.');
      u.bank -= n; user(target).bank += n; save();
      reply(`✅ تم تحويل ${money(n)} من حسابك البنكي إلى حساب @${numOf(target)}`, [target]);
    } },

  { name: 'وديعة', aliases: ['depositbox'], desc: 'وضع مبلغ كوديّ لحفظه بأرباح ثابتة',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('اكتب المبلغ للإيداع الاستثماري الآمن.');
      if (n > u.money) return reply('❌ محفظتك لا تحتوي على هذا المبلغ.');
      u.money -= n; u.bank += Math.floor(n * 1.1); save();
      reply(`🛡️ تم إيداع وتجميد مبلغ ${money(n)} بعائد فوري 10% وأضيف للبنك!`);
    } },

  { name: 'راتب_الشركات', aliases: ['company'], desc: 'استلم أرباح شركتك الافتراضية',
    async run({ u, reply }) {
      const left = cooldown(u, 'company', 43200000); if (left) return wait(reply, left);
      const profits = randInt(500, 1500);
      u.bank += profits; save();
      reply(`🏢 أرباح شركتك اليومية أضيفت للبنك بقيمة *+${money(profits)}* 🪙.`);
    } },

  { name: 'تبرع', aliases: ['donate'], desc: 'تبرع للأعضاء المحتاجين في السيرفر',
    async run({ u, args, reply }) {
      const n = amt(args[0], u.money);
      if (!n) return reply('اكتب المبلغ للتبرع به.');
      if (n > u.money) return reply('❌ لا تملك هذا المبلغ.');
      u.money -= n; save();
      reply(`❤️ جزاك الله خيراً! تبرعت بمبلغ *${money(n)}* 🪙 لخدمة أعضاء السيرفر والخير.`);
    } },

  { name: 'إحصائيات_مالية', aliases: ['mystats', 'ثروتي'], desc: 'تقرير شامل عن ثروتك وممتلكاتك',
    async run({ u, reply }) {
      const total = u.money + u.bank;
      const invCount = Object.values(u.inv || {}).reduce((a, b) => a + b, 0);
      reply(`📊 *التقرير المالي الشامل*\n\n👛 الكاش: ${money(u.money)}\n🏦 البنك: ${money(u.bank)}\n💎 الإجمالي الكلي: ${money(total)}\n🎒 عناصر الحقيبة: ${invCount} قطعة`);
    } },

  { name: 'تجميد_الرصيد', aliases: ['lock'], desc: 'حماية أموالك من السرقات المؤقتة',
    async run({ u, reply }) {
      reply(`🔒 رصيدك البنكي مؤمن بالكامل ضد محاولات السطو والسرقة العادية بفضل أنظمة الأمان.`);
    } },

  { name: 'تصنيف_الأثرياء', aliases: ['tier'], desc: 'عرف رتبتك الاقتصادية في السيرفر',
    async run({ u, reply }) {
      const total = u.money + u.bank;
      let rank = 'مواطن فقير 🪙';
      if (total > 50000) rank = 'ملياردير الأساطير 👑';
      else if (total > 20000) rank = 'رجل أعمال مخضرم 💼';
      else if (total > 5000) rank = 'تاجر متوسط 📦';
      reply(`🏷️ رتبتك المالية الحالية:\n*${rank}* (إجمالي الثروة: ${money(total)})`);
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
