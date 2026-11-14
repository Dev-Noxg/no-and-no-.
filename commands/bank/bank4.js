import { db, user, save, cooldown } from '../../lib/db.js';
import { rand, randInt, money, numOf, fmtDur, sleep } from '../../lib/utils.js';
import { getMarket, getStock, stockNames, sectorOf, sparkline, pctChange } from '../../lib/market.js';

const SHOP2 = {
  'قطة':   { emoji: '🐱', price: 800,  desc: 'حيوان أليف، تجمع منه كل شوية', rate: 10 },
  'كلب':   { emoji: '🐶', price: 1500, desc: 'حيوان أليف، معدل جمع أعلى',     rate: 20 },
  'ببغاء': { emoji: '🦜', price: 3000, desc: 'حيوان أليف نادر، أعلى معدل',   rate: 35 },
  'سيف':   { emoji: '⚔️', price: 1200, desc: 'يرفع قوتك في /مصارعة' , power: 15 },
  'درع_ثقيل': { emoji: '🛡️', price: 2000, desc: 'يصد سرقتين بدل واحدة', shield: 2 },
  'حظ_مضاعف': { emoji: '🍀', price: 2500, desc: 'يرفع فرصتك في /حفر والدولاب ليوم', buff: 'luck' },
  'مفتاح_ذهبي': { emoji: '🗝️', price: 5000, desc: 'يفتح صندوق سري فيه مفاجأة', special: 'chest' },
  'تاج': { emoji: '👑', price: 20000, desc: 'للفخر بس، يظهر في بروفايلك' },
};

function petIncome(u) {
  if (!u.pet) return 0;
  const item = SHOP2[u.pet];
  if (!item?.rate) return 0;
  const hrs = Math.min(12, (Date.now() - (u.petLast || Date.now())) / 3600000);
  return Math.floor(hrs * item.rate);
}

export default [
  { name: 'السوق_الحي', aliases: ['livemarket', 'market2'], desc: 'سوق الأسهم بالتحديث الحي والرسم البياني',
    async run({ reply }) {
      const m = getMarket();
      const lines = stockNames().map(n => {
        const s = m[n]; const pct = pctChange(s.history);
        const arrow = pct > 0 ? '🟢▲' : pct < 0 ? '🔴▼' : '⚪';
        return `${arrow} *${n}* ${sectorOf(n)}\n   ${money(s.price)} (${pct >= 0 ? '+' : ''}${pct}%)  ${sparkline(s.history)}`;
      });
      reply(`📊 *السوق الحي* (بيتحرك كل دقيقتين لوحده)\n\n${lines.join('\n\n')}\n\n🛒 /شراء_سهم <اسم> <عدد>\n💰 /بيع_سهم <اسم> <عدد>`);
    } },

  { name: 'رسم_بياني', aliases: ['chart'], desc: 'رسم بياني تفصيلي لسهم: /رسم_بياني نور',
    async run({ args, reply }) {
      const name = args[0];
      const s = getStock(name);
      if (!s) return reply(`الأسهم المتاحة: ${stockNames().join(', ')}`);
      const pct = pctChange(s.history);
      reply(`📈 *${name}* ${sectorOf(name)}\n\nالسعر الحالي: ${money(s.price)}\nالتغيّر: ${pct >= 0 ? '+' : ''}${pct}%\n\n${sparkline(s.history)}\n(آخر ${s.history.length} تحديث، كل تحديث دقيقتين)`);
    } },

  { name: 'متجر2', aliases: ['shop2', 'سوبرماركت'], desc: 'متجر أكبر: حيوانات، أسلحة، ترقيات',
    async run({ reply }) {
      reply('🏬 *المتجر الكبير*\n\n' + Object.entries(SHOP2).map(([n, i]) => `${i.emoji} *${n}* — ${money(i.price)}\n   ${i.desc}`).join('\n\n') +
        '\n\n🛒 للشراء: /شراء2 <الاسم>');
    } },

  { name: 'شراء2', aliases: ['buy2'], desc: 'شراء من المتجر الكبير: /شراء2 كلب',
    async run({ u, args, reply }) {
      const name = args[0]; const item = SHOP2[name];
      if (!item) return reply('❌ غرض مش موجود. شوف /متجر2');
      if (u.money < item.price) return reply(`❌ محتاج ${money(item.price)} وإنت معاك ${money(u.money)}.`);
      u.money -= item.price;
      if (item.rate) { u.pet = name; u.petLast = Date.now(); }
      else { u.inv[name] = (u.inv[name] || 0) + 1; }
      save();
      reply(`✅ اشتريت ${item.emoji} *${name}*!${item.rate ? ' دلوقتي عندك حيوان أليف، اجمع أرباحه بـ /اجمع_الحيوان' : ''}`);
    } },

  { name: 'اجمع_الحيوان', aliases: ['collectpet'], desc: 'اجمع دخل حيوانك الأليف',
    async run({ u, reply }) {
      if (!u.pet) return reply('ℹ️ مالكش حيوان أليف. شوف /متجر2');
      const r = petIncome(u);
      if (r < 1) return reply('⏳ لسه بدري، استنى شوية وارجع.');
      u.money += r; u.petLast = Date.now(); save();
      reply(`${SHOP2[u.pet].emoji} جمعت من *${u.pet}*: +${money(r)}`);
    } },

  { name: 'صندوق_سري', aliases: ['chest'], desc: 'افتح الصندوق السري بالمفتاح الذهبي',
    async run({ u, reply }) {
      if (!u.inv['مفتاح_ذهبي']) return reply('❌ محتاج مفتاح_ذهبي الأول. شوف /متجر2');
      u.inv['مفتاح_ذهبي']--;
      const prize = rand([
        { t: 'money', v: randInt(1000, 5000) }, { t: 'money', v: randInt(1000, 5000) },
        { t: 'item', v: 'تاج' }, { t: 'nothing' },
      ]);
      let msg = '🗝️ فتحت الصندوق...\n\n';
      if (prize.t === 'money') { u.money += prize.v; msg += `💰 لقيت ${money(prize.v)}!`; }
      else if (prize.t === 'item') { u.inv[prize.v] = (u.inv[prize.v] || 0) + 1; msg += `🎁 لقيت ${prize.v}!`; }
      else msg += '😅 لقيت الصندوق فاضي... حظ تاني المرة الجاية.';
      save(); reply(msg);
    } },
];
