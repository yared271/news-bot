import time
import requests
import feedparser
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator

# --- የቦት እና ቻት መረጃዎች ---
BOT_TOKEN = "8898193372:AAEtB1jieSM030BVShaIy6050C6ATNTrl4w"
CHAT_ID = "6689699811"

# --- ልዩ ልዩ የዜና እና መረጃ ምንጮች (RSS Feeds) ---
FEEDS = {
    "NEWS": [
        "http://feeds.bbci.co.uk/sport/football/rss.xml",
        "https://www.skysports.com/rss/12040",
        "https://www.goal.com/feeds/en/news"
    ],
    "RESULTS": [
        "http://feeds.bbci.co.uk/sport/football/results/rss.xml"
    ],
    "PREVIEWS_FIXTURES": [
        "http://feeds.bbci.co.uk/sport/football/fixtures/rss.xml"
    ]
}

# ዋና ዋና ክለቦች እና ሊጎች (England, Spain, Germany, France)
LEAGUE_KEYWORDS = [
    "premier league", "arsenal", "chelsea", "liverpool", "manchester city", "manchester united", "tottenham", "newcastle", "aston villa",
    "la liga", "real madrid", "barcelona", "atletico madrid", "girona",
    "bundesliga", "bayern munich", "dortmund", "leverkusen",
    "ligue 1", "psg", "paris saint-germain", "marseille", "monaco"
]

# የተጫዋች ጉዳት እና አሰላለፍ መለያ ቃላት
INJURY_KEYWORDS = ["injury", "injured", "squad", "lineup", "ruled out", "miss", "starts", "benched", "guadat", "doubt", "fitness"]
PREVIEW_KEYWORDS = ["preview", "prediction", "vs", "clash", "face", "tactical", "derby"]

posted_items = set()

def translate_to_amharic(text):
    """ጽሑፉን ወደ አማርኛ መተርጎሚያ"""
    try:
        if not text:
            return ""
        return GoogleTranslator(source='auto', target='am').translate(text)
    except Exception as e:
        return text

def get_high_quality_image(article_url, entry):
    """ከድረ-ገጹ ላይ ዋናውን HD ጥራት ያለው ፎቶ ፈልጎ ማውጫ"""
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        if article_url:
            res = requests.get(article_url, headers=headers, timeout=5)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                og_img = soup.find('meta', property='og:image') or soup.find('meta', attrs={'name': 'twitter:image'})
                if og_img and og_img.get('content'):
                    return og_img['content']
    except Exception:
        pass

    # Backup RSS Image
    if 'media_content' in entry and len(entry.media_content) > 0:
        return entry.media_content[0].get('url')
    if 'enclosures' in entry and len(entry.enclosures) > 0:
        return entry.enclosures[0].get('href')
    if 'media_thumbnail' in entry and len(entry.media_thumbnail) > 0:
        return entry.media_thumbnail[0].get('url')
    return None

def detect_category(title, summary):
    """የመረጃውን አይነት ለይቶ ርዕሱን በአማርኛ ማስተካከያ"""
    combined = (title + " " + summary).lower()
    
    if any(k in combined for k in INJURY_KEYWORDS):
        return "🚑 **የተጫዋቾች ዜና እና ጉዳት (Injuries & Team News)**"
    elif any(k in combined for k in PREVIEW_KEYWORDS):
        return "🧠 **የጨዋታ ቅድመ-ትንተና እና መርሐግብር (Match Preview & Fixture)**"
    else:
        return "🔥 **ትኩስ የእግር ኳስ ዜና (Football News)**"

def send_telegram_post(category_tag, title_am, summary_am, link, image_url=None):
    """ወደ ቴሌግራም ቻናል/ግሩፕ መላኪያ"""
    caption = (
        f"{category_tag}\n\n"
        f"⚽ **{title_am}**\n\n"
        f"📝 {summary_am}\n\n"
        f"🔗 [ሙሉ መረጃውን ለማንበብ]({link})"
    )
    
    if len(caption) > 1024:
        caption = caption[:1020] + "..."

    if image_url:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
        payload = {"chat_id": CHAT_ID, "photo": image_url, "caption": caption, "parse_mode": "Markdown"}
    else:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {"chat_id": CHAT_ID, "text": caption, "parse_mode": "Markdown", "disable_web_page_preview": False}

    try:
        r = requests.post(url, json=payload, timeout=10)
        return r.json().get("ok", False)
    except Exception as e:
        print(f"Telegram Error: {e}")
        return False

def is_league_match(text):
    text_lower = text.lower()
    return any(k in text_lower for k in LEAGUE_KEYWORDS)

def run_master_bot():
    print("🔄 አዳዲስ ዜናዎች፣ ውጤቶች፣ ትንተናዎች እና ጉዳቶች እየተፈለጉ ነው...")
    
    # 1. ዜናዎች፣ ትንተናዎች፣ የተጫዋቾች ጉዳት መፈተሽ
    for category_type, feed_list in FEEDS.items():
        for feed_url in feed_list:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:8]:
                    item_id = entry.get('id', entry.get('link'))
                    title_en = entry.get('title', '')
                    summary_en = entry.get('summary', '')

                    if item_id not in posted_items:
                        combined = title_en + " " + summary_en
                        
                        if is_league_match(combined):
                            print(f"📌 አዲስ መረጃ ተገኝቷል: {title_en}")
                            
                            # የመረጃው አይነት መወሰን (ውጤት፣ ጉዳት፣ ትንተና፣ ዜና)
                            if category_type == "RESULTS":
                                header_tag = "🏆 **የጨዋታ ውጤት (Match Result)**"
                            elif category_type == "PREVIEWS_FIXTURES":
                                header_tag = "📅 **የጨዋታ መርሐግብር እና ትንተና (Match Preview)**"
                            else:
                                header_tag = detect_category(title_en, summary_en)

                            # ፎቶ ማውጣት
                            image_url = get_high_quality_image(entry.link, entry)
                            
                            # ወደ አማርኛ መተርጎም
                            title_am = translate_to_amharic(title_en)
                            clean_summary = BeautifulSoup(summary_en, 'html.parser').get_text()
                            summary_am = translate_to_amharic(clean_summary)

                            # ወደ ቴሌግራም መላክ
                            success = send_telegram_post(header_tag, title_am, summary_am, entry.link, image_url)
                            if success:
                                posted_items.add(item_id)
                                print("✅ ወደ ቴሌግራም ተልኳል!\n")
                                time.sleep(3)
            except Exception as e:
                print(f"Feed Error ({feed_url}): {e}")

if __name__ == "__main__":
    print("🚀 ሁሉን አቀፍ የእግር ኳስ ማስተር ቦት ሥራ ጀምሯል...")
    while True:
        run_master_bot()
        print("ቀጣዩ ፍተሻ ከ5 ደቂቃ በኋላ ይቀጥላል...\n")
        time.sleep(300)  # በየ 5 ደቂቃው ዜና፣ ውጤት እና ጉዳቶችን ይፈትሻል