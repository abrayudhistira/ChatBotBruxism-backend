const PatientService = require('../services/PatientService');

class DashboardController {
  async getStats(req, res) {
    try {
      const totalPatients = await PatientService.countPatients();
      res.json({ success: true, total_patients: totalPatients });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getRecentActivity(req, res) {
    try {
      const logs = await PatientService.getRecentLogs();
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPatientDetail(req, res) {
    try {
      const { telegram_id } = req.params;
      const data = await PatientService.getPatientWithLogs(telegram_id);
      if (!data) return res.status(404).json({ success: false, message: "Pasien tidak ditemukan" });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new DashboardController();