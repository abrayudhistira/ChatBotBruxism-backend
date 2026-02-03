const sequelize = require('../config/database');
const initModels = require('../models/init-models');

// 1. IMPORT & ALIASING MODEL (Wajib sesuai init-models.js)
const { 
  patients: Patients, 
  symptomlogs: SymptomLogs, 
  questions: Questions 
} = initModels(sequelize);

class PatientService {
  
  /**
   * Mengambil semua data pasien (List utama)
   */
  async getAllPatients() {
    return await Patients.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Cek status pasien saat chat masuk.
   * Jika belum ada, buat record baru (isRegistered: false).
   */
  async findOrInitPatient(phone) {
    let patient = await Patients.findByPk(phone);
    if (!patient) {
      patient = await Patients.create({ phone, isRegistered: false });
    }
    return patient;
  }

  /**
   * Proses pendaftaran resmi via WhatsApp
   */
  async registerPatient(phone, name, birthDate) {
    return await Patients.update(
      { name: name, birth: birthDate, isRegistered: true },
      { where: { phone } }
    );
  }

  /**
   * Hapus pasien
   */
  async deletePatient(phone) {
    return await Patients.destroy({ where: { phone } });
  }

  // --- DASHBOARD & ANALYTICS METHODS ---

  /**
   * Hitung Total Pasien
   */
  async countPatients() {
    return await Patients.count();
  }

  /**
   * Ambil 10 Aktivitas/Jawaban Terbaru
   * Join: Log -> Pasien & Log -> Pertanyaan
   */
  async getRecentLogs() {
    return await SymptomLogs.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Patients,
          as: 'phone_number_patient', // Alias sesuai init-models.js
          attributes: ['name', 'phone']
        },
        {
          model: Questions,
          as: 'question', // Alias sesuai init-models.js
          attributes: ['question_text']
        }
      ]
    });
  }

  /**
   * Ambil Detail Pasien + Histori Jawaban Lengkap
   * Fitur: Nested Join (Pasien -> Log -> Pertanyaan)
   */
  async getPatientWithLogs(phone) {
    return await Patients.findOne({
      where: { phone },
      include: [{
        model: SymptomLogs,
        as: 'symptomlogs',
        required: false, // Tetap ambil data pasien meskipun belum ada log (jawaban)
        // NESTED INCLUDE: Ambil detail pertanyaan dari setiap log
        include: [{
            model: Questions,
            as: 'question', 
            attributes: ['id', 'question_text', 'scheduled_time']
        }]
      }],
      order: [
        // Urutkan symptomlogs berdasarkan waktu terbaru
        [{ model: SymptomLogs, as: 'symptomlogs' }, 'createdAt', 'DESC']
      ]
    });
  }
}

module.exports = new PatientService();