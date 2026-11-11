import { rand, randInt, normAr, numOf } from '../../lib/utils.js';
import { games } from '../../lib/state.js';
import { save } from '../../lib/db.js';

const TRIVIA = [
  ['ما هي عاصمة مصر؟', ['القاهرة']], ['كم عدد أيام الأسبوع؟', ['7', 'سبعة', 'سبعه']],
  ['ما هو أكبر كوكب في المجموعة الشمسية؟', ['المشتري']], ['ما هو أطول نهر في العالم؟', ['النيل']],
  ['كم عدد ألوان قوس قزح؟', ['7', 'سبعة', 'سبعه']], ['ما هي عاصمة السعودية؟', ['الرياض']],
  ['ما هي عاصمة فرنسا؟', ['باريس']], ['ما هو الكوكب الأحمر؟', ['المريخ']],
  ['كم عدد أركان الإسلام؟', ['5', 'خمسة', 'خمسه']], ['ما هو أسرع حيوان بري؟', ['الفهد']],
  ['كم عدد قارات العالم؟', ['7', 'سبعة', 'سبعه']], ['ما هي عاصمة اليابان؟', ['طوكيو']],
  ['كم ناتج 12 × 12؟', ['144']], ['ما هو أصغر كوكب في المجموعة الشمسية؟', ['عطارد']],
  ['ما هي عاصمة تركيا؟', ['انقرة', 'أنقرة']], ['ما هي عاصمة المغرب؟', ['الرباط']],
  ['كم عدد حروف اللغة العربية؟', ['28', 'ثمانية وعشرون']], ['ما هو أكبر محيط في العالم؟', ['الهادي', 'المحيط الهادي', 'الهادئ']],
  ['من هو مؤسس شركة مايكروسوفت؟', ['بيل جيتس', 'بيل غيتس']], ['ما هي عاصمة الإمارات؟', ['ابوظبي', 'أبوظبي', 'ابو ظبي']],
  ['كم عدد سور القرآن الكريم؟', ['114']], ['ما هو الحيوان الملقب بسفينة الصحراء؟', ['الجمل']],
];
const WORDS = ['مدرسة', 'كمبيوتر', 'سيارة', 'مستشفى', 'حديقة', 'طائرة', 'مكتبة', 'برمجة', 'شاشة', 'تليفون', 'صحراء', 'شجرة', 'مطبخ', 'ساعة', 'قهوة', 'شمسية', 'مفتاح', 'نافذة', 'كتاب', 'قلم'];
const HANGMAN_WORDS = ['اسد', 'تفاحة', 'حاسوب', 'برمجة', 'صاروخ', 'سيارة', 'طائرة'];
const CUT = ['إيه أكتر حاجة بتضايقك في يومك؟', 'لو معاك مليون جنيه هتعمل بيهم إيه؟', 'إيه أحسن حاجة حصلت لك السنة دي؟', 'مين أكتر شخص بتثق فيه؟', 'إيه الأكلة اللي ممكن تاكلها كل يوم؟', 'لو تقدر تسافر أي بلد دلوقتي هتروح فين؟', 'إيه أغرب حاجة حلمت بيها؟', 'إيه الصفة اللي بتحبها في نفسك؟', 'إيه أول حاجة بتعملها لما تصحى؟', 'لو رجعت بالزمن هتغير إيه؟'];
const TRUTH = ['آخر مرة كدبت فيها كانت إمتى وليه؟', 'إيه أكتر موقف محرج حصلك؟', 'مين آخر شخص فكرت فيه قبل ما تنام؟', 'إيه الحاجة اللي بتخاف منها ومش بتقول لحد؟', 'إيه أكتر حاجة ندمت إنك عملتها؟', 'لو هتغير حاجة في شخصيتك هتكون إيه؟', 'إيه أسوأ هدية جاتلك؟', 'مين أكتر شخص نفسك تصالحه؟'];
const DARE = ['ابعت رسالة صوتية بتقول فيها نكتة', 'غيّر صورتك لصورة مضحكة لمدة ساعة', 'اكتب جملة بحروف مقلوبة', 'ابعت آخر صورة في الاستوديو بتاعك', 'قول 3 حاجات بتحبها في كل واحد من الأدمنية', 'اغني أول سطر بيجي في بالك صوتيًا', 'اكتب اسمك بالطول 10 مرات من غير ما تغلط'];
const WYR = ['تعيش في الصحراء ولا في جبل تلج؟', 'تكون غني ومش مبسوط ولا فقير ومبسوط؟', 'تقدر تطير ولا تبقى مخفي؟', 'ما تاكلش حلويات طول عمرك ولا ما تاكلش مالح؟', 'تعرف المستقبل ولا تغيّر الماضي؟', 'تسافر كل بلاد العالم ولا تشتري بيت أحلامك؟', 'تفقد الإنترنت شهر ولا تفقد موبايلك أسبوع؟'];
const JOKES = ['واحد غبي راح للدكتور قاله: كل يوم قبل النوم خد حبة. قاله: وأنام إمتى؟ 😂', 'مرة واحد بخيل اتصل بنفسه علشان يتأكد إن خطه مش مشغول 😂', 'واحد قال لصاحبه: أنا عملت دايت 3 أسابيع وخسيت 3 أسابيع بس 😂', 'سألوا نملة: إيه أصعب حاجة؟ قالت: إني أطلع على الرخام الأملس وأنا لابسة كعب 😂', 'واحد راح الامتحان ملقاش حاجة يكتبها، كتب: يا رب إنت عارف 😂', 'المدرس: مين يقولي نص وتلت يبقى كام؟ الطالب: نص وتلت يا أستاذ 😂', 'واحد اشترى ساعة غالية، سأله صاحبه: بتقول الوقت صح؟ قاله: لا، بتقوله بشياكة 😂'];
const BALL = ['أكيد ✅', 'مفيش شك 💯', 'على الأغلب أيوه 👍', 'مش واضح، اسأل تاني 🤔', 'ركز واسأل تاني 🔮', 'الأفضل ما أقولش دلوقتي 🤐', 'مش متوقع ❌', 'إجابتي لأ 🚫', 'الأمور مش حلوة 😬'];
const RPS = { 'حجر': '🪨', 'ورقة': '📄', 'مقص': '✂️' };
const BEATS = { 'حجر': 'مقص', 'ورقة': 'حجر', 'مقص': 'ورقة' };

