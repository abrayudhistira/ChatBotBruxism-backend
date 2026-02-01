const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: 3306,
    logging: false, // Matikan log SQL agar console bersih
    timezone: '+07:00' // Wajib set timezone Indonesia
  }
);

module.exports = sequelize;