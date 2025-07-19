// test-group-id.js
const TelegramBot = require('node-telegram-bot-api');

// Bot token'ınızı buraya yazın
const BOT_TOKEN = '7623563807:AAF-x22UGR5xeAVOqLsXbiMEnMtQYuviy-4';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', (msg) => {
  console.log('=== MESAJ BİLGİLERİ ===');
  console.log('Chat ID:', msg.chat.id);
  console.log('Chat Type:', msg.chat.type);
  console.log('Chat Title:', msg.chat.title);
  console.log('Chat Username:', msg.chat.username);
  console.log('========================');
});

console.log('Bot çalışıyor... Grubunuza ekleyin ve mesaj gönderin!');