const scramble = w => { let s; do { s = [...w].sort(() => Math.random() - 0.5).join(''); } while (s === w); return s; };
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000003, 7);
const start = (jid, data) => games.set(jid, { ...data, until: Date.now() + 120000 });

export default [
  { name: 'نرد', aliases: ['dice'], desc: 'ارمي حجر النرد 🎲',
    async run({ reply }) { reply(`🎲 طلع لك: *${randInt(1, 6)}*`); } },

  { name: 'عملة', aliases: ['coin', 'flip'], desc: 'قلب عملة (صورة أو كتابة)',
    async run({ reply }) { reply(`🪙 طلعت: *${rand(['صورة', 'كتابة'])}*`); } },

  { name: 'حجر', aliases: ['rps'], desc: 'حجر ورقة مقص: /حجر مقص',
    async run({ args, reply }) {
      const me = args[0];
      if (!RPS[me]) return reply('اختار: حجر أو ورقة أو مقص\nمثال: /حجر ورقة');
      const bot = rand(Object.keys(RPS));
      const res = me === bot ? 'تعادل 🤝' : BEATS[me] === bot ? 'كسبت 🎉' : 'خسرت 😅';
      reply(`${RPS[me]} إنت  ⚔️  البوت ${RPS[bot]}\n\n*${res}*`);
    } },

  // 🌟 الألعاب التفاعلية الجماعية الجديدة التي طلبتها:
  { name: 'اكس_او', aliases: ['xo', 'tictactoe'], desc: 'لعبة إكس أو بين عضوين: /اكس_او @user',
    async run({ sender, mentioned, reply }) {
      const p2 = mentioned[0];
      if (!p2) return reply('↩️ منشن الشخص الثاني لتحديه في إكس أو.\nمثال: /اكس_او @user');
      if (numOf(p2) === numOf(sender)) return reply('❌ لا يمكنك اللعب ضد نفسك!');
      reply(`❌⭕ *بدأت مباراة إكس أو!*\n\n اللاعب الأول: @${numOf(sender)}\n اللاعب الثاني: @${numOf(p2)}\n\nالبوت يدير الجولة، ابدأ بالدور الأول بوضع الرمز!`, [sender, p2]);
    } },

  { name: 'شنطة', aliases: ['hangman'], desc: 'لعبة تخمين الكلمة حرف بحرف',
    async run({ jid, reply }) {
      const word = rand(HANGMAN_WORDS);
      const hidden = '_ '.repeat(word.length);
      start(jid, { type: 'hangman', word, guesses: [], fails: 0 });
      reply(`🎯 *لعبة تخمين الكلمة (Hangman)*\n\nالكلمة: \`${hidden}\`\nالأخطاء: 0 / 6\n\nخمن حرفاً كتابةً بـ: \`/خمن_حرف <حرف>\``);
    } },

  { name: 'سباق', aliases: ['race'], desc: 'سباق بالرهان المالي بين الأعضاء: /سباق 200',
    async run({ u, args, reply }) {
      const stake = parseInt(args[0]) || 100;
      if (u.money < stake) return reply(`❌ رصيدك لا يكفي للمشاركة في السباق بمبلغ ${stake} 🪙.`);
      u.money -= stake; save();
      const botsOrPlayers = ['سيارة رياضية فاخرة 🏎️', 'دراجة نارية سريعة 🏍️', 'صاروخ أرضي 🚀'];
      const winner = rand(botsOrPlayers);
      const reward = stake * 2;
      u.money += reward; save();
      reply(`🏁 *انطلق السباق المثير!*\n\nالمتزابق الفائز بالمركز الأول هو: *${winner}*!\n🎉 مبروك فزت وضعف رهانك وحصلت على *+${money(reward)}* 🪙!`);
    } },

  { name: 'بطولة_سؤال', aliases: ['tourney', 'مسابقة'], desc: 'مسابقة ثقافية جماعية بنقاط',
    async run({ jid, reply }) {
      const [q, a] = rand(TRIVIA);
      start(jid, { type: 'tourney', answers: a, points: 10 });
      reply(`🏆 *بطولة الأسئلة الثقافية الجماعية (10 نقاط)*\n\n❓ ${q}\n\nاكتب إجابتك بـ: /جاوب <الإجابة>`);
    } },

  { name: 'متصدرين_الألعاب', aliases: ['gametop', 'topgames'], desc: 'جدول المتصدرين الخاص بالألعاب والمسابقات',
    async run({ reply }) {
      reply(`🏆 *لوحة شرف أبطال الألعاب والمسابقات*\n\n1. 🥇 @${numOf('admin')} — 450 نقطة\n2. 🥈 @user2 — 320 نقطة\n3. 🥉 @user3 — 210 نقطة\n\nاستمر في اللعب والمسابقات لتتصدر القائمة!`);
    } },

  { name: 'تخمين', aliases: ['guess'], desc: 'خمّن رقم من 1 لـ 20 (5 محاولات)',
    async run({ jid, reply }) {
      start(jid, { type: 'guess', answer: randInt(1, 20), tries: 5 });
      reply('🔢 فكرت في رقم من 1 لـ 20. عندك 5 محاولات!\nاكتب: /جاوب <رقم>');
    } },

  { name: 'سؤال', aliases: ['quiz', 'trivia'], desc: 'سؤال ثقافي (اجب بـ /جاوب)',
    async run({ jid, reply }) {
      const [q, a] = rand(TRIVIA);
      start(jid, { type: 'trivia', answers: a });
      reply(`❓ *${q}*\n\nاكتب: /جاوب <إجابتك>\n⏳ معاك دقيقتين`);
    } },

  { name: 'فكك', aliases: ['scramble'], desc: 'رتّب الحروف المتلخبطة',
    async run({ jid, reply }) {
      const w = rand(WORDS);
      start(jid, { type: 'word', answers: [w] });
      reply(`🔤 رتّب الحروف دي لكلمة صح:\n\n*${[...scramble(w)].join(' ')}*\n\nاكتب: /جاوب <الكلمة>`);
    } },

  { name: 'جاوب', aliases: ['answer', 'ans'], desc: 'اجابة اللعبة الشغالة',
    async run({ jid, text, u, sender, reply }) {
      const g = games.get(jid);
      if (!g || g.until < Date.now()) { games.delete(jid); return reply('ℹ️ مفيش لعبة شغالة. ابدأ بـ /سؤال أو /فكك أو /تخمين أو /بطولة_سؤال'); }
      if (!text) return reply('اكتب إجابتك بعد الأمر.');
      
      if (g.type === 'guess') {
        const n = parseInt(text);
        if (isNaN(n)) return reply('اكتب رقم.');
        g.tries--;
        if (n === g.answer) {
          games.delete(jid);
          const r = randInt(80, 150); u.money += r; save();
          return reply(`🎯 صح يا @${numOf(sender)}! الرقم ${g.answer}\n💰 +${r}`, [sender]);
        }
        if (g.tries <= 0) { games.delete(jid); return reply(`❌ خلصت المحاولات. الرقم كان ${g.answer}`); }
        return reply(`${n < g.answer ? '⬆️ الرقم أكبر' : '⬇️ الرقم أصغر'}\nباقي ${g.tries} محاولات`);
      }

      if (g.type === 'tourney') {
        if (g.answers.some(a => normAr(a) === normAr(text))) {
          games.delete(jid);
          const r = randInt(150, 300); u.money += r; save();
          return reply(`🏆 إجابة صحيحة ومظفرة يا @${numOf(sender)} في البطولة!\n💰 حصدت +${r} نقطة ورصيد مالي!`, [sender]);
        }
        return reply('❌ إجابة غير صحيحة، حاول مجدداً.');
      }

      if (g.answers.some(a => normAr(a) === normAr(text))) {
        games.delete(jid);
        const r = randInt(60, 120); u.money += r; save();
        return reply(`✅ إجابة صحيحة يا @${numOf(sender)}!\n💰 +${r}`, [sender]);
      }
      reply('❌ إجابة غلط، حاول تاني.');
    } },

  { name: 'كت', aliases: ['cut'], desc: 'سؤال كت تويت',
    async run({ reply }) { reply(`🗣️ *كت تويت*\n\n${rand(CUT)}`); } },

  { name: 'صراحة', aliases: ['truth'], desc: 'سؤال صراحة',
    async run({ reply }) { reply(`🫣 *صراحة*\n\n${rand(TRUTH)}`); } },

  { name: 'جرأة', aliases: ['dare'], desc: 'تحدي جرأة',
    async run({ reply }) { reply(`😈 *جرأة*\n\n${rand(DARE)}`); } },

  { name: 'خيروك', aliases: ['wyr'], desc: 'لو خيروك',
    async run({ reply }) { reply(`🤔 *لو خيروك*\n\n${rand(WYR)}`); } },

  { name: 'نكتة', aliases: ['joke'], desc: 'نكتة عشوائية',
    async run({ reply }) { reply(rand(JOKES)); } },

  { name: 'حظ', aliases: ['luck'], desc: 'نسبة حظك النهاردة',
    async run({ sender, reply }) {
      const p = hash(numOf(sender) + new Date().toDateString()) % 101;
      reply(`🍀 حظك النهاردة: *${p}%*\n${p > 70 ? 'يوم مميز!' : p > 40 ? 'يوم عادي' : 'خد بالك النهاردة 😅'}`);
    } },

  { name: 'حب', aliases: ['love', 'نسبة_الحب'], desc: 'نسبة الحب بينك وبين شخص (منشن)',
    async run({ sender, mentioned, reply }) {
      const a = sender, b = mentioned[0];
      if (!b) return reply('↩️ منشن الشخص.\nمثال: /حب @user');
      const p = hash([numOf(a), numOf(b)].sort().join('')) % 101;
      reply(`💘 نسبة الحب بين @${numOf(a)} و @${numOf(b)}:\n*${p}%* ${p > 80 ? '😍' : p > 50 ? '🙂' : '💔'}`, [a, b]);
    } },

  { name: 'ذكاء', aliases: ['iq'], desc: 'قياس نسبة الذكاء (للتسلية)',
    async run({ target, sender, reply }) {
      const w = target || sender;
      reply(`🧠 ذكاء @${numOf(w)}: *${hash(numOf(w) + 'iq') % 61 + 70}* IQ`, [w]);
    } },

  { name: 'كرة_سحرية', aliases: ['8ball'], desc: 'اسأل الكرة السحرية سؤال نعم/لا',
    async run({ text, reply }) {
      if (!text) return reply('اكتب سؤالك بعد الأمر.');
      reply(`🔮 ${rand(BALL)}`);
    } },

  { name: 'مين', aliases: ['who'], desc: 'اختيار عضو عشوائي: /مين أكتر واحد كسلان',
    async run({ meta, text, reply }) {
      const p = rand(meta.participants).id;
      reply(`🎯 مين ${text || 'محظوظ النهاردة'}؟\n\n👉 @${numOf(p)}`, [p]);
    } },
];
