// controllers/AuthController.js
const AdminService = require('../services/AdminService');

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await AdminService.login(username, password);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(401).json({ success: false, message: error.message });
    }
  }

  async registerAdmin(req, res) {
    try {
      const { username, password } = req.body;
      await AdminService.createAdmin(username, password);
      res.status(201).json({ success: true, message: "Admin created" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Method untuk list admin dll bisa ditambahkan di sini
}

module.exports = new AuthController();