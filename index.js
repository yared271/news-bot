const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const https = require('https');

const app = express();
const parser = new Parser();
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

// 2. በአማርኛ ቋንቋ የቀጥታ የስፖርት ሊጎች እና ዜና ማምጫ (Amharic Sports & News Feeds)
const amharicSportsFeeds = [
  // የኢትዮጵያ እና አለም አቀፍ ስፖርት ዜናዎች በአማርኛ
  'https://news.google.com/rss/search?q=%E1%88%B5%E1%8D%8E%E1%88%AD%E1%89%85+OR+%E1%8D%95%E1%88%AD%E1%88%9A%E1%8B%A8%E1%88%AD+%E1%88%8A%E1%8B%9D+OR+%E1%8A%A5%E1%8C%8D%E1%88%8D+%E1%8A%B3%E1%88%B5&hl=am&gl=ET&ceid=ET:am',
  // BBC Amharic የቀጥታ ዜና
  'https://feeds.bbci.co.uk/amharic/rss.xml'
];

async function fetchFeed(url, count = 3) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, count);
  } catch (error) {
    return [];
  }
}

// 🚀 በየ 1 ደቂቃው (ቶሎ ቶሎ) በአማርኛ የስፖርት እና ሰበር ዜና የሚልክ ፈንክሽን
async function runFastAmharicSportsBroadcaster() {
  if (subscribers.size === 0) return;

  for (let feedUrl of amharicSportsFeeds) {
    const items = await fetchFeed(feedUrl, 3);

    for (let item of items) {
      if (item.link && !sentArticles.has(item.link)) {
        sentArticles.add(item.link);

        const isSport = item.title.includes('ስፖርት') || item.title.includes('ሊግ') || item.title.includes('ኳስ') || item.title.includes('ዋንጫ') || item.title.includes('ክለብ');

        const header = isSport ? '⚽ *አዲስ የስፖርት ዜና (በአማርኛ)*' : '🚨 *ሰበር ዜና (Breaking News)*';

        const messageText = `${header}\n\n` +
          `📌 *${item.title}*\n\n` +
          `📝 ${item.contentSnippet || item.content || ''}\n\n` +
          `📅 *ቀን:* ${item.pubDate || 'አሁን የተለቀቀ'}\n` +
          `🔗 [ሙሉውን ዜና ለማንበብ ይጫኑ](${item.link})`;

        for (let chatId of subscribers) {
          try {
            await bot.sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
          } catch (_) {}
        }
      }
    }
  }
}

// ⚡ በየ 1 ደቂቃው በከፍተኛ ፍጥነት ይፈትሻል (Runs every 1 minute)
setInterval(runFastAmharicSportsBroadcaster, 60 * 1000);

// ሰርቨሩ 24/7 ነቅቶ እንዲቆይ በየ 8 ደቂቃው ራሱን የሚቀሰቅስ (Keep-Alive)
setInterval(() => {
  https.get(`${APP_URL}/ping`, () => {}).on('error', () => {});
}, 8 * 60 * 1000);

app.get('/ping', (req, res) => res.send('Awake'));

// ተጠቃሚው ሲገባ
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'ወዳጄ';

  subscribers.add(chatId);

  const welcome = `👋 ሰላም ${userName}!\n\n` +
    `⚡ *የስፖርት ሊጎች እና ሰበር ዜናዎች ማሳወቂያ በከፍተኛ ፍጥነት በርቷል!*\n\n` +
    `ከዚህ በኋላ የእንግሊዝ ፕሪሚየር ሊግ፣ ቻምፒየንስ ሊግ፣ የስፔን ላሊጋ እና የሀገር ውስጥ ስፖርት ዜናዎች **በአማርኛ ቋንቋ በየደቂቃው በራሱ ጊዜ** ወደ ቴ
