const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// የቦት ቶከን እና Webhook
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

// ዜና ማምጫ ፈንክሽን
async function fetchNews(rssUrl, count = 4) {
  try {
    const feed = await parser.parseURL(rssUrl);
    return feed.items.slice(0, count);
  } catch (error) {
    console.error('Error fetching RSS:', error.message);
    return [];
  }
}

// 1. ዋናው ምናሌ (Main Menu)
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🏆 የስፖርት ሊጎች እና ውጤቶች (Leagues)' }, { text: '⚽ አጠቃላይ ስፖርት' }],
      [{ text: '📰 አጠቃላይ ዜና (BBC)' }, { text: '💻 ቴክኖሎጂ ዜና' }]
    ],
    resize_keyboard: true
  }
};

// 2. የስፖርት ሊጎች ንዑስ ምናሌ (Leagues Menu)
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

// 3. የሊጎች የደረጃ እና የዜና መረጃዎች
const leagueInfo = {
  epl: `🏴󠁧󠁢󠁥󠁮󠁧󠁿 *የእንግሊዝ ፕሪሚየር ሊግ (Premier League)*\n\n` +
       `📊 *የደረጃ ሰንጠረዥ አናት (Top Standings):*\n` +
       `1️⃣ ማንቸስተር ሲቲ (Man City)\n` +
       `2️⃣ አርሰናል (Arsenal)\n` +
       `3️⃣ ሊቨርፑል (Liverpool)\n` +
       `4️⃣ አስቶን ቪላ (Aston Villa)\n\n` +
       `⚽ *ተጠባቂ ጨዋታዎች:* ማንቸስተር ዩናይትድ 🆚 ሊቨርፑል | አርሰናል 🆚 ቶተንሃም`,

  laliga: `🇪🇸 *የስፔን ላሊጋ (La Liga)*\n\n` +
          `📊 *የደረጃ ሰንጠረዥ አናት:*\n` +
          `1️⃣ ሪያል ማድሪድ (Real Madrid)\n` +
          `2️⃣ ባርሴሎና (Barcelona)\n` +
          `3️⃣ አትሌቲኮ ማድሪድ (Atlético Madrid)\n` +
          `4️⃣ ጂሮና (Girona)\n\n` +
          `🔥 *ኤል ክላሲኮ (El Clásico):* ሪያል ማድሪድ 🆚 ባርሴሎና`,

  ucl: `🏆 *የአውሮፓ ቻምፒየንስ ሊግ (UEFA Champions League)*\n\n` +
       `🌟 *የዘንድሮው አዲሱ የሊግ ፎርማት (League Phase):*\n` +
       `• 36 ታላላቅ የአውሮፓ ክለቦች በአንድ ትልቅ ሊግ ውስጥ ይወዳደራሉ\n` +
       `• ከፍተኛ ነጥብ ያገኙ 8 ቡድኖች በቀጥታ ወደ 16ቱ ጥሎ ማለፍ ያልፋሉ!\n\n` +
       `⚽ ሪያል ማድሪድ፣ ባየርን ሙኒክ፣ ማን ሲቲ እና ፒኤስጂ ዋነኛ ተፎካካሪዎች ናቸው።`,

  ethio: `🇪🇹 *የኢትዮጵያ ፕሪሚየር ሊግ (Ethiopian Premier League)*\n\n` +
         `📊 *የሊጉ ተፎካካሪ ክለቦች:*\n` +
         `• ቅዱስ ጊዮርጊስ (St. George)\n` +
         `• ፋሲል ከነማ (Fasil Kenema)\n` +
         `• ሲዳማ ቡና (Sidama Coffee)\n` +
         `• ባህር ዳር ከተማ (Bahir Dar City)\n` +
         `• ኢትዮጵያ ቡና (Ethiopia Bunna)\n\n` +
         `🏟️ *የጨዋታዎች አስተላላፊ:* DSTV & SuperSport Variety 4`
};

