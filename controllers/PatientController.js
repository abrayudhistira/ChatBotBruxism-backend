const PatientService = require('../services/PatientService');

class PatientController {
  async index(req, res) {
    try {
      const data = await PatientService.getAllPatients();
      res.status(200).json({
        success: true,
        data: data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async destroy(req, res) {
    try {
      const { telegram_id } = req.params;
      await PatientService.deletePatient(telegram_id);
      res.status(200).json({
        success: true,
        message: `Pasien ${telegram_id} berhasil dihapus`
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PatientController();