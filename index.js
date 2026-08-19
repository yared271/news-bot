const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Express Health Check (Render ንቁ ሆኖ እንዲሰራ)
app.get('/', (req, res) => {
  res.send('🤖 Live News Telegram Bot is Active & Running!');
});

// የቦት ቶከን (የቀጥታ ቶከንህ)
const token = (process.env.TELEGRAM_BOT_TOKEN || '8898193372:AAEtB1jieSM030BVShaIy6050C6ATNTrl4w').trim();
console.log('🤖 Starting Telegram Bot with Token...');

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', (err) => {
  console.log('Telegram Polling Log:', err.message);
});

// የቀጥታ ዜና ከ BBC Amharic ማምጫ ፈንክሽን
async function getLiveNews() {
  try {
    const feed = await parser.parseURL('https://feeds.bbci.co.uk/amharic/rss.xml');
    return feed.items.slice(0, 5);
  } catch (e) {
    console.error('RSS Error:', e.message);
    return [];
  }
}

// ለማንኛውም የቴሌግራም መልእክት ፈጣን ምላሽ መስጫ
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim().toLowerCase();
  const userName = msg.from.first_name || 'ተጠቃሚ';

  console.log(`📩 መልእክት ደርሷል ከ ${userName}: ${text}`);

  if (text.includes('start')) {
    const welcome = `👋 ሰላም ${userName}! እንኳን ወደ ዜና ቦት በደህና መጡ።\n\n` +
      `📰 አዳዲስ የሀገር ውስጥ እና የአለም ዜናዎችን ለማግኘት፦\n\n` +
      `👉 /news ወይም "ዜና" ብለው ይጻፉልኝ!`;
    
    bot.sendMessage(chatId, welcome);
  } 
  else if (text.includes('news') || text.includes('ዜና') || text.includes('zena')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ ዜናዎችን ከቀጥታ ምንጮች እየሰበሰብኩ ነው...');

    const newsItems = await getLiveNews();

    if (newsItems.length === 0) {
      bot.sendMessage(chatId, '❌ ዜናዎችን ማምጣት አልተቻለም፤ እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።');
      return;
    }

    for (let item of newsItems) {
      const msgText = `🚨 *${item.title}*\n\n` +
        `📝 ${item.contentSnippet || item.content || ''}\n\n` +
        `📅 *ቀን:* ${item.pubDate || 'ዛሬ'}\n` +
        `🔗 [ሙሉውን ዜና ለማንበብ ይጫኑ](${item.link})`;

      await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
    }
  } 
  else {
    bot.sendMessage(chatId, `ሰላም ${userName}! ዜናዎችን ለማግኘት 👉 /news ብለው ይላኩ።`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 News Bot Server running on port ${PORT}`);
});
