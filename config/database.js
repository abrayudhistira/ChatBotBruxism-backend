const { Sequelize } = require('sequelize');
require('dotenv').config();
const mysql2 = require('mysql2');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST.trim(),
    dialect: 'mysql2',
    port: parseInt(process.env.DB_PORT) || 15462,
    logging: false,
    timezone: '+07:00',
    dialectOptions: {
      connectTimeout: 60000, // Perpanjang timeout jadi 60 detik
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  }
);

module.exports = sequelize;