const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const { questions: Questions, symptomlogs: SymptomLogs, patients: Patients } = initModels(sequelize);

class QuestionService {
  async getActiveQuestionsByTime(timeString) {
    return await Questions.findAll({
      where: {
        scheduled_time: { [Op.like]: `${timeString}%` },
        is_active: true
      }
    });
  }

  async saveSymptomLog(telegram_id, answer, questionId = null) {
    return await SymptomLogs.create({
      telegram_id,
      answer: answer.toString(),
      question_id: questionId
    });
  }

  async getAllQuestions() {
    return await Questions.findAll({ order: [['scheduled_time', 'ASC']] });
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

  async getPatientLogs(telegram_id) {
    return await SymptomLogs.findAll({
      where: { telegram_id },
      include: [{ model: Questions, as: 'question' }],
      order: [['createdAt', 'DESC']]
    });
  }

  async getNextQuestion(currentQuestionId) {
    return await Questions.findOne({
      where: { id: { [Op.gt]: currentQuestionId } },
      order: [['id', 'ASC']]
    });
  }
}

module.exports = new QuestionService();