const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const token = (process.env.TELEGRAM_BOT_TOKEN || '8898193372:AAEtB1jieSM030BVShaIy6050C6ATNTrl4w').trim();
const bot = new TelegramBot(token);

const APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://news-bot-v01x.onrender.com';

bot.setWebHook(`${APP_URL}/api/telegram-webhook`).then(() => {
  console.log(`✅ Webhook connected: ${APP_URL}/api/telegram-webhook`);
}).catch(err => console.log('Webhook note:', err.message));

app.post('/api/telegram-webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ተመዝጋቢዎች እና የተላኩ ዜናዎች ማከማቻ (Auto-Broadcast System)
const subscribers = new Set();
const sentArticles = new Set();

async function fetchNews(rssUrl, count = 4) {
  try {
    const feed = await parser.parseURL(rssUrl);
    return feed.items.slice(0, count);
  } catch (error) {
    console.error('Error fetching RSS:', error.message);
    return [];
  }
}

// 🚀 በራሱ ጊዜ (Automatically) የስፖርት እና ሰበር ዜና የሚልክ ፈንክሽን
async function autoBroadcastSportsAndNews() {
  console.log('🔄 Checking for new Sports & Breaking news...');
  if (subscribers.size === 0) return;

  // 1. አዳዲስ የስፖርት ዜናዎችን መፈተሽ (Sports Auto-Send)
  const sports = await fetchNews('https://feeds.bbci.co.uk/sport/football/rss.xml', 2);
  for (let s of sports) {
    if (s.link && !sentArticles.has(s.link)) {
      sentArticles.add(s.link);
      const msg = `⚽ *አዲስ የስፖርት ዜና (Sport Update)*\n\n` +
        `📌 *${s.title}*\n\n` +
        `📝 ${s.contentSnippet || ''}\n\n` +
        `📅 *ቀን:* ${s.pubDate || 'አሁን'}\n` +
        `🔗 [ሙሉውን ያንብቡ](${s.link})`;

      for (let chatId of subscribers) {
        try {
          await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } catch (_) {}
      }
    }
  }

  // 2. አዳዲስ አጠቃላይ ሰበር ዜናዎችን መፈተሽ
  const general = await fetchNews('https://feeds.bbci.co.uk/amharic/rss.xml', 2);
  for (let g of general) {
    if (g.link && !sentArticles.has(g.link)) {
      sentArticles.add(g.link);
      const msg = `🚨 *ሰበር ዜና (Breaking News)*\n\n` +
        `📌 *${g.title}*\n\n` +
        `📝 ${g.contentSnippet || ''}\n\n` +
        `📅 *ቀን:* ${g.pubDate || 'አሁን'}\n` +
        `🔗 [ሙሉውን ያንብቡ](${g.link})`;

      for (let chatId of subscribers) {
        try {
          await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } catch (_) {}
      }
    }
  }
}

// በየ 5 ደቂቃው አዳዲስ የስፖርት እና ሰበር ዜናዎችን በራሱ ጊዜ ይልካል (Auto-Timer)
setInterval(autoBroadcastSportsAndNews, 5 * 60 * 1000);

const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏆 የስፖርት ሊጎች እና ውጤቶች (Leagues)' }, { text: '⚽ አጠቃላይ ስፖርት' }],
      [{ text: '📰 አጠቃላይ ዜና (BBC)' }, { text: '🔔 ራስ-ሰር ስፖርት ማሳወቂያ በርቷል ✅' }]
    ],
    resize_keyboard: true
  }
};

const leaguesKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 የእንግሊዝ ፕሪሚየር ሊግ (EPL)' }, { text: '🇪🇸 የስፔን ላሊጋ (La Liga)' }],
      [{ text: '🏆 ቻምፒየንስ ሊግ (UCL)' }, { text: '🇪🇹 የኢትዮጵያ ፕሪሚየር ሊግ' }],
      [{ text: '🔙 ወደ ዋናው ምናሌ ተመለስ' }]
    ],
    resize_keyboard: true
  }
};

