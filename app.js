require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const sequelize = require('./config/database');
const patientRoutes = require('./routes/patientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const questionsRoutes = require('./routes/questionRoutes');
const BotController = require('./controllers/BotController');
const initScheduler = require('./jobs/DynamicQuestionJob');
const AdminService = require("./services/AdminService");
const questions = require('./models/questions');

// 1. Init Express & Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Register Routes
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/question', questionsRoutes)

// 4. Init WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth({ clientId: process.env.WA_SESSION_ID }),
  puppeteer: { headless: true, args: ['--no-sandbox'] }
});

// 5. WhatsApp Event Listeners
client.on('qr', (qr) => {
  console.log('SCAN QR CODE INI:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp Client Ready!');
  // Jalankan Scheduler setelah WA connect
  initScheduler(client);
});

// Delegate message logic ke BotController
client.on('message', (msg) => {
  BotController.handleIncomingMessage(msg, io);
});

// 6. Start Server (Pastikan DB Connect dulu)
sequelize.authenticate()
  .then(async () => { // Tambah async
    console.log('✅ Database Connected.');
    
    // --- SEEDING MASTER ADMIN ---
    await AdminService.seedMasterAdmin();
    // ---------------------------

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      client.initialize();
    });
  })
  .catch(err => {
    console.error('❌ Database Connection Error:', err);
  });