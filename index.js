const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('🤖 Live News Telegram Bot with Buttons is Active!');
});

const token = (process.env.TELEGRAM_BOT_TOKEN || '8898193372:AAEtB1jieSM030BVShaIy6050C6ATNTrl4w').trim();
const bot = new TelegramBot(token, { polling: true });

// ዜና ማምጫ ፈንክሽን
async function fetchNews(rssUrl, count = 4) {
  try {
    const feed = await parser.parseURL(rssUrl);
    return feed.items.slice(0, count);
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

// ዋናው ምናሌ (Main Menu Keyboard)
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📰 አጠቃላይ ዜና (BBC)' }, { text: '⚽ ስፖርት ዜና (Sport)' }],
      [{ text: '💻 ቴክኖሎጂ ዜና' }, { text: '🌍 የአለም ዜና' }]
    ],
    resize_keyboard: true
  }
};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const userName = msg.from.first_name || 'ወዳጄ';

  console.log(`📩 መልእክት ደርሷል ከ ${userName}: ${text}`);

  if (text === '/start' || text.toLowerCase().includes('start')) {
    const welcome = `👋 ሰላም ${userName}! እንኳን ወደ ዜና ቦት በደህና መጡ።\n\n` +
      `ከታች ያሉትን አዝራሮች (Buttons) በመጫን የሚፈልጉትን የዜና ዘርፍ ይምረጡ 👇`;
    
    bot.sendMessage(chatId, welcome, mainMenuKeyboard);
  } 
  else if (text.includes('ስፖርት') || text.toLowerCase().includes('sport')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ የስፖርት ዜናዎችን እያዘጋጀሁ ነው...');
    const sports = await fetchNews('https://feeds.bbci.co.uk/sport/rss.xml');

    if (sports.length === 0) {
      bot.sendMessage(chatId, '❌ የስፖርት ዜናዎችን ማግኘት አልተቻለም፤ እባክዎ ትንሽ ቆይተው ይሞክሩ።');
      return;
    }

    for (let s of sports) {
      const msgText = `⚽ *${s.title}*\n\n` +
        `📝 ${s.contentSnippet || ''}\n\n` +
        `🔗 [ሙሉውን ዜና ለማንበብ ይጫኑ](${s.link})`;

      await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
    }
  } 
  else if (text.includes('አጠቃላይ') || text.includes('ዜና') || text.toLowerCase().includes('news')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ የቀጥታ ዜናዎችን ከ BBC Amharic እየሰበሰብኩ ነው...');
    const newsItems = await fetchNews('https://feeds.bbci.co.uk/amharic/rss.xml');

    for (let item of newsItems) {
      const msgText = `🚨 *${item.title}*\n\n` +
        `📝 ${item.contentSnippet || ''}\n\n` +
        `📅 *ቀን:* ${item.pubDate || 'ዛሬ'}\n` +
        `🔗 [ሙሉውን ለማንበብ ይጫኑ](${item.link})`;

      await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
    }
  }
  else {
    bot.sendMessage(chatId, `ከታች ካሉት አማራጮች አንዱን ይምረጡ 👇`, mainMenuKeyboard);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 News Bot Server running on port ${PORT}`);
});
