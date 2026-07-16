# Telegram Bot Migration Guide

## Overview
Migration dari WhatsApp (Baileys) ke Telegram (Telegraf) untuk chatbot bruxism monitoring.

## Tech Stack
- **Bot Framework**: Telegraf.js
- **Database**: MySQL via Sequelize
- **Scheduler**: node-cron

## Flow Diagram

```
User                Telegram Bot              Backend                    Database
 │                      │                        │                          │
 │──── /start ─────────>│                        │                          │
 │                      │─────── cek DB ────────>│                          │
 │                      │<─────── belum reg ─────│                          │
 │<──── reply nama ─────│                        │                          │
 │                      │                        │                          │
 │──── nama ──────────>│                        │                          │
 │                      │─────── simpan ─────────>│                          │
 │                      │                        │─────── INSERT ───────────>│
 │<──── reply tgl lahir─│                        │                          │
 │                      │                        │                          │
 │──── tgl lahir ─────>│                        │                          │
 │                      │─────── update ────────>│                          │
 │                      │                        │─────── UPDATE ───────────>│
 │<──── sukses ────────│                        │                          │
 │                      │                        │                          │
 │                      │         ┌───────────── CRON (tiap menit) ─────────┤
 │                      │         │              cek pertanyaan aktif        │
 │                      │<────────┘              broadcast ke semua pasien    │
 │<──── pertanyaan ────│                        │                          │
 │                      │                        │                          │
 │──── klik 1-5 ──────>│                        │                          │
 │                      │─────── simpan ────────>│                          │
 │                      │                        │─────── INSERT ───────────>│
 │<──── konfirmasi ────│                        │                          │
```

## Database Schema

### Table: patients
| Column | Type | Description |
|--------|------|-------------|
| telegram_id | VARCHAR(255) | Primary key, Telegram user ID |
| name | VARCHAR(255) | Nama lengkap |
| birth_date | DATE | Tanggal lahir |
| isRegistered | BOOLEAN | Status registrasi |
| current_question_id | INT | Pertanyaan sedang aktif (nullable) |
| createdAt | DATETIME | Timestamp |
| updatedAt | DATETIME | Timestamp |

### Table: symptomlogs
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key, auto increment |
| telegram_id | VARCHAR(255) | FK ke patients |
| question_id | INT | FK ke questions |
| answer | INT | Nilai 1-5 |
| createdAt | DATETIME | Timestamp |

### Table: questions
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| question_text | TEXT | Teks pertanyaan |
| scheduled_time | TIME | Jam kirim (format HH:MM) |
| isActive | BOOLEAN | Status aktif |

## API Endpoints

### Patient Management
```
GET    /api/patients              - List semua pasien
GET    /api/patients/:telegram_id - Detail pasien + jawaban
DELETE /api/patients/:telegram_id - Hapus pasien
```

### Question Management
```
GET    /api/question              - List semua pertanyaan
GET    /api/question/:id           - Detail pertanyaan
POST   /api/question              - Create pertanyaan
PUT    /api/question/:id          - Update pertanyaan
DELETE /api/question/:id          - Delete pertanyaan
```

### Admin
```
POST   /api/admin/login           - Login admin
GET    /api/admin/dashboard       - Dashboard data
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Mulai / registrasi |
| (text) | Input nama / tanggal lahir saat registrasi |

## Bot Flow

### 1. Registrasi
```
/start → "Masukkan nama" → [nama] → "Masukkan tanggal lahir" → [YYYY-MM-DD] → "Berhasil"
```

### 2. Pertanyaan (via Cron)
```
Cron kirim → User terima pertanyaan → Klik 1-5 → "Jawaban tersimpan"
```

## Security Features

### Registrasi
- Validasi nama: 2-50 karakter, huruf/spasi/apostrof/hyphen saja
- Validasi tanggal: format YYYY-MM-DD, tahun 1930-sekarang, tidak boleh masa depan
- Cek duplikasi: jika sudah terdaftar, tolak dengan pesan warning
- Race condition protection: cek `isRegistered` sebelum insert/update

### API
- Semua endpoint `/api/patients` dilindungi JWT middleware
- Parameter menggunakan `telegram_id` (bukan phone)

## Environment Variables

```env
PORT=3001
DB_HOST=<host>
DB_PORT=<port>
DB_USER=<user>
DB_PASS=<password>
DB_NAME=<database>
DB_DIALECT=mysql
JWT_SECRET=<secret>
TELEGRAM_BOT_TOKEN=<token>
```

## Setup Steps

1. **Database Migration**
```sql
-- Drop FK constraint
ALTER TABLE symptomlogs DROP FOREIGN KEY symptomlogs_ibfk_1;

-- Rename columns
ALTER TABLE patients CHANGE phone telegram_id VARCHAR(255);
ALTER TABLE symptomlogs CHANGE phone_number telegram_id VARCHAR(255);

-- Truncate data
TRUNCATE TABLE symptomlogs;
TRUNCATE TABLE patients;

-- Recreate FK
ALTER TABLE symptomlogs ADD CONSTRAINT symptomlogs_ibfk_1 
  FOREIGN KEY (telegram_id) REFERENCES patients(telegram_id);
```

2. **Install Dependencies**
```bash
npm install telegraf node-cron
```

3. **Run Server**
```bash
npm start
```

## File Structure

```
├── app.js                      # Main entry, init Telegram bot
├── controllers/
│   ├── BotController.js       # Bot handlers (start, text, callback)
│   ├── DashboardController.js # Dashboard API
│   └── PatientController.js   # Patient CRUD API
├── services/
│   ├── TelegramService.js      # Telegraf wrapper
│   ├── PatientService.js      # Patient CRUD
│   └── QuestionService.js     # Question & symptom log CRUD
├── jobs/
│   └── DynamicQuestionJob.js   # Cron job scheduler
├── models/
│   ├── patients.js            # Patient model
│   ├── questions.js           # Question model
│   └── symptomlogs.js         # Symptom log model
└── .env                       # Environment config
```

## Frontend Integration

### Socket.io Events
```javascript
// Listen for new symptom data
socket.on('NEW_SYMPTOM_DATA', (data) => {
  console.log(data);
  // {
  //   telegram_id: "123456",
  //   name: "John",
  //   answer: 4,
  //   question_id: 1,
  //   timestamp: Date
  // }
});
```

### Health Check
```
GET /health
Response: { server, uptime, timestamp, database, telegram }
```

## Notes

- User tidak bisa akses riwayat langsung dari bot
- Pertanyaan dikirim otomatis via cron job sesuai `scheduled_time`
- Jawaban user disimpan ke `symptomlogs` dengan `telegram_id` sebagai foreign key
- Semua endpoint patient dilindungi JWT