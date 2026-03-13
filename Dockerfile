# Menggunakan Node 24 berbasis Debian Bookworm
FROM node:24-bookworm

# Instal semua dependency library OS untuk Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libxshmfence1 \
    libglu1-mesa \
    fonts-liberation \
    libappindicator3-1 \
    libxss1 \
    xdg-utils \
    libglib2.0-0 \
    ca-certificates \
    wget \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment agar Puppeteer tahu di mana letak browser (Opsional tapi membantu)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

WORKDIR /app

COPY package*.json ./

# Instal dependensi (Gunakan ci untuk hasil yang lebih bersih di produksi)
RUN npm install

COPY . .

# Berikan port yang sesuai dengan Railway (biasanya 8080)
EXPOSE 8080

CMD ["node", "app.js"]