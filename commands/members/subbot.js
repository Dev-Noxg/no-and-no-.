import pino from 'pino';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';
import { db, save } from '../../lib/db.js';
import { numOf } from '../../lib/utils.js';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '../../lib/baileys.js';

const activeSubBots = new Map();

export default [
  {
    name: 'تنصيب',
    aliases: ['pair', 'subbot', 'ربط'],
    desc: 'ربط رقمك لتشغيل بوت فرعي (أو التحكم في الميزة للمطورين)',
    async run({ sock, sender, args, reply }) {
      const senderNum = numOf(sender);
      const isOwner = config.owners.includes(senderNum);
      const action = (args[0] || '').toLowerCase();

      // تحكم المطور في فتح وإغلاق الميزة
      if (isOwner && ['فتح', 'قفل', 'enable', 'disable', 'open', 'close'].includes(action)) {
        const enable = ['فتح', 'enable', 'open'].includes(action);
        db.settings.subbotEnabled = enable;
        save();
        return reply(`⚙️ تم ${enable ? 'تفعيل 🟢' : 'إيقاف 🔴'} ميزة التنصيب والربط العام للأعضاء.`);
      }

      // التحقق من حالة الميزة للأعضاء
      const isSubbotEnabled = db.settings.subbotEnabled ?? true;
      if (!isSubbotEnabled && !isOwner) {
        return reply('⛔ ميزة التنصيب الفرعي مغلقة حالياً من قبل المطور.');
      }

      let targetNumber = args[0] ? args[0].replace(/\D/g, '') : '';

      if (!targetNumber || targetNumber.length < 10) {
        return reply('⚠️ يرجى كتابة رقم هاتفك مع كود الدولة بعد الأمر بدقة.\n\n*مثال:*\n`/تنصيب 201012345678`');
      }

      if (activeSubBots.has(targetNumber)) {
        return reply('⚠️ هناك عملية ربط جارية بالفعل لهذا الرقم، يرجى الانتظار قليلاً.');
      }

      await reply(`⏳ جاري إنشاء جلسة التنصيب للرقم: +${targetNumber}\nبرجاء الانتظار قليلاً لاستخراج كود ربط جديد...`);

      try {
        const sessionPath = path.join(process.cwd(), `sessions/sub_${targetNumber}`);
        
        // تنظيف الجلسة القديمة تماماً لضمان عدم وجود ملفات تالفة تسبب "تعذر الربط"
        if (fs.existsSync(sessionPath)) {
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          } catch (e) {}
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const subSock = makeWASocket({
          version,
          auth: state,
          logger: pino({ level: 'silent' }),
          printQRInTerminal: false,
          browser: ['Chrome (Linux)', '', ''], // تعديل متصفح الربط ليكون متوافقاً تماماً مع كود الهاتف
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
          keepAliveIntervalMs: 10000,
        });

        activeSubBots.set(targetNumber, subSock);
        subSock.ev.on('creds.update', saveCreds);

        let pairingRequested = false;

        subSock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect } = update;

          if (!subSock.authState.creds.registered && !pairingRequested) {
            pairingRequested = true;
            try {
              // زيادة المهلة إلى 4 ثوانٍ لضمان استقرار قناة الاتصال برمتها
              await new Promise(resolve => setTimeout(resolve, 4000));
              const code = await subSock.requestPairingCode(targetNumber);
              
              console.log(`\n==============================`);
              console.log(`[SUBBOT PAIRING CODE]: ${code}`);
              console.log(`[PHONE NUMBER]: +${targetNumber}`);
              console.log(`==============================\n`);

              await sock.sendMessage(sender, {
                text: `🔑 *كود ربط البوت الفرعي الخاص بك:*\n\`\`\`{code}\`\`\`\n\n📌 *خطوات الربط (سريعة):*\n1. افتح واتساب من الهاتف المراد ربطه (+${targetNumber}).\n2. الإعدادات > الأجهزة المرتبطة > ربط جهاز.\n3. اختر "ربط برقم الهاتف" وادخل الكود.`
              }).catch(() => {});

              // إرسال الكود كرسالة نصية عادية للشات لتجنب أي أخطاء في التنسيق
              await sock.sendMessage(sender, { text: `الكود الخاص بك هو: ${code}` });

            } catch (error) {
              console.error('Pairing code error:', error);
              reply(`❌ تعذر طلب كود الربط: ${error.message || 'Connection Closed'}`);
              activeSubBots.delete(targetNumber);
            }
          }

          if (connection === 'open') {
            await sock.sendMessage(sender, { text: `✅ *تم ربط الرقم +${targetNumber} بنجاح تام كبوت فرعي!*` });
            activeSubBots.delete(targetNumber);
          } else if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
              try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
            }
            activeSubBots.delete(targetNumber);
          }
        });

      } catch (err) {
        activeSubBots.delete(targetNumber);
        reply(`❌ حدث خطأ أثناء إعداد الجلسة: ${err.message}`);
      }
    }
  }
];