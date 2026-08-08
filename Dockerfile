# Gunakan base image Node.js yang ringan
FROM node:20-alpine

# Set direktori kerja di dalam kontainer
WORKDIR /usr/src/app

# Salin manifest dependensi terlebih dahulu untuk optimasi cache Docker
COPY package*.json ./

# Instal dependensi hanya untuk production (mengabaikan devDependencies seperti nodemon)
RUN npm ci --only=production

# Salin seluruh kode sumber aplikasi
COPY . .

# Ekspos port yang digunakan oleh aplikasi (sesuai port di app.js)
EXPOSE 3001

# Jalankan aplikasi menggunakan node murni (bukan nodemon)
CMD ["node", "app.js"]