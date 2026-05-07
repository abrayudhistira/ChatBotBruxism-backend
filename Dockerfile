# Menggunakan Node 24 berbasis Debian Bookworm Slim
FROM node:24-bookworm-slim

# 1. Install utilitas dasar untuk manajemen repositori
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    curl \
    --no-install-recommends

# 2. Install Google Chrome Stable dan semua library pendukungnya
# Langkah ini krusial agar Puppeteer memiliki executable browser di server fisik
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y \
    google-chrome-stable \
    fonts-liberation \
    libasound2 \
    libnss3 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Konfigurasi Environment Variables
ENV NODE_ENV=production
# Kita beri tahu Puppeteer untuk menggunakan Chrome yang sudah terinstal di sistem
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# 4. Layer Caching: Install dependencies Node.js
COPY package*.json ./
RUN npm ci --only=production

# 5. Salin source code proyek Bruxism
COPY . .

# 6. Konfigurasi Keamanan: User Non-Root
# Menjalankan browser sebagai root sangat berisiko (security risk)
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Jalankan container menggunakan user pptruser
USER pptruser

# 7. Healthcheck & Exposure
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

# 8. Jalankan aplikasi
CMD ["node", "app.js"]