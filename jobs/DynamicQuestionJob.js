// 
const cron = require('node-cron');
const QuestionService = require('../services/QuestionService');
const PatientService = require('../services/PatientService');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

const initScheduler = (sock) => {
  console.log("--- Scheduler Service Started (Baileys) ---");

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const timeString = now.toTimeString().substring(0, 5); 

      const questionsToSend = await QuestionService.getActiveQuestionsByTime(timeString);

      if (questionsToSend.length > 0) {
        const allPatients = await PatientService.getAllPatients();
        const activePatients = allPatients.filter(p => p.isRegistered);

        for (const q of questionsToSend) {
          
          // Update State Pasien
          await Patients.update(
            { current_question_id: q.id },
            { where: { isRegistered: true } }
          );

          // Broadcast Pesan
          for (const p of activePatients) {
              try {
                  let jid = '';

                  // Cek apakah data pasien ini menggunakan format LID bawaan update baru
                  if (p.phone.includes('_lid')) {
                      const cleanLid = p.phone.replace('_lid', '');
                      jid = `${cleanLid}@lid`;
                  } else {
                      // Format nomor HP regular standar internasional
                      const cleanPhone = p.phone.replace(/\D/g, ''); 
                      const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                      jid = `${formattedPhone}@s.whatsapp.net`;
                  }

                  // Validasi keaktifan socket Baileys
                  if (sock && sock.user) {
                      // await sock.sendMessage(jid, { 
                      //     text: `Pertanyaan: ${q.question_text}\n\nSilakan balas angka 1-5.` 
                      // });
                      await QuestionService.sendQuestionWithButtons(sock, jid, q);
                      console.log(`[JOB] Berhasil kirim ke: ${jid}`);
                  } else {
                      console.log(`[JOB] Socket tidak siap, skipping ${jid}`);
                  }
              } catch (sendError) {
                  console.error(`[JOB FAIL] Gagal ke ${p.phone}:`, sendError.message);
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