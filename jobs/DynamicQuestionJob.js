const cron = require('node-cron');
const QuestionService = require('../services/QuestionService');
const PatientService = require('../services/PatientService');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

const initScheduler = (whatsappClient) => {
  console.log("--- Scheduler Service Started ---");

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Ambil waktu HH:mm
      const timeString = now.toTimeString().substring(0, 5); 

      // 1. Ambil pertanyaan jadwal sekarang
      const questionsToSend = await QuestionService.getActiveQuestionsByTime(timeString);

      if (questionsToSend.length > 0) {
        // Ambil pasien aktif
        const allPatients = await PatientService.getAllPatients();
        const activePatients = allPatients.filter(p => p.isRegistered);

        for (const q of questionsToSend) {
          
          // Update State Pasien (Tandai punya hutang jawaban)
          await Patients.update(
            { current_question_id: q.id },
            { where: { isRegistered: true } }
          );

          // Broadcast Pesan
          for (const p of activePatients) {
            try {
                // 1. Bersihkan nomor dari simbol @c.us atau @lid lama (jika ada)
                let rawPhone = p.phone.replace(/@c\.us|@lid/g, '');

                // 2. Formatting: Pastikan format 62 (International)
                // Jika user simpan '08...', ganti jadi '628...'
                if (rawPhone.startsWith('0')) {
                    rawPhone = '62' + rawPhone.slice(1);
                }

                // 3. VALIDASI WA: Cek apakah nomor ini punya akun WA valid?
                // Fungsi ini akan mengembalikan object ID yang benar (serialized)
                const contactId = await whatsappClient.getNumberId(rawPhone);

                if (contactId) {
                    // Jika valid, kirim ke _serialized ID (format pasti benar: 628xx@c.us)
                    await whatsappClient.sendMessage(contactId._serialized, q.question_text);
                    console.log(`[JOB] Sent Q-ID:${q.id} to ${contactId._serialized}`);
                } else {
                    console.log(`[JOB SKIP] Nomor ${rawPhone} tidak terdaftar di WhatsApp.`);
                }

            } catch (sendError) {
                // Tangkap error per user agar loop tidak putus untuk user lain
                console.error(`[JOB FAIL] Failed to send to ${p.phone}:`, sendError.message);
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