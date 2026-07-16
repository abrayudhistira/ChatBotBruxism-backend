const { Telegraf } = require('telegraf');

class TelegramService {
  constructor() {
    this.bot = null;
  }

  init(token) {
    this.bot = new Telegraf(token);
    return this.bot;
  }

  // Send message to specific user
  async sendMessage(chatId, text, extra = {}) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        ...extra
      });
      return true;
    } catch (error) {
      console.error('Telegram send error:', error.message);
      return false;
    }
  }

  // Send message with inline keyboard buttons
  async sendWithButtons(chatId, text, buttons) {
    return this.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  }

  // Send message with reply keyboard (menu)
  async sendWithReplyKeyboard(chatId, text, buttons) {
    return this.sendMessage(chatId, text, {
      reply_markup: {
        keyboard: buttons,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }

  // Remove keyboard
  async removeKeyboard(chatId, text) {
    return this.sendMessage(chatId, text, {
      reply_markup: {
        remove_keyboard: true
      }
    });
  }

  // Get bot instance for event handlers
  getBot() {
    return this.bot;
  }
}

module.exports = new TelegramService();