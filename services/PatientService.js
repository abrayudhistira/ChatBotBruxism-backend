const sequelize = require('../config/database');
const initModels = require('../models/init-models');

const { 
  patients: Patients, 
  symptomlogs: SymptomLogs, 
  questions: Questions 
} = initModels(sequelize);

class PatientService {
  async getAllPatients() {
    return await Patients.findAll({ order: [['createdAt', 'DESC']] });
  }

  async findOrInitPatient(telegram_id) {
    let patient = await Patients.findByPk(telegram_id);
    if (!patient) {
      patient = await Patients.create({ telegram_id, isRegistered: false });
    }
    return patient;
  }

  async findByName(name) {
    return await Patients.findOne({ where: { name } });
  }

  async registerPatient(telegram_id, name, birthDate) {
    return await Patients.update(
      { name, birth: birthDate, isRegistered: true },
      { where: { telegram_id } }
    );
  }

  async deletePatient(telegram_id) {
    return await Patients.destroy({ where: { telegram_id } });
  }

  async countPatients() {
    return await Patients.count();
  }

  async getRecentLogs() {
    return await SymptomLogs.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Patients,
          as: 'telegram_id_patient',
          attributes: ['name', 'telegram_id']
        },
        {
          model: Questions,
          as: 'question',
          attributes: ['question_text']
        }
      ]
    });
  }

  async getPatientWithLogs(telegram_id) {
    return await Patients.findOne({
      where: { telegram_id },
      include: [{
        model: SymptomLogs,
        as: 'symptomlogs',
        required: false,
        include: [{
          model: Questions,
          as: 'question', 
          attributes: ['id', 'question_text', 'scheduled_time']
        }]
      }],
      order: [
        [{ model: SymptomLogs, as: 'symptomlogs' }, 'createdAt', 'DESC']
      ]
    });
  }
}

module.exports = new PatientService();