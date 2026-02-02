const PatientService = require('../services/PatientService');
const QuestionService = require('../services/QuestionService');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

class BotController {
  
  // --- HELPER VALIDASI TANGGAL ---
  isValidDate(dateString) {
    // 1. Cek Format Dasar (YYYY-MM-DD)
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regex)) return { valid: false, msg: "Format tanggal salah. Gunakan YYYY-MM-DD (contoh: 1990-12-31)." };

    // 2. Cek Validitas Kalender (Anti 0000-00-00 atau 2023-02-30)
    const date = new Date(dateString);
    const timestamp = date.getTime();
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return { valid: false, msg: "Tanggal tidak valid dalam kalender." };
    }

    // 3. Cek Range Tahun (Logika Umur Manusia)
    const year = date.getFullYear();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Batasan: Minimal Tahun 1930 (umur ~96 thn) & Maksimal Hari Ini
    if (year < 1930) {
      return { valid: false, msg: "Tahun lahir tidak valid (terlalu lampau). Minimal tahun 1930." };
    }
    
    if (date > now) {
      return { valid: false, msg: "Tanggal lahir tidak boleh di masa depan." };
    }

    return { valid: true };
  }
  // -------------------------------

  async handleIncomingMessage(msg, io) {
    // 1. FILTER DASAR
    if (msg.from === 'status@broadcast') return;
    if (msg.from.includes('@g.us')) return;

    // 2. VALIDASI TIPE PESAN (Hanya Text)
    if (msg.type !== 'chat') {
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
          // Expect: ["", "DAFTAR", "Nama", "1990-01-01"]
          if (parts.length < 4) return msg.reply("Format salah. Gunakan: #DAFTAR#Nama#YYYY-MM-DD");
          
          const name = parts[2];
          const birthDate = parts[3];

          // --- VALIDASI TANGGAL KETAT ---
          const dateCheck = this.isValidDate(birthDate);
          if (!dateCheck.valid) {
            return msg.reply(`Gagal: ${dateCheck.msg}`);
          }
          // ------------------------------

          await PatientService.registerPatient(phone, name, birthDate);
          return msg.reply(`Halo ${name}, pendaftaran berhasil! Tanggal lahir ${birthDate} tersimpan. Tunggu pertanyaan dari kami.`);
        }
        return msg.reply("Anda belum terdaftar. Balas: #DAFTAR#Nama#YYYY-MM-DD\nContoh: #DAFTAR#Budi#1990-05-20");
      }

      // --- LOGIC 2: JAWAB PERTANYAAN (Context Aware) ---
      if (patient.current_question_id) {
          
          await QuestionService.saveSymptomLog(phone, body, patient.current_question_id);

          await Patients.update(
            { current_question_id: null },
            { where: { phone: phone } }
          );

          io.emit('NEW_SYMPTOM_DATA', {
            phone: phone,
            name: patient.name,
            answer: body,
            question_id: patient.current_question_id,
            timestamp: new Date()
          });

          return msg.reply("Terima kasih, jawaban Anda telah tersimpan.");
      } else {
          // User chat tapi tidak ada pertanyaan aktif
          console.log(`[IGNORED] Chat from ${phone} ignored (No active question context).`);
          return; 
      }

    } catch (error) {
      console.error("Bot Error:", error);
      // Opsional: msg.reply("Terjadi kesalahan sistem.")
    }
  }
}

module.exports = new BotController();