const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

// PERBAIKAN DI SINI: Mapping nama model kecil ke Besar
const { questions: Questions, symptomlogs: SymptomLogs } = initModels(sequelize);

class QuestionService {
  /**
   * Mencari pertanyaan yang jadwalnya cocok dengan menit ini
   */

  async sendQuestionWithButtons(sock, jid, questionData) {
    const message =
      `-----------------------------------------\n\n` +
      `${questionData.question_text}\n\n` +
      `*Silakan balas dengan memilih salah satu angka di bawah ini:*\n` +
      `🔢 *[1]* Tidak Pernah\n` +
      `🔢 *[2]* Jarang\n` +
      `🔢 *[3]* Kadang-kadang\n` +
      `🔢 *[4]* Sering\n` +
      `🔢 *[5]* Sangat Sering\n\n` +
      `_Cukup ketik angkanya saja (Contoh: 3)_`;

    await sock.sendMessage(jid, { text: message });
  }

  async getActiveQuestionsByTime(timeString) {
    return await Questions.findAll({
      where: {
        scheduled_time: { [Op.like]: `${timeString}%` },
        is_active: true
      }
    });
  }

  /**
   * Menyimpan jawaban pasien ke tabel log
   */
  async saveSymptomLog(phone, answer, questionId = null) {
    return await SymptomLogs.create({
      phone_number: phone,
      answer: answer.toString(),
      question_id: questionId
    });
  }

  // --- CRUD METHODS ---

  async getAllQuestions() {
    return await Questions.findAll({
      order: [['scheduled_time', 'ASC']]
    });
  }

  async getQuestionById(id) {
    return await Questions.findByPk(id);
  }

  async createQuestion(data) {
    return await Questions.create(data);
  }

  async updateQuestion(id, data) {
    const question = await Questions.findByPk(id);
    if (!question) throw new Error("Question not found");
    return await question.update(data);
  }

  async deleteQuestion(id) {
    const question = await Questions.findByPk(id);
    if (!question) throw new Error("Question not found");
    return await question.destroy();
  }
}

module.exports = new QuestionService();