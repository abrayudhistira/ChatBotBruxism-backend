const PatientService = require('../services/PatientService');
const QuestionService = require('../services/QuestionService');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

class BotController {
  async handleIncomingMessage(msg, io) {
    // 1. FILTER DASAR
    if (msg.from === 'status@broadcast') return;
    if (msg.from.includes('@g.us')) return;

    // 2. VALIDASI TIPE PESAN (Hanya Text)
    // msg.type bisa: 'chat', 'image', 'video', 'sticker', 'ptt' (voice note)
    if (msg.type !== 'chat') {
        // Opsional: Reply memberitahu user
        return msg.reply("Mohon maaf, sistem hanya menerima pesan berupa teks.");
    }

    const phone = msg.from.replace('@c.us', '');
    const body = msg.body.trim();

    try {
      const patient = await PatientService.findOrInitPatient(phone);

      // --- LOGIC 1: REGISTRASI ---
      if (!patient.isRegistered) {
        if (body.toUpperCase().startsWith('#DAFTAR#')) {
          const parts = body.split('#');
          if (parts.length < 4) return msg.reply("Format salah. Gunakan: #DAFTAR#Nama#YYYY-MM-DD");
          
          const name = parts[2];
          const birthDate = parts[3];
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(birthDate)) return msg.reply("Format tanggal salah. Gunakan YYYY-MM-DD.");

          await PatientService.registerPatient(phone, name, birthDate);
          return msg.reply(`Halo ${name}, pendaftaran berhasil! Tunggu pertanyaan dari kami.`);
        }
        return msg.reply("Anda belum terdaftar. Balas: #DAFTAR#Nama#YYYY-MM-DD");
      }

      // --- LOGIC 2: JAWAB PERTANYAAN (Context Aware) ---
      
      // Cek apakah pasien punya "hutang" jawaban (current_question_id tidak null)
      if (patient.current_question_id) {
          
          // Simpan jawaban dengan ID pertanyaan yang sesuai
          // Kita butuh update saveSymptomLog untuk menerima question_id
          await QuestionService.saveSymptomLog(phone, body, patient.current_question_id);

          // Reset status pasien (hapus current_question_id) agar tidak double input
          await Patients.update(
            { current_question_id: null },
            { where: { phone: phone } }
          );

          // Emit ke Dashboard
          io.emit('NEW_SYMPTOM_DATA', {
            phone: phone,
            name: patient.name,
            answer: body,
            question_id: patient.current_question_id, // Kirim ID pertanyaan ke dashboard juga
            timestamp: new Date()
          });

          return msg.reply("Terima kasih, jawaban Anda untuk pertanyaan tersebut telah tersimpan.");
      } else {
          // Jika user chat tapi TIDAK ADA pertanyaan aktif
          // Opsional: Diam saja, atau beri info
          // return msg.reply("Saat ini belum ada pertanyaan jadwal untuk Anda. Mohon tunggu jadwal berikutnya.");
          console.log(`[IGNORED] Chat from ${phone} ignored (No active question context).`);
          return; 
      }

    } catch (error) {
      console.error("Bot Error:", error);
    }
  }
}

module.exports = new BotController();