const leagueInfo = {
  epl: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 *የእንግሊዝ ፕሪሚየር ሊግ (Premier League)*\n\n" +
       "📊 *የደረጃ ሰንጠረዥ አናት:*\n" +
       "1️⃣ ማንቸስተር ሲቲ (Man City)\n" +
       "2️⃣ አርሰናል (Arsenal)\n" +
       "3️⃣ ሊቨርፑል (Liverpool)\n" +
       "4️⃣ አስቶን ቪላ (Aston Villa)\n\n" +
       "⚽ *ተጠባቂ ጨዋታዎች:* ማንቸስተር ዩናይትድ 🆚 ሊቨርፑል | አርሰናል 🆚 ቶተንሃም",

  laliga: "🇪🇸 *የስፔን ላሊጋ (La Liga)*\n\n" +
          "📊 *የደረጃ ሰንጠረዥ አናት:*\n" +
          "1️⃣ ሪያል ማድሪድ (Real Madrid)\n" +
          "2️⃣ ባርሴሎና (Barcelona)\n" +
          "3️⃣ አትሌቲኮ ማድሪድ (Atlético Madrid)\n" +
          "4️⃣ ጂሮና (Girona)",

  ucl: "🏆 *የአውሮፓ ቻምፒየንስ ሊግ (UEFA Champions League)*\n\n" +
       "🌟 *የዘንድሮው አዲሱ የሊግ ፎርማት (League Phase):*\n" +
       "• 36 ታላላቅ የአውሮፓ ክለቦች በአንድ ትልቅ ሊግ ውስጥ ይወዳደራሉ\n" +
       "• ከፍተኛ ነጥብ ያገኙ 8 ቡድኖች በቀጥታ ወደ 16ቱ ጥሎ ማለፍ ያልፋሉ!",

  ethio: "🇪🇹 *የኢትዮጵያ ፕሪሚየር ሊግ (Ethiopian Premier League)*\n\n" +
         "📊 *የሊጉ ተፎካካሪ ክለቦች:*\n" +
         "• ቅዱስ ጊዮርጊስ (St. George)\n" +
         "• ፋሲል ከነማ (Fasil Kenema)\n" +
         "• ሲዳማ ቡና (Sidama Coffee)\n" +
         "• ኢትዮጵያ ቡና (Ethiopia Bunna)"
};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const userName = msg.from.first_name || 'ወዳጄ';

  // ተጠቃሚውን ወደ አውቶማቲክ ዜና ተቀባይነት መመዝገብ
  subscribers.add(chatId);

  if (text === '/start' || text.toLowerCase().includes('start')) {
    const welcome = `👋 ሰላም ${userName}! እንኳን ወደ ዜና እና ስፖርት ቦት በደህና መጡ።\n\n` +
      `🔔 *ራስ-ሰር የስፖርት እና ሰበር ዜና ማሳወቂያ በርቷል!* አዳዲስ ዜናዎች ሲወጡ ምንም ሳትነኩ በራሱ ጊዜ ይደርሳችኋል!\n\n` +
      `ወዲያውኑ መረጃ ለማግኘት ከታች ካሉት አዝራሮች መምረጥ ትችላላችሁ 👇`;
    
    bot.sendMessage(chatId, welcome, mainMenuKeyboard);
    // ወዲያውኑ ወቅታዊ ዜናዎችን መላክ
    autoBroadcastSportsAndNews();
  } 
  else if (text.includes('ሊጎች') || text.toLowerCase().includes('league')) {
    bot.sendMessage(chatId, '🏆 የሚፈልጉትን የስፖርት ሊግ ይምረጡ 👇', leaguesKeyboard);
  }
  else if (text.includes('እንግሊዝ') || text.includes('EPL')) {
    await bot.sendMessage(chatId, leagueInfo.epl, { parse_mode: 'Markdown' });
  }
  else if (text.includes('ላሊጋ') || text.includes('La Liga')) {
    bot.sendMessage(chatId, leagueInfo.laliga, { parse_mode: 'Markdown' });
  }
  else if (text.includes('ቻምፒየንስ') || text.includes('UCL')) {
    bot.sendMessage(chatId, leagueInfo.ucl, { parse_mode: 'Markdown' });
  }
  else if (text.includes('ኢትዮጵያ')) {
    bot.sendMessage(chatId, leagueInfo.ethio, { parse_mode: 'Markdown' });
  }
  else if (text.includes('ተመለስ') || text.includes('ዋናው')) {
    bot.sendMessage(chatId, 'ወደ ዋናው ምናሌ ተመልሰዋል 👇', mainMenuKeyboard);
  }
  else if (text.includes('ስፖርት') || text.toLowerCase().includes('sport')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ የስፖርት ዜናዎችን እያዘጋጀሁ ነው...');
    const sports = await fetchNews('https://feeds.bbci.co.uk/sport/football/rss.xml', 3);
    for (let s of sports) {
      await bot.sendMessage(chatId, `⚽ *${s.title}*\n\n📝 ${s.contentSnippet || ''}\n\n🔗 [ሙሉውን ያንብቡ](${s.link})`, { parse_mode: 'Markdown' });
    }
  } 
  else if (text.includes('አጠቃላይ') || text.includes('ዜና') || text.toLowerCase().includes('news')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ የቀጥታ ዜናዎችን ከ BBC Am
