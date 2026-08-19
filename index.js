const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. ዋና ገጽ
app.get('/', (req, res) => {
  res.send('📰 News Bot Server is Live and Running!');
});

// 2. የዜና API Endpoint
app.get('/api/news', (req, res) => {
  res.json([
    {
      id: 1,
      title: 'TikTak Platform Launched Successfully! 🚀',
      category: 'Technology',
      date: new Date()
    },
    {
      id: 2,
      title: 'Ethiopia Tech News: AI and Mobile Innovations',
      category: 'Local News',
      date: new Date()
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`🚀 News Bot Server running on port ${PORT}`);
});
