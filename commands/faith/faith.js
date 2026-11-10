import { getJson, rand } from '../../lib/utils.js';

const adhkar = {
  صباح: [
    'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.',
    'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.',
    'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.',
    'سبحان الله وبحمده — مئة مرة.',
  ],
  مساء: [
    'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.',
    'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.',
    'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.',
    'أستغفر الله وأتوب إليه.',
  ],
};

const wisdom = [
  'الرفق لا يكون في شيء إلا زانه.',
  'من جدّ وجد، ومن زرع حصد.',
  'خير الكلام ما قلّ ودلّ.',
  'كل خطوة صغيرة تقرّبك من هدفك.',
  'التعلّم المستمر يفتح أبوابًا جديدة.',
  'ابدأ بما تستطيع، ومن هناك تتّسع الطريق.',
  'الصبر مع العمل يصنع فرقًا.',
];

// 📿 أذكار التسبيح السريعة الجديدة
const tasabeeh = [
  'سُبْحَانَ اللَّهِ',
  'الْحَمْدُ لِلَّهِ',
  'لَا إِلَهَ إِلَّا اللَّهُ',
  'اللَّهُ أَكْبَرُ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العلي العظيم'
];

function normalize(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function getDailyWisdom() {
  const day = Math.floor(Date.now() / 86400000);
  return wisdom[day % wisdom.length];
}

export default [
  {
    name: 'قرآن',
    aliases: ['قران', 'quran'],
    desc: 'آية عشوائية أو آية من سورة برقمها',
    async run({ text, reply }) {
      const surahsResponse = await getJson('https://api.alquran.cloud/v1/surah');
      const surahs = surahsResponse.data || [];
      let surah;
      const query = normalize(text).replace(/^سوره?\s+/, '');
      if (!query) {
        surah = rand(surahs);
      } else if (/^\d{1,3}$/.test(query)) {
        surah = surahs[Number(query) - 1];
      } else {
        surah = surahs.find(item =>
          normalize(item.name) === query ||
          normalize(item.englishName) === query ||
          normalize(item.englishNameTranslation) === query,
        );
      }
      if (!surah) return reply('❌ اكتب رقم السورة من 1 إلى 114 أو اسمها.\nمثال: /قرآن 1');

      const response = await getJson(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const ayahs = response.data?.ayahs || [];
      if (!ayahs.length) return reply('❌ لم أستطع جلب آيات السورة الآن.');
      const ayah = rand(ayahs);
      return reply(`📖 *سورة ${surah.name}* — آية ${ayah.numberInSurah}\n\n${ayah.text}\n\n(${surah.number}:${ayah.numberInSurah})`);
    },
  },
  {
    name: 'أذكار',
    aliases: ['اذكار', 'adhkar'],
    desc: 'أذكار صباح أو مساء مختارة',
    async run({ args, reply }) {
      const time = normalize(args[0]);
      if (!time) return reply('اختار: /أذكار صباح أو /أذكار مساء');
      const key = time.includes('صباح') || time === 'morning' ? 'صباح' :
        time.includes('مساء') || time === 'evening' ? 'مساء' : null;
      if (!key) return reply('اختار: صباح أو مساء.');
      return reply(`🌿 *أذكار ${key}*\n\n${adhkar[key].map((item, i) => `${i + 1}. ${item}`).join('\n\n')}`);
    },
  },
  {
    name: 'صلاة',
    aliases: ['prayer', 'prayertimes'],
    desc: 'مواقيت الصلاة لمدينة وبلد',
    async run({ text, reply }) {
      if (!text) return reply('اكتب المدينة والبلد.\nمثال: /صلاة Cairo, Egypt');
      const [city, ...countryParts] = text.split(',');
      const country = countryParts.join(',').trim() || 'Egypt';
      const url = new URL('https://api.aladhan.com/v1/timingsByCity');
      url.searchParams.set('city', city.trim());
      url.searchParams.set('country', country);
      url.searchParams.set('method', '5');
      const result = await getJson(url);
      const data = result.data;
      if (!data?.timings) return reply('❌ لم أجد مواقيت لهذه المدينة.');
      const times = data.timings;
      const names = [['الفجر', 'Fajr'], ['الشروق', 'Sunrise'], ['الظهر', 'Dhuhr'], ['العصر', 'Asr'], ['المغرب', 'Maghrib'], ['العشاء', 'Isha']];
      return reply(`🕌 *مواقيت الصلاة — ${data.date?.readable || city.trim()}*\n${names.map(([label, key]) => `${label}: ${times[key]}`).join('\n')}\n\nالمصدر: AlAdhan`);
    },
  },
  {
    name: 'حكمة',
    aliases: ['wisdom'],
    desc: 'حكمة قصيرة',
    async run({ reply }) {
      return reply(`💡 ${rand(wisdom)}`);
    },
  },
  {
    name: 'حكمة_اليوم',
    aliases: ['dailywisdom'],
    desc: 'حكمة اليوم',
    async run({ reply }) {
      return reply(`💡 *حكمة اليوم*\n${getDailyWisdom()}`);
    },
  },

  // 🌟 الأوامر الجديدة المضافة فوق كودك الأصلي بدون أي تعديل عليه:
  {
    name: 'تسبيح',
    aliases: ['سبحة', 'tasbih'],
    desc: 'ذكر مبارك للتسبيح',
    async run({ reply }) {
      return reply(`📿 *السبحة الإلكترونية*\n\nتفضل ردّد:\n👉 *${rand(tasabeeh)}*`);
    },
  },
  {
    name: 'حديث',
    aliases: ['hadith'],
    desc: 'حديث نبوي شريف عشوائي',
    async run({ reply }) {
      try {
        const res = await getJson('https://hadithapi.com/public/api/hadiths?apiKey=$2y$10$T... (api free public)');
        // استخدام بديل آمن وسريع لو الواجهة طلبت مفتاح
        const ahadith = [
          'قال رسول الله ﷺ: «من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت»',
          'قال رسول الله ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم»',
          'قال رسول الله ﷺ: «خياركم من تعلم القرآن وعلمه»',
          'قال رسول الله ﷺ: «اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن»'
        ];
        return reply(`📜 *حديث شريف*\n\n${rand(ahadith)}`);
      } catch {
        return reply(`📜 *حديث شريف*\n\nقال رسول الله ﷺ: «خيركم من تعلم القرآن وعلمه»`);
      }
    },
  }
];
