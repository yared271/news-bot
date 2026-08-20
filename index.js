const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const https = require('https');

const app = express();
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

// 2. እውነተኛ የዛሬ የቀጥታ የስፖርት ትንተና እና ዜና ማምጫዎች (Live Real-Time Feeds)
const liveSources = [
  // የቀጥታ የስፖርት እና የእግር ኳስ ትንተና በአማርኛ
  {
    url: 'https://news.google.com/rss/search?q=%E1%88%B5%E1%8D%8E%E1%88%AD%E1%89%85+OR+%E1%8D%95%E1%88%AD%E1%88%9A%E1%8B%A8%E1%88%AD+%E1%88%8A%E1%8B%9D+OR+%E1%8A%A5%E1%8C%8D%E1%88%8D+%E1%8A%B3%E1%88%B5&hl=am&gl=ET&ceid=ET:am',
    type: 'sport'
  },
  // BBC Amharic የቀጥታ ዜና
  {
    url: 'https://feeds.bbci.co.uk/amharic/rss.xml',
    type: 'general'
  },
  // DW Amharic የቀጥታ ዜና
  {
    url: 'https://rss.dw.com/rdf/rss-amh-news',
    type: 'general'
  }
];

async function fetchLiveFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    return [];
  }
}

// 🚀 የዛሬ ትኩስ የስፖርት ትንተና እና ዜናዎችን ብቻ በራሱ የሚልክ ፈንክሽን
async function broadcastTodayFreshNews() {
  if (subscribers.size === 0) return;

  console.log('🔍 ዛሬ የወጡ ትኩስ የስፖርት እና የዜና መረጃዎችን እየፈተሸ ነው...');

  for (let source of liveSources) {
    const items = await fetchLiveFeed(source.url);

    for (let item of items.slice(0, 4)) {
      if (item.link && !sentArticles.has(item.link)) {
        sentArticles.add(item.link);

        const title = item.title || '';
        const isSport = source.type === 'sport' || 
                        title.includes('ስፖርት') || 
                        title.includes('ሊግ') || 
                        title.includes('ኳስ') || 
                        title.includes('አርሰናል') || 
                        ti
