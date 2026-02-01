const cron = require('node-cron');
const QuestionService = require('../services/QuestionService');
const PatientService = require('../services/PatientService');
// Import Model langsung untuk update massal
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

const initScheduler = (whatsappClient) => {
  console.log("--- Scheduler Service Started ---");

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const timeString = now.toTimeString().substring(0, 5); // "HH:mm"

      // 1. Ambil pertanyaan jadwal sekarang
      const questionsToSend = await QuestionService.getActiveQuestionsByTime(timeString);

      if (questionsToSend.length > 0) {
        // Ambil pasien aktif
        const allPatients = await PatientService.getAllPatients();
        const activePatients = allPatients.filter(p => p.isRegistered);

        for (const q of questionsToSend) {
          
          // --- LOGIC BARU: Update State Pasien ---
          // Tandai bahwa semua pasien aktif sekarang sedang 'berhutang' jawaban untuk pertanyaan ini
          await Patients.update(
            { current_question_id: q.id },
            { where: { isRegistered: true } }
          );
          // ---------------------------------------

          // Broadcast Pesan
          for (const p of activePatients) {
            // Cek validasi nomor sebelum kirim
            if(p.phone && p.phone.length > 5) {
                // Tambahkan @c.us jika belum ada (format WA library)
                const chatId = p.phone.includes('@c.us') ? p.phone : `${p.phone}@c.us`;
                
                whatsappClient.sendMessage(chatId, q.question_text)
                    .catch(err => console.error(`Failed to send to ${p.phone}:`, err));
                
                console.log(`[JOB] Sent Q-ID:${q.id} to ${p.phone}`);
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