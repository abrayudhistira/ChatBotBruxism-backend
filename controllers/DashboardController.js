// controllers/DashboardController.js
const PatientService = require('../services/PatientService');

class DashboardController {
  // Endpoint 1: Total Pasien
  async getStats(req, res) {
    try {
      const totalPatients = await PatientService.countPatients();
      res.json({ success: true, total_patients: totalPatients });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Endpoint 2: 10 Jawaban Terbaru
  async getRecentActivity(req, res) {
    try {
      const logs = await PatientService.getRecentLogs();
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Endpoint 4: Detail Pasien + Jawaban
  async getPatientDetail(req, res) {
    try {
      const { phone } = req.params;
      const data = await PatientService.getPatientWithLogs(phone);
      if(!data) return res.status(404).json({success: false, message: "Pasien tidak ditemukan"});
      
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new DashboardController();