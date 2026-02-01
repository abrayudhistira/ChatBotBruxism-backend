const QuestionService = require('../services/QuestionService');

class QuestionController {
  // GET /api/questions
  async index(req, res) {
    try {
      const data = await QuestionService.getAllQuestions();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/questions/:id
  async show(req, res) {
    try {
      const data = await QuestionService.getQuestionById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: "Data not found" });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/questions
  async store(req, res) {
    try {
      // Validasi input sederhana
      if (!req.body.question_text || !req.body.scheduled_time) {
        return res.status(400).json({ success: false, message: "Text and Time are required" });
      }
      
      const data = await QuestionService.createQuestion(req.body);
      res.status(201).json({ success: true, message: "Pertanyaan berhasil dibuat", data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/questions/:id
  async update(req, res) {
    try {
      const data = await QuestionService.updateQuestion(req.params.id, req.body);
      res.json({ success: true, message: "Pertanyaan berhasil diupdate", data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/questions/:id
  async destroy(req, res) {
    try {
      await QuestionService.deleteQuestion(req.params.id);
      res.json({ success: true, message: "Pertanyaan berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new QuestionController();