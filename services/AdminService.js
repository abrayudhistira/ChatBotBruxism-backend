// services/AdminService.js
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { admins: Admins } = initModels(sequelize);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AdminService {
  // --- LOGIN LOGIC ---
  async login(username, password) {
    const admin = await Admins.findOne({ where: { username } });
    if (!admin) throw new Error("User not found");

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new Error("Invalid credentials");

    // Buat Token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, admin: { id: admin.id, username: admin.username } };
  }

  // --- CRUD ADMIN ---
  async createAdmin(username, password) {
    const hashedPassword = await bcrypt.hash(password, 12); // Round 12
    return await Admins.create({ username, password: hashedPassword });
  }

  async getAllAdmins() {
    return await Admins.findAll({ attributes: ['id', 'username', 'createdAt'] }); // Jangan return password
  }

  async updateAdmin(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return await Admins.update({ password: hashedPassword }, { where: { id } });
  }

  async deleteAdmin(id) {
    return await Admins.destroy({ where: { id } });
  }
  
  // --- SEEDER MASTER ---
  async seedMasterAdmin() {
    const count = await Admins.count();
    if (count === 0) {
      console.log("Seeding Master Admin...");
      await this.createAdmin('admin', 'root');
      console.log("Master Admin Created (User: admin, Pass: root)");
    }
  }
}

module.exports = new AdminService();