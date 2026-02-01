const sequelize = require('../config/database');
const initModels = require('../models/init-models');

// PERBAIKAN DI SINI:
// Pastikan 'symptomlogs' diambil dari initModels dan di-alias menjadi 'SymptomLogs' (Huruf Besar)
const { patients: Patients, symptomlogs: SymptomLogs } = initModels(sequelize);

class PatientService {
  // --- EXISTING METHODS ---
  
  async getAllPatients() {
    return await Patients.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async findOrInitPatient(phone) {
    let patient = await Patients.findByPk(phone);
    if (!patient) {
      patient = await Patients.create({ phone, isRegistered: false });
    }
    return patient;
  }

  async registerPatient(phone, name, birthDate) {
    return await Patients.update(
      { name: name, birth: birthDate, isRegistered: true },
      { where: { phone } }
    );
  }

  async deletePatient(phone) {
    return await Patients.destroy({ where: { phone } });
  }

  // --- NEW DASHBOARD METHODS ---

  async countPatients() {
    return await Patients.count();
  }

  async getRecentLogs() {
    // Membutuhkan SymptomLogs yang sudah didefinisikan di atas
    return await SymptomLogs.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Patients,
        as: 'phone_number_patient',
        attributes: ['name', 'phone']
      }]
    });
  }

  async getPatientWithLogs(phone) {
    // ERROR SEBELUMNYA TERJADI DI SINI
    // Karena variabel 'SymptomLogs' belum didefinisikan di import atas
    return await Patients.findOne({
      where: { phone },
      include: [{
        model: SymptomLogs, 
        as: 'symptomlogs',
        required: false // Tetap tampilkan pasien meski belum ada log
      }],
      order: [
        [{ model: SymptomLogs, as: 'symptomlogs' }, 'createdAt', 'DESC']
      ]
    });
  }
}

module.exports = new PatientService();