// 4. የመልእክት አቀባበል እና ምላሽ መስጫ
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const userName = msg.from.first_name || 'ወዳጄ';

  console.log(`📩 መልእክት ደርሷል ከ ${userName}: ${text}`);

  if (text === '/start' || text.toLowerCase().includes('start')) {
    const welcome = `👋 ሰላም ${userName}! እንኳን ወደ ዜና እና ስፖርት ሊግ ቦት በደህና መጡ።\n\n` +
      `ከታች ያሉትን አዝራሮች (Buttons) በመጫን የሚፈልጉትን መረጃ ይምረጡ 👇`;
    bot.sendMessage(chatId, welcome, mainMenuKeyboard);
  } 
  // ወደ ሊጎች ምናሌ መግቢያ
  else if (text.includes('ሊጎች') || text.toLowerCase().includes('league')) {
    bot.sendMessage(chatId, '🏆 የሚፈልጉትን የስፖርት ሊግ ይምረጡ 👇', leaguesKeyboard);
  }
  // የእንግሊዝ ፕሪሚየር ሊግ
  else if (text.includes('እንግሊዝ') || text.includes('EPL')) {
    await bot.sendMessage(chatId, leagueInfo.epl, { parse_mode: 'Markdown' });
    const news = await fetchNews('https://feeds.bbci.co.uk/sport/football/rss.xml', 2);
    for (let n of news) {
      bot.sendMessage(chatId, `⚽ *${n.title}*\n\n🔗 [ሙሉውን ያንብቡ](${n.link})`, { parse_mode: 'Markdown' });
    }
  }
  // የስፔን ላሊጋ
  else if (text.includes('ላሊጋ') || text.includes('La Liga')) {
    bot.sendMessage(chatId, leagueInfo.laliga, { parse_mode: 'Markdown' });
  }
  // ቻምፒየንስ ሊግ
  else if (text.includes('ቻምፒየንስ') || text.includes('UCL')) {
    bot.sendMessage(chatId, leagueInfo.ucl, { parse_mode: 'Markdown' });
  }
  // የኢትዮጵያ ፕሪሚየር ሊግ
  else if (text.includes('ኢትዮጵያ')) {
    bot.sendMessage(chatId, leagueInfo.ethio, { parse_mode: 'Markdown' });
  }
  // ወደ ዋናው ምናሌ መመለሻ
  else if (text.includes('ተመለስ') || text.includes('ዋናው')) {
    bot.sendMessage(chatId, 'ወደ ዋናው ምናሌ ተመልሰዋል 👇', mainMenuKeyboard);
  }
  // አጠቃላይ ስፖርት
  else if (text.includes('ስፖርት') || text.toLowerCase().includes('sport')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ የስፖርት ዜናዎችን እያዘጋጀሁ ነው...');
    const sports = await fetchNews('https://feeds.bbci.co.uk/sport/rss.xml', 3);
    for (let s of sports) {
      await bot.sendMessage(chatId, `⚽ *${s.title}*\n\n📝 ${s.contentSnippet || ''}\n\n🔗 [ሙሉውን ያንብቡ](${s.link})`, { parse_mode: 'Markdown' });
    }
  }
  // አጠቃላይ ዜና
  else if (text.includes('አጠቃላይ') || text.includes('ዜና') || text.toLowerCase().includes('news')) {
    bot.sendMessage(chatId, '⏳ አዳዲስ የቀጥታ ዜናዎችን ከ BBC Amharic እየሰበሰብኩ ነው...');
    const newsItems = await fetchNews('https://feeds.bbci.co.uk/amharic/rss.xml', 3);
    for (let item of newsItems) {
      await bot.sendMessage(chatId, `🚨 *${item.title}*\n\n📝 ${item.contentSnippet || ''}\n\n🔗 [ሙሉውን ያንብቡ](${item.link})`, { parse_mode: 'Markdown' });
    }
  }
  else {
    bot.sendMessage(chatId, `ከታች ካሉት አማራጮች አንዱን ይምረጡ 👇`, mainMenuKeyboard);
  }
});

app.get('/', (req, res) => {
  res.send('🏆 Live Sports League & News Telegram Bot is Active!');
});

app.listen(PORT, () => {
  console.log(`🚀 Sports League & News Server running on port ${PORT}`);
});
