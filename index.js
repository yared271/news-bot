const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const https = require('https');

const app = express();
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  timeout: 10000
});

const PORT = process.env.PORT || 3000;
app.use(express.json());

// 🔑 አዲሱ ቦት ቶከን ተተክቷል
const token = (process.env.TELEGRAM_BOT_TOKEN || '8633380352:AAE1wkQU1Sejn4j6XfbPd33iMxWQ7C9VMn4').trim();
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

// 2. ፈጣን የእንግሊዝ ፕሪሚየር ሊግ እና የስፖርት ዜና ምንጮች
const feeds = [
  { name: 'SkySports Premier League', url: 'https://www.skysports.com/rss/11095', type: 'sport' },
  { name: 'BBC Football', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', type: 'sport' },
  { name: 'Guardian Premier League', url: 'https://www.theguardian.com/football/premierleague/rss', type: 'sport' },
  { name: 'talkSPORT Premier League', url: 'https://talksport.com/football/premier-league/feed/', type: 'sport' },
  { name: 'BBC Amharic Sport', url: 'https://feeds.bbci.co.uk/amharic/rss.xml', type: 'amharic' }
];

// 🌐 ማንኛውንም የእንግሊዝኛ ዜና ወደ አማርኛ በነጻ የሚቀይር ፈንክሽን
async function translateToAmharic(text) {
  if (!text) return '';
  // ፅሁፉ ቀድሞውኑ አማርኛ ከሆነ እንዳለ ይተወዋል
  if (/[\u1200-\u137F]/.test(text)) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=am&dt=t&q=${encodeURIComponent(text.substring(0, 1500))}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
  } catch (err) {
    console.error('Translation error:', err.message);
  }
  return text;
}

async function fetchFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    console.error('Fetch error:', error.message);
    return [];
  }
}

// 🚀 የዜና ፅሁፍ አዘጋጅቶ በአማርኛ ማስተላለፊያ
async function formatAndSendNews(chatId, item, sourceName) {
  const rawTitle = item.title || '';
  const rawDesc = item.contentSnippet || item.content || item.summary || '';

  // ወደ አማርኛ መተርጎም
  const titleAm = await translateToAmharic(rawTitle);
  const descAm = await translateToAmharic(rawDesc.slice(0, 300));

  const messageText = 
    `⚽ <b>የቀጥታ ስፖርት ዜና (ፕሪሚየር ሊግ)</b>\n\n` +
    `📌 <b>${titleAm}</b>\n\n` +
    `📝 ${descAm}...\n\n` +
    `📡 ምንጭ: ${sourceName}\n` +
    `🔗 <a href="${item.link}">ሙሉ መረጃውን ለማንበብ ይጫኑ</a>`;

  try {
    await bot.sendMessage(chatId, messageText, { parse_mode: 'HTML', disable_web_page_preview: false });
    sentArticles.add(item.link);
  } catch (err) {
    console.error('Send error:', err.message);
  }
}

// 🚀 ተጠቃሚው ሲጀምር ወዲያውኑ የዛሬ አዳዲስ ዜናዎችን መላክ
async function sendLiveNewsDirectly(chatId) {
  for (let f of feeds) {
    const items = await fetchFeed(f.url);
    for (let item of items.slice(0, 3)) {
      await formatAndSendNews(chatId, item, f.name);
    }
  }
}

// ⏰ በየ 1 ደቂቃው አዳዲስ የፕሪሚየር ሊግ ዜናዎች እንደወጡ በራሱ የሚልክ (ቀን ከ 20-30 በላይ)
async function autoBroadcastNewOnly() {
  if (subscribers.size === 0) return;

  for (let f of feeds) {
    const items = await fetchFeed(f.url);
    for (let item of items.slice(0, 5)) {
      if (item.link && !sentArticles.has(item.link)) {
        sentArticles.add(item.link);

        // ሚሞሪ እንዳይሞላ የቆዩትን ማጽዳት
        if (sentArticles.size > 2000) {
          const arr = Array.from(sentArticles);
          arr.slice(0, 500).forEach(link => sentArticles.delete(link));
        }

        for (let chatId of subscribers) {
          await formatAndSendNews(chatId, item, f.name);
        }
      }
    }
  }
}

// በየ 1 ደቂቃው ቼክ ያደርጋል
setInterval(autoBroadcastNewOnly, 1 * 60 * 1000);

// ሰርቨሩ Render ላይ እንዳይተኛ በየ 5 ደቂቃው ራሱን የሚቀሰቅስ (Keep-Alive)
setInterval(() => {
  https.get(`${APP_URL}/ping`, () => {}).on('error', () => {});
}, 5 * 60 * 1000);

app.get('/ping', (req, res) => res.send('Awake'));

// ተጠቃሚው Bot ሲጀምር
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'ወዳጄ';

  if (!subscribers.has(chatId)) {
    subscribers.add(chatId);
    const welcome = 
      `👋 ሰላም ${userName}!\n\n` +
      `⚽ የእንግሊዝ ፕሪሚየር ሊግ እና የስፖርት ዜናዎችን በቀጥታ በአማርኛ ማግኘት ጀምረዋል...\n\n` +
      `🔄 የቅርብ ጊዜ ዜናዎችን እያዘጋጀሁ ነው 👇`;

    await bot.sendMessage(chatId, welcome);
    await sendLiveNewsDirectly(chatId);
  }
});

app.get('/', (req, res) => {
  res.send('⚡ Premier League & Sports News Bot is Running in Amharic!');
});

app.listen(PORT, () => {
  console.log(`🚀 Sports News Bot running on port ${PORT}`);
});
