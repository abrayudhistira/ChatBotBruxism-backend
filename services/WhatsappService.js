// const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
// const pino = require('pino');
// const qrcode = require('qrcode-terminal');
// const BotController = require('../controllers/BotController');

// class WhatsAppService {
//     constructor(io) {
//         this.sock = null;
//         this.io = io;
//         this.isReady = false;
//     }

//     async init() {
//         const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

//         this.sock = makeWASocket({
//             logger: pino({ level: 'silent' }),
//             printQRInTerminal: false,
//             auth: state,
//             browser: ['BruxismBot', 'Chrome', '1.0.0']
//         });

//         this.sock.ev.on('creds.update', saveCreds);
//         this.sock.ev.on('connection.update', (update) => this.handleConnection(update));
//         this.sock.ev.on('messages.upsert', (m) => this.handleMessages(m));
//     }

//     // handleConnection(update) {
//     //     const { connection, lastDisconnect, qr } = update;
//     //     console.log('DEBUG [CONNECTION_UPDATE]:', { connection, hasQr: !!qr });

//     //     if (qr) {
//     //         qrcode.generate(qr, { small: true });
//     //         this.io.emit('WA_QR', qr);
//     //     }

//     //     if (connection === 'close') {
//     //         const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
//     //         if (shouldReconnect) this.init();
//     //     } else if (connection === 'open') {
//     //         this.isReady = true;
//     //         this.io.emit('WA_READY', true);
//     //     }
//     // }

//     handleConnection(update) {
//     const { connection, lastDisconnect, qr } = update;

//     if (qr) {
//         qrcode.generate(qr, { small: true });
//         this.io.emit('WA_QR', qr);
//     }

//     if (connection === 'close') {
//         const statusCode = lastDisconnect?.error?.output?.statusCode;
        
//         // 401 adalah status code untuk "Logged Out" atau "Invalid Session"
//         if (statusCode === DisconnectReason.loggedOut) {
//             console.log('⚠️ Sesi tidak valid. Menghapus folder auth_info_baileys...');
            
//             // Hapus folder sesi agar sistem bisa generate QR baru
//             fs.rmSync(path.join(__dirname, '../auth_info_baileys'), { 
//                 recursive: true, 
//                 force: true 
//             });

//             console.log('✅ Folder sesi berhasil dihapus. Silakan scan ulang.');
//             // Restart inisialisasi agar QR muncul kembali
//             this.init(); 
//         } else {
//             // Untuk error lain (koneksi putus), cukup reconnect
//             console.log('🔄 Koneksi terputus, mencoba reconnect...');
//             this.init();
//         }
//     } else if (connection === 'open') {
//         this.isReady = true;
//         this.io.emit('WA_READY', true);
//         console.log('✅ WhatsApp Terhubung!');
//     }
// }

//     async handleMessages(m) {
//         const msg = m.messages[0];
//         if (!msg.message || msg.key.fromMe) return;

//         const formattedMsg = {
//             from: msg.key.remoteJid,
//             body: msg.message.conversation || msg.message.extendedTextMessage?.text || "",
//             type: 'chat',
//             getContact: async () => ({ number: msg.key.remoteJid.replace('@s.whatsapp.net', '') }),
//             reply: async (text) => await this.sock.sendMessage(msg.key.remoteJid, { text })
//         };

//         await BotController.handleIncomingMessage(formattedMsg, this.io);
//     }

//     getSocket() {
//         return this.sock;
//     }
// }

// module.exports = WhatsAppService;
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs'); // Tambahkan ini agar tidak error
const path = require('path'); // Tambahkan ini agar tidak error
const BotController = require('../controllers/BotController');

class WhatsAppService {
    constructor(io) {
        this.sock = null;
        this.io = io;
        this.isReady = false;
    }

    async init() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

        this.sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['BruxismBot', 'Chrome', '1.0.0']
        });

        this.sock.ev.on('creds.update', saveCreds);
        this.sock.ev.on('connection.update', (update) => this.handleConnection(update));
        this.sock.ev.on('messages.upsert', (m) => this.handleMessages(m));
    }

    handleConnection(update) {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
            this.io.emit('WA_QR', qr);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('⚠️ Sesi tidak valid. Menghapus folder auth_info_baileys...');
                fs.rmSync(path.join(__dirname, '../auth_info_baileys'), { 
                    recursive: true, 
                    force: true 
                });
                console.log('✅ Folder sesi berhasil dihapus. Silakan scan ulang.');
                this.init(); 
            } else {
                console.log('🔄 Koneksi terputus, mencoba reconnect...');
                this.init();
            }
        } else if (connection === 'open') {
            this.isReady = true;
            this.io.emit('WA_READY', true);
            console.log('✅ WhatsApp Terhubung!');
        }
    }

    async handleMessages(m) {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // Ambil ID murni tanpa domain, tetapi tandai jika dia adalah LID
        const rawJid = msg.key.remoteJid;
        const isLid = rawJid.endsWith('@lid');
        const cleanNumber = isLid ? rawJid.replace('@lid', '') : rawJid.replace('@s.whatsapp.net', '');

        const formattedMsg = {
            from: rawJid,
            body: msg.message.conversation || msg.message.extendedTextMessage?.text || "",
            type: 'chat',
            // Simpan ke database beserta penanda bila itu LID agar Scheduler tahu cara kirimnya
            getContact: async () => ({ 
                number: isLid ? `${cleanNumber}_lid` : cleanNumber 
            }),
            reply: async (text) => await this.sock.sendMessage(rawJid, { text })
        };

        await BotController.handleIncomingMessage(formattedMsg, this.io);
    }

    getSocket() {
        return this.sock;
    }
}

module.exports = WhatsAppService;