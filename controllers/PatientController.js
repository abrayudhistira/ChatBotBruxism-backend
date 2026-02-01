const PatientService = require('../services/PatientService');

class PatientController {
  async index(req, res) {
    try {
      const data = await PatientService.getAllPatients();
      // Format Response JSON Standar
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
      const { phone } = req.params;
      await PatientService.deletePatient(phone);
      res.status(200).json({
        success: true,
        message: `Pasien ${phone} berhasil dihapus`
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PatientController();