require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const sequelize = require('./config/database');
const patientRoutes = require('./routes/patientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const questionRoutes = require('./routes/questionRoutes');
const BotController = require('./controllers/BotController');
const initScheduler = require('./jobs/DynamicQuestionJob');
const AdminService = require('./services/AdminService');
const telegramService = require('./services/TelegramService');

// --- INIT SERVER & SOCKET ---
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const healthStatus = {
    server: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'UNKNOWN',
    telegram: 'READY'
  };

  try {
    await sequelize.authenticate();
    healthStatus.database = 'CONNECTED';
  } catch (err) {
    healthStatus.database = 'DISCONNECTED';
    healthStatus.server = 'DEGRADED';
  }

  const statusCode = (healthStatus.database === 'CONNECTED') ? 200 : 500;
  res.status(statusCode).json(healthStatus);
});

// --- ROUTES ---
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/question', questionRoutes);

// --- START SERVER ---
const PORT = process.env.PORT || 3001;

sequelize.authenticate()
  .then(async () => {
    console.log('✅ [DB] Database Connected.');
    await AdminService.seedMasterAdmin();

    server.listen(PORT, async () => {
      console.log(`🚀 [SERVER] Running on port ${PORT}`);
      console.log(`📡 [SOCKET] Socket.io is active.`);
      
      // Initialize Telegram Bot
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        console.error('❌ [TELEGRAM] TELEGRAM_BOT_TOKEN not found in .env');
        return;
      }

      console.log('🤖 [TELEGRAM] Initializing Telegram Bot...');
      telegramService.init(token);
      BotController.setupBotHandlers(io);
      initScheduler();
      
      telegramService.getBot().launch()
        .then(() => console.log('✅ [TELEGRAM] Bot is running!'))
        .catch(err => console.error('❌ [TELEGRAM] Launch error:', err));
    });
  })
  .catch(err => {
    console.error('❌ [DB-ERROR] Connection Error:', err);
  });