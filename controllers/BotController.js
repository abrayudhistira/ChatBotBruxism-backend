const PatientService = require('../services/PatientService');
const QuestionService = require('../services/QuestionService');
const telegramService = require('../services/TelegramService');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { patients: Patients } = initModels(sequelize);

// State management for registration flow
const userStates = new Map();

class BotController {
  // Validate name: min 2 chars, max 50, letters and spaces only
  isValidName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, msg: "Nama tidak valid." };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { valid: false, msg: "Nama minimal 2 karakter." };
    }
    if (trimmed.length > 50) {
      return { valid: false, msg: "Nama maksimal 50 karakter." };
    }
    // Letters, spaces, apostrophes, hyphens only
    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      return { valid: false, msg: "Nama hanya boleh huruf, spasi, apostrof, dan hyphen." };
    }
    return { valid: true, name: trimmed };
  }

  // Validate date: YYYY-MM-DD, year 1930-now
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regex)) {
      return { valid: false, msg: "Format tanggal salah. Gunakan YYYY-MM-DD (contoh: 1990-12-31)." };
    }

    const date = new Date(dateString);
    const timestamp = date.getTime();
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return { valid: false, msg: "Tanggal tidak valid dalam kalender." };
    }

    const year = date.getFullYear();
    const now = new Date();

    if (year < 1930) return { valid: false, msg: "Tahun lahir tidak valid (terlalu lampau). Minimal tahun 1930." };
    if (date > now) return { valid: false, msg: "Tanggal lahir tidak boleh di masa depan." };

    return { valid: true };
  }

  // Setup all Telegram bot handlers
  setupBotHandlers(io) {
    const bot = telegramService.getBot();

    // /start command
    bot.start(async (ctx) => {
      const telegram_id = ctx.from.id.toString();
      const patient = await PatientService.findOrInitPatient(telegram_id);

      if (!patient.isRegistered) {
        userStates.set(telegram_id, { step: 'awaiting_name' });
        return ctx.reply("👋 Selamat datang di Bruxism ChatBot!\n\nSilakan daftar terlebih dahulu.\n\nMasukkan nama lengkap Anda:");
      }

      // Registered user - show confirmation
      return ctx.reply(`👋 Halo ${patient.name}!\n\nAnda sudah terdaftar.\n\nPertanyaan akan dikirim otomatis sesuai jadwal.\n\nKetik /start untuk melihat info ini lagi.`);
    });

    // Handle all text messages
    bot.on('text', async (ctx) => {
      const telegram_id = ctx.from.id.toString();
      const text = ctx.message.text.trim();

      // Check if in registration flow
      const state = userStates.get(telegram_id);
      if (state) {
        return this.handleRegistrationFlow(ctx, telegram_id, text, state);
      }

      // Check if registered
      const patient = await PatientService.findOrInitPatient(telegram_id);
      if (!patient.isRegistered) {
        userStates.set(telegram_id, { step: 'awaiting_name' });
        return ctx.reply("Silakan daftar terlebih dahulu.\nMasukkan nama lengkap Anda:");
      }

      // Registered user - show info
      return ctx.reply(`👋 Halo ${patient.name}!\n\nAnda sudah terdaftar.\n\nPertanyaan akan dikirim otomatis sesuai jadwal.`);
    });

    // Handle callback queries (button clicks from cron job answers)
    bot.on('callback_query', async (ctx) => {
      const telegram_id = ctx.from.id.toString();
      const data = ctx.callbackQuery.data;
      const patient = await PatientService.findOrInitPatient(telegram_id);

      if (!patient.isRegistered) {
        return ctx.answerCbQuery('Silakan daftar terlebih dahulu dengan /start');
      }

      // Handle answer from inline buttons (format: ans_X = ans_answer)
      if (data.startsWith('ans_')) {
        const parts = data.split('_');
        const answer = parseInt(parts[1]);
        if (!isNaN(answer) && answer >= 1 && answer <= 5) {
          await this.handleAnswer(telegram_id, answer, io);
          return ctx.answerCbQuery(`Jawaban ${answer} tersimpan!`);
        }
      }

      await ctx.answerCbQuery();
    });
  }

  async handleRegistrationFlow(ctx, telegram_id, text, state) {
    if (state.step === 'awaiting_name') {
      // Validate name format
      const nameCheck = this.isValidName(text);
      if (!nameCheck.valid) return ctx.reply(`Gagal: ${nameCheck.msg}`);

      // Check if name already exists in database
      const existingPatient = await PatientService.findByName(nameCheck.name);
      if (existingPatient) {
        userStates.delete(telegram_id);
        return ctx.reply(`⚠️ Nama "${nameCheck.name}" sudah terdaftar.\n\nSilakan gunakan nama lain atau hubungi admin.\n\nKetik /start untuk mulai lagi.`);
      }

      userStates.set(telegram_id, { step: 'awaiting_birth', name: nameCheck.name });
      return ctx.reply(`Nama: ${nameCheck.name}\n\nSekarang masukkan tanggal lahir (YYYY-MM-DD):\nContoh: 1990-05-20`);
    }

    if (state.step === 'awaiting_birth') {
      // Validate date
      const dateCheck = this.isValidDate(text);
      if (!dateCheck.valid) return ctx.reply(`Gagal: ${dateCheck.msg}`);

      // Check if already registered (race condition protection)
      const existing = await PatientService.findOrInitPatient(telegram_id);
      if (existing.isRegistered) {
        userStates.delete(telegram_id);
        return ctx.reply(`⚠️ Anda sudah terdaftar sebelumnya.\n\nKetik /start untuk info lainnya.`);
      }

      // Register patient
      const success = await PatientService.registerPatient(telegram_id, state.name, text);
      
      if (!success) {
        return ctx.reply("❌ Gagal menyimpan data. Silakan coba lagi.");
      }

      userStates.delete(telegram_id);

      return ctx.reply(`✅ Pendaftaran berhasil!\n\nHalo ${state.name}!\nTanggal lahir ${text} tersimpan.\n\nPertanyaan akan dikirim otomatis sesuai jadwal.\n\nKetik /start untuk melihat info ini lagi.`);
    }
  }

  // Handle answer from inline buttons (called from cron job)
  async handleAnswer(telegram_id, answer, io) {
    const patient = await PatientService.findOrInitPatient(telegram_id);
    if (!patient || !patient.isRegistered || !patient.current_question_id) return;

    await QuestionService.saveSymptomLog(telegram_id, answer, patient.current_question_id);
    await Patients.update({ current_question_id: null }, { where: { telegram_id } });

    io.emit('NEW_SYMPTOM_DATA', {
      telegram_id, name: patient.name, answer,
      question_id: patient.current_question_id, timestamp: new Date()
    });

    const bot = telegramService.getBot();
    await bot.telegram.sendMessage(telegram_id, `✅ Terima kasih, jawaban Anda (${answer}/5) telah tersimpan.\n\nKetik /start untuk info lainnya.`);
  }
}

module.exports = new BotController();