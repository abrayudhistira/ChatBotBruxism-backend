npm exec sequelize-auto -- -o "./models" -d bruxism_chatbot -h localhost -u root -p 3306 -e mysql

Bruxism Chatbot Gateway (Baileys Engine)
Aplikasi ini merupakan backend service berbasis Node.js yang berfungsi sebagai WhatsApp Gateway untuk sistem kuesioner dan diagnosa dini penyakit gigi (Bruxism). Sistem ini dirancang untuk mengirimkan pertanyaan klinis secara berkala kepada pasien menggunakan penjadwalan otomatis (cron job) dan mengolah jawaban secara real-time.

🏗️ Arsitektur Sistem
Aplikasi ini dibangun menggunakan arsitektur Event-Driven & Layered Architecture (MVC-ish) yang disesuaikan untuk kebutuhan pemrosesan data asynchronous.

Communication Layer: Menggunakan @whiskeysockets/baileys yang memanfaatkan koneksi Websocket langsung ke server WhatsApp tanpa komponen browser wrapper.

Real-time Layer: Menggunakan Socket.io untuk menjembatani komunikasi data dua arah secara instan antara backend dan dashboard admin frontend.

Data Layer: Didukung oleh Sequelize ORM untuk manajemen data pasien, daftar pertanyaan, dan log jawaban kuesioner di database.

Task Scheduling: Memanfaatkan node-cron untuk eksekusi otomatis broadcast kuesioner harian berdasarkan preferensi waktu sistem.

📊 Analisis Karakteristik Sistem (Kelebihan & Kelemahan)
Dalam konteks pengujian performa dan keandalan sistem (reliability testing), berikut adalah karakteristik dari mesin berbasis Baileys yang diimplementasikan:

Kelebihan
Efisiensi Resource yang Tinggi: Menggunakan arsitektur berbasis soket murni tanpa memerlukan headless browser (seperti Puppeteer/Chromium). Hal ini mereduksi penggunaan RAM server hingga >80% dibandingkan pustaka seperti whatsapp-web.js.

Mekanisme Self-Healing (Pemulihan Otomatis): Dilengkapi fitur deteksi status koneksi. Sesi yang expired (Error 401) akan memicu penghapusan otomatis direktori kredensial lama guna memicu pembuatan ulang sesi baru (auto-generate QR) tanpa intervensi manual dari sisi server.

Deployment Ringan (Container-Ready): Karena dependensinya yang minimal, aplikasi dapat dikemas ke dalam Docker image berbasis Alpine Linux yang sangat ringan (<200MB) dan mendukung penuh persistensi data menggunakan Docker Volumes.

Mendukung Akun Multi-Device Terbaru: Dapat beradaptasi secara dinamis terhadap tipe data pengenal bawaan WhatsApp yang baru, baik berbasis nomor telepon tradisional maupun LID (Linked ID).

Kelemahan
Ketergantungan pada API Komunitas: Sebagai pustaka open-source (bukan WhatsApp Business API resmi), sistem ini sangat bergantung pada pembaruan berkala dari komunitas untuk menyesuaikan perubahan protokol reverse-engineering yang dilakukan oleh pihak Meta.

Deprecate Fitur Komponen UI Interaktif: Meta telah memblokir pengiriman komponen tombol fisik (interactive buttons) pada jenis akun personal biasa. Solusi dialihkan menggunakan interaksi berbasis teks angka terstruktur (Menu-Driven Text Parsers).

🛠️ Prasyarat (Prerequisites)
Sebelum menjalankan aplikasi, pastikan perangkat atau server Anda telah terinstal:

Node.js (Versi v20.x direkomendasikan)

Docker & Docker Compose (Untuk tahap produksi/deployment)

🚀 Cara Instalasi dan Menjalankan Proyek
A. Tahap Pengembangan (Local Development)
Clone Repositori dan Masuk ke Direktori Proyek:

Bash
git clone <url_repository_kamu>
cd bruxism-chatbot-backend
Instal Seluruh Dependensi:

Bash
npm install
Konfigurasi Environment Variable:
Buat file bernama .env di direktori utama, lalu sesuaikan kredensial database Anda:

Cuplikan kode
PORT=3001
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=password_kamu
DB_NAME=nama_database_kamu
Jalankan Aplikasi dalam Mode Development:

Bash
npm run dev
Catatan: Aplikasi akan berjalan menggunakan nodemon dan memantau setiap perubahan kode secara otomatis.

B. Tahap Produksi (Production Deployment dengan Docker)
Untuk memastikan sistem berjalan 24 jam nonstop dengan manajemen isolasi lingkungan yang aman, gunakan instruksi Docker berikut:

Build dan Jalankan Kontainer di Background:

Bash
docker compose up -d --build
Pantau Log Server Secara Real-time untuk Melakukan Scan QR:

Bash
docker logs -f bbot_backend
Pindai (scan) QR Code yang muncul di terminal menggunakan aplikasi WhatsApp pada ponsel pintar Anda.

Menghentikan Layanan Kontainer:

Bash
docker compose down

Jika kamu membutuhkan kepentingan terkait project ini, feel free to ask :
📧 abrayudhistira59@gmail.com