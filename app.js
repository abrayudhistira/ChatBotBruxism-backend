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
const questionRoutes = require('./routes/questionRoutes');
const BotController = require('./controllers/BotController');
const initScheduler = require('./jobs/DynamicQuestionJob');
const AdminService = require('./services/AdminService');

// --- 1. STATE VARIABLES ---
let currentQR = null;
let isClientReady = false;

// --- 2. INIT SERVER & SOCKET ---
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 4. ROUTES ---
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/question', questionRoutes);

// --- 5. LOGIKA SOCKET CONNECTION ---
io.on('connection', (socket) => {
  console.log(`👤 [SOCKET] Client Terhubung: ${socket.id}`);

  if (isClientReady) {
    socket.emit('WA_READY', true);
  } else if (currentQR) {
    console.log('📤 [SOCKET] Mengirim QR tersimpan ke client baru...');
    socket.emit('WA_QR', currentQR);
  }

  socket.on('disconnect', () => {
    console.log(`🔌 [SOCKET] Client Terputus: ${socket.id}`);
  });
});

// --- 6. INIT WHATSAPP CLIENT (OPTIMIZED FOR RAILWAY) ---
const client = new Client({
  authStrategy: new LocalAuth({ clientId: process.env.WA_SESSION_ID }),
  qrMaxRetries: 5,
  authTimeoutMs: 60000, // Tunggu 1 menit untuk auth
  puppeteer: { 
    headless: true, 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ],
  }
});

// --- 7. WHATSAPP EVENT LISTENERS (DETAILED LOGGING) ---

// Monitoring proses loading
client.on('loading_screen', (percent, message) => {
    console.log(`⏳ [WA-LOAD] ${percent}%: ${message}`);
    io.emit('WA_LOG', `Loading: ${percent}% - ${message}`);
});

// Event: QR Code Muncul
client.on('qr', (qr) => {
  console.log('📸 [WA-QR] QR Received! Silakan scan.');
  currentQR = qr;     
  isClientReady = false;

  qrcode.generate(qr, { small: true });
  io.emit('WA_QR', qr);
});

// Event: Bot Siap
client.on('ready', () => {
  console.log('✅ [WA-READY] WhatsApp Client is Ready!');
  isClientReady = true; 
  currentQR = null;

  io.emit('WA_READY', true);
  initScheduler(client);
});

// Event: Autentikasi Sukses
client.on('authenticated', () => {
    console.log('🔐 [WA-AUTH] Autentikasi Berhasil!');
    io.emit('WA_AUTH', "Autentikasi Berhasil, memuat...");
});

// Event: Gagal Auth (Kunci diagnosa "Cant Link")
client.on('auth_failure', msg => {
    console.error('❌ [WA-ERROR] Auth Failure:', msg);
    io.emit('WA_AUTH_FAIL', `Gagal Login: ${msg}`);
});

// Event: Perubahan State (Untuk tracking jika terputus/conflict)
client.on('change_state', state => {
    console.log('🔄 [WA-STATE]:', state);
    io.emit('WA_LOG', `State Change: ${state}`);
});

// Event: Disconnected
client.on('disconnected', (reason) => {
    console.log('⚠️ [WA-DISC] Client Disconnected:', reason);
    isClientReady = false;
    currentQR = null;
    io.emit('WA_DISCONNECTED', reason);
});

// Cari bagian ini di app.js
client.on('message', (msg) => {
  console.log(`📩 [WA-MSG] Pesan masuk dari ${msg.from}: ${msg.body}`); // Tambahkan log ini
  try {
    BotController.handleIncomingMessage(msg, io);
  } catch (err) {
    console.error("❌ [BOT-ERROR] Gagal proses pesan:", err);
  }
});

// --- 8. START SERVER ---
const PORT = process.env.PORT || 8080; // Railway default port

sequelize.authenticate()
  .then(async () => {
    console.log('✅ [DB] Database Connected.');
    await AdminService.seedMasterAdmin();

    server.listen(PORT, () => {
      console.log(`🚀 [SERVER] Running on port ${PORT}`);
      console.log(`📡 [SOCKET] Socket.io is active.`);
      
      // Inisialisasi Bot
      console.log('🤖 [WA] Initializing WhatsApp Client...');
      client.initialize();
    });
  })
  .catch(err => {
    console.error('❌ [DB-ERROR] Connection Error:', err);
  });