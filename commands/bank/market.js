import { db, save } from './db.js';

// سوق حي: كل سهم ليه اتجاه (momentum) بيفضل شوية وقت قبل ما يتغير، مش عشوائي بحت
const SECTORS = {
  'نور': '⚡ طاقة', 'فجر': '🏗️ عقارات', 'أمل': '🏥 صحة', 'نجم': '📱 تكنولوجيا',
  'بريق': '💍 ذهب', 'صقر': '✈️ طيران', 'بحر': '🚢 شحن', 'ورد': '🌾 زراعة',
};
const TICK_MS = 2 * 60000; // كل تحديث = دقيقتين حقيقيين

function ensure() {
  db.settings.market ??= {};
  for (const name of Object.keys(SECTORS)) {
    db.settings.market[name] ??= {
      price: randBase(), history: [], trend: Math.random() < 0.5 ? -1 : 1, momentum: randInt(2, 6), updated: Date.now(),
    };
  }
  return db.settings.market;
}
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randBase() { return randInt(40, 300); }

// يحرك السهم بعدد الدقايق اللي فاتت فعليًا، حتى لو محدش سأل عنه من زمان
function tick(stock) {
  const elapsed = Date.now() - stock.updated;
  let steps = Math.floor(elapsed / TICK_MS);
  if (steps <= 0) return;
  steps = Math.min(steps, 30); // منع قفزات ضخمة لو السيرفر قافل فترة طويلة
  for (let i = 0; i < steps; i++) {
    if (stock.momentum <= 0) { stock.trend = Math.random() < 0.5 ? -1 : 1; stock.momentum = randInt(2, 6); }
    const pct = stock.trend * randInt(1, 8);
    stock.price = Math.max(5, Math.round(stock.price * (1 + pct / 100)));
    stock.momentum--;
    stock.history.push(stock.price);
    if (stock.history.length > 20) stock.history.shift();
  }
  stock.updated = Date.now();
}

export function getMarket() {
  const m = ensure();
  for (const s of Object.values(m)) tick(s);
  save();
  return m;
}
export function getStock(name) { return getMarket()[name]; }
export function stockNames() { return Object.keys(SECTORS); }
export function sectorOf(name) { return SECTORS[name] || ''; }

export function sparkline(history) {
  if (!history.length) return '▪️'.repeat(8);
  const bars = '▁▂▃▄▅▆▇█';
  const min = Math.min(...history), max = Math.max(...history) || 1;
  return history.slice(-12).map(v => bars[Math.min(7, Math.floor(((v - min) / (max - min || 1)) * 7))]).join('');
}
export function pctChange(history) {
  if (history.length < 2) return 0;
  const a = history.at(-2), b = history.at(-1);
  return Math.round(((b - a) / a) * 100);
}
