const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const https = require('https');

const app = express();
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
});
const PORT = process.env.PORT || 3000;

app.use(express.json());

const token = (process.env.TELEGRAM_BOT_TOKEN || '8898193372:AAEtB1jieSM030BVShaIy6050C6ATNTrl4w').trim();
const bot = new TelegramBot(token);

const APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://news-bot-v01x.onrender.com';

// 1. Webhook ማገናኘት
bot.setWebHook(`${APP_URL}/api/telegram-webhook`).then(() => {
  console.log(`✅ Webhook active: ${APP_URL}/api/telegram-webhook`);
}).catch(err => console.log('Webhook note:', err.message));

app.post('/api/telegram-webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const subscribers = new Set();
const sentArticles = new Set();

// 2. እውነተኛ የቀጥታ የስፖርት እና የሰበር ዜና ምንጮች
const feeds = [
  { name: 'BBC Amharic', url: 'https://feeds.bbci.co.uk/amharic/rss.xml', type: 'general' },
  { name: 'BBC Football Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', type: 'sport' },
  { name: 'SkySports Football', url: 'https://www.skysports.com/rss/12040', type: 'sport' }
];

async function fetchFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    console.error('Fetch error:', error.message);
    return [];
  }
}

// 🚀 ለተጠቃሚው ወዲያውኑ የዛሬ ዜናዎችን የመላኪያ ፈንክሽን
async function sendLiveNewsDirectly(chatId) {
  for (let f of feeds) {
    const items = await fetchFeed(f.url);
    for (let item of items.slice(0, 2)) {
      const isSport = f.type === 'sport' || (item.title && (item.title.includes('ስፖርት') || item.title.includes('ሊግ') || item.title.includes('ኳስ')));
      const header = isSport ? '⚽ አዲስ የስፖርት ዜና እና ትንተና' : '🚨 የቀጥታ ሰበር ዜና';

      const messageText = 
        `${header}\n\n` +
        `📌 ርዕስ: ${item.title}\n\n` +
        `📝 ዝርዝር: ${item.contentSnippet || item.content || 'ሙሉውን መረጃ ከስር ባለው ሊንክ ይመልከቱ።'}\n\n` +
        `📅 ምንጭ: ${f.name} (${item.pubDate || 'ዛሬ'})\n\n` +
        `🔗 ሙሉ ዜናውን ለማንበብ ሊንኩን ይጫኑ:\n${item.link}`;

      try {
        await bot.sendMessage(chatId, messageText);
        sentArticles.add(item.link);
      } catch (err) {
        console.error('Send error:', err.message);
      }
    }
  }
}

// በየ 2 ደቂቃው አዳዲስ ዜናዎችን ብቻ በራሱ የሚልክ (Auto-Broadcast)
async function autoBroadcastNewOnly() {
  if (subscribers.size === 0) return;

  for (let f of feeds) {
    const items = await fetchFeed(f.url);
    for (let item of items.slice(0, 2)) {
      if (item.link && !sentArticles.has(item.link)) {
        sentArticles.add(item.link);

        const isSport = f.type === 'sport' || (item.title && (item.title.includes('ስፖርት') || item.title.includes('ሊግ') || item.title.includes('ኳስ')));
        const header = isSport ? '⚽ አዲስ የስፖርት ዜና እና ትንተና' : '🚨 የቀጥታ ሰበር ዜና';

        const messageText = 
          `${header}\n\n` +
          `📌 ርዕስ: ${item.title}\n\n` +
          `📝 ዝርዝር: ${item.contentSnippet || item.content || 'ሙሉውን መረጃ ከስር ባለው ሊንክ ይመልከቱ።'}\n\n` +
          `📅 ምንጭ: ${f.name} (${item.pubDate || 'አሁን'})\n\n` +
          `🔗 ሙሉ ዜናውን ለማንበብ:\n${item.link}`;

        for (let chatId of subscribers) {
          try {
            await bot.sendMessage(chatId, messageText);
          } catch (err) {
            console.error('Broadcast error:', err.message);
          }
        }
      }
    }
  }
}

setInterval(autoBroadcastNewOnly, 2 * 60 * 1000);

// ሰርቨሩ እንዳይተኛ በየ 8 ደቂቃው ራሱን የሚቀሰቅስ (Keep-Alive)
setInterval(() => {
  https.get(`${APP_URL}/ping`, () => {}).on('error', () => {});
}, 8 * 60 * 1000);

app.get('/ping', (req, res) => res.send('Awake'));

// ተጠቃሚው መልእክት ሲልክ ወዲያውኑ ዜና ይልክለታል
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'ወዳጄ';

  subscribers.add(chatId);

  const welcome = 
    `👋 ሰላም ${userName}!\n\n` +
    `⚽ የዛሬ የቀጥታ የስፖርት እና ሰበር ዜናዎችን አሁኑኑ እያመጣሁልዎ ነው... 👇`;

  await bot.sendMessage(chatId, welcome);
  
  // 🔥 ያለምንም መዘግየት ወዲያውኑ ዜናዎችን ወደ ቴሌግራምህ መላክ
  await sendLiveNewsDirectly(chatId);
});

app.get('/', (req, res) => {
  res.send('⚡ Real-time News Bot is Active & Ready!');
});

app.listen(PORT, () => {
  console.log(`🚀 Sports & News Server running on port ${PORT}`);
});
