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

// --- 1. STATE VARIABLES (Untuk menangani Refresh Frontend) ---
// Variabel ini menyimpan status terakhir agar client baru langsung dapat data
let currentQR = null;
let isClientReady = false;

// --- 2. INIT SERVER & SOCKET ---
const app = express();
const server = http.createServer(app);

// Setup Socket.io dengan CORS Longgar
const io = new Server(server, {
  cors: {
    origin: "*", // Izinkan semua IP (localhost, IP LAN, dll)
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

// --- 5. LOGIKA SOCKET CONNECTION (Fix QR Hilang saat Refresh) ---
io.on('connection', (socket) => {
  console.log('👤 Client Dashboard terhubung:', socket.id);

  // Cek State: Jika Bot sudah Ready, langsung kasih tahu frontend
  if (isClientReady) {
    socket.emit('WA_READY', true);
  } 
  // Cek State: Jika belum Ready TAPI ada QR yang tersimpan, kirim QR-nya
  else if (currentQR) {
    console.log('📤 Mengirim QR tersimpan ke client baru...');
    socket.emit('WA_QR', currentQR);
  }
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: process.env.WA_SESSION_ID }),
  puppeteer: { 
    headless: true, 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Menghindari crash karena keterbatasan memori shared
      '--disable-gpu',           // Server tidak butuh akselerasi grafis
      '--no-zygote'              // Mengurangi penggunaan resource proses
    ] 
  }
});

// --- 7. WHATSAPP EVENT LISTENERS ---

// Event: QR Code Muncul
client.on('qr', (qr) => {
  console.log('📸 QR RECEIVED');
  
  // Update State
  currentQR = qr;     
  isClientReady = false;

  // Tampilkan di terminal & Kirim ke semua socket client
  qrcode.generate(qr, { small: true });
  io.emit('WA_QR', qr);
});

// Event: Bot Siap
client.on('ready', () => {
  console.log('✅ WhatsApp Client Ready!');
  
  // Update State
  isClientReady = true; 
  currentQR = null; // Hapus QR karena sudah tidak dibutuhkan

  io.emit('WA_READY', true);
  
  // Jalankan Scheduler Broadcast
  initScheduler(client);
});

// Event: Autentikasi Sukses
client.on('authenticated', () => {
    console.log('🔐 WhatsApp Authenticated');
    io.emit('WA_AUTH', "Autentikasi Berhasil, memuat...");
});

// Event: Gagal Auth
client.on('auth_failure', msg => {
    console.error('❌ Auth Failure', msg);
    io.emit('WA_AUTH_FAIL', "Gagal Login WA");
});

// Event: Disconnected (Logout/HP Mati)
client.on('disconnected', (reason) => {
    console.log('⚠️ Client Disconnected:', reason);
    
    // Reset State
    isClientReady = false;
    currentQR = null;
    
    io.emit('WA_DISCONNECTED', "Bot Terputus");
});

// Event: Pesan Masuk
client.on('message', (msg) => {
  BotController.handleIncomingMessage(msg, io);
});

// --- 8. START SERVER ---
const PORT = process.env.PORT || 3001;

sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database Connected.');
    
    // Seeding Admin jika belum ada
    await AdminService.seedMasterAdmin();

    // Jalankan Server HTTP (yang membungkus Express & Socket.io)
    server.listen(PORT, () => {
      console.log(`🚀 Server & Socket.io running on port ${PORT}`);
      console.log(`📡 Socket.io siap menerima koneksi.`);
      
      // Nyalakan Bot WA
      client.initialize();
    });
  })
  .catch(err => {
    console.error('❌ Database Connection Error:', err);
  });