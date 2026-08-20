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

// ተመዝጋቢዎች እና የተላኩ ዜናዎች ማከማቻ
const subscribers = new Set();
const sentArticles = new Set();

async function fetchFeed(url, count = 3) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, count);
  } catch (error) {
    return [];
  }
}

// 🚀 24/7 አውቶማቲክ የስፖርት እና ሰበር ዜና ላኪ (Auto-Push Engine)
async function runAutoBroadcaster() {
  console.log('🔄 አዳዲስ የስፖርት እና ሰበር ዜናዎች በራስ-ሰር እየተፈተሹ ነው...');

  if (subscribers.size === 0) return;

  // 1. የስፖርት ዜናዎችን መፈተሽ እና መላክ (Sports News)
  const sports = await fetchFeed('https://feeds.bbci.co.uk/sport/football/rss.xml', 2);
  for (let s of sports) {
    if (s.link && !sentArticles.has(s.link)) {
      sentArticles.add(s.link);
      const msg = `⚽ *አዲስ የስፖርት ዜና (Live Sport)*\n\n` +
        `📌 *${s.title}*\n\n` +
        `📝 ${s.contentSnippet || ''}\n\n` +
        `📅 *ቀን:* ${s.pubDate || 'አሁን'}\n` +
        `🔗 [ሙሉውን ዜና ለማንበብ ይጫኑ](${s.link})`;

      for (let chatId of subscribers) {
        try {
          await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } catch (_) {}
      }
    }
  }

  // 2. አጠቃላይ ሰበር ዜናዎችን መፈተሽ እና መላክ (Breaking News)
  const general = await fetchFeed('https://feeds.bbci.co.uk/amharic/rss.xml', 2);
  for (let g of general) {
    if (g.link && !sentArticles.has(g.link)) {
      sentArticles.add(g.link);
      const msg = `🚨 *ሰበር ዜና (Breaking News)*\n\n` +
        `📌 *${g.title}*\n\n` +
        `📝 ${g.contentSnippet || ''}\n\n` +
        `📅 *ቀን:* ${g.pubDate || 'አሁን'}\n` +
        `🔗 [ሙሉውን ዜና ለማንበብ ይጫኑ](${g.link})`;

      for (let chatId of subscribers) {
        try {
          await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } catch (_) {}
      }
    }
  }
}

// በየ 3 ደቂቃው በራሱ ጊዜ ይመረምራል (Runs every 3 minutes)
setInterval(runAutoBroadcaster, 3 * 60 * 1000);

// ሰርቨሩ ተኝቶ እንዳይዘጋ በየ 10 ደቂቃው ራሱን በራሱ የሚቀሰቅስ (24/7 Keep-Alive Self Ping)
setInterval(() => {
  https.get(`${APP_URL}/ping`, () => {
    console.log('⚡ 24/7 Keep-Alive Ping Sent');
  }).on('error', () => {});
}, 10 * 60 * 1000);

app.get('/ping', (req, res) => res.send('Pong! Server is Awake 24/7'));

// ተጠቃሚው ሲገባ
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'ወዳጄ';

  // ተጠቃሚውን በቀጥታ ዜና እንዲደርሰው መመዝገብ
  subscribers.add(chatId);

  const welcome = `👋 ሰላም ${userName}!\n\n` +
    `✅ *24/7 ራስ-ሰር የዜና ማሳወቂያ ሙሉ በሙሉ በርቷል!*\n\n` +
    `ከዚህ በኋላ እርስዎ ምንም መንካት አይጠበቅብዎትም፤ አዲስ የስፖርትም ሆነ ሰበር ዜና ሲወጣ ቦቱ በራሱ ጊዜ በቀጥታ ስልክዎ ላይ ያመጣልዎታል! ⚽📰🔔`;

  bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
  
  // ወዲያውኑ ወቅታዊ ዜናዎችን መላክ
  runAutoBroadcaster();
});

app.get('/', (req, res) => {
  res.send('🤖 24/7 Automated Sports & News Telegram Bot is Live!');
});

app.listen(PORT, () => {
  console.log(`🚀 Automated Bot Server running on port ${PORT}`);
});
