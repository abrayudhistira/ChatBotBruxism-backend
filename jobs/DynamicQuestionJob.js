const cron = require('node-cron');
const QuestionService = require('../services/QuestionService');
const PatientService = require('../services/PatientService');
const telegramService = require('../services/TelegramService');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

const initScheduler = () => {
  console.log("--- Scheduler Service Started (Telegram) ---");

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const timeString = now.toTimeString().substring(0, 5); 

      console.log(`[CRON TICK] Mengecek kuesioner untuk jam: ${timeString}`);

      const questionsToSend = await QuestionService.getActiveQuestionsByTime(timeString);

      if (questionsToSend.length > 0) {
        const allPatients = await PatientService.getAllPatients();
        const activePatients = allPatients.filter(p => p.isRegistered);

        for (const q of questionsToSend) {
          // Update state semua pasien terdaftar
          await Patients.update(
            { current_question_id: q.id },
            { where: { isRegistered: true } }
          );

          // Broadcast ke semua pasien terdaftar
          for (const p of activePatients) {
            try {
              const keyboard = {
                inline_keyboard: [
                  [
                    { text: '1', callback_data: 'ans_1' },
                    { text: '2', callback_data: 'ans_2' },
                    { text: '3', callback_data: 'ans_3' },
                    { text: '4', callback_data: 'ans_4' },
                    { text: '5', callback_data: 'ans_5' }
                  ]
                ]
              };

              await telegramService.sendMessage(p.telegram_id, 
                `📝 <b>Pertanyaan Baru</b>\n\n${q.question_text}\n\nPilih skala 1-5:\n1 = Tidak pernah\n2 = Jarang\n3 = Kadang-kadang\n4 = Sering\n5 = Selalu`,
                { reply_markup: keyboard }
              );
              console.log(`[JOB] Berhasil kirim ke: ${p.telegram_id}`);
            } catch (sendError) {
              console.error(`[JOB FAIL] Gagal ke ${p.telegram_id}:`, sendError.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("[JOB ERROR]", error);
    }
  });
};

module.exports = initScheduler;