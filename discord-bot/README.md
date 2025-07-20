# BBLIP Discord Bot

Discord sunucusunda kullanıcı aktivitelerini takip eden ve XP sistemi sağlayan bot.

## Kurulum

### 1. Discord Bot Oluşturun
1. [Discord Developer Portal](https://discord.com/developers/applications)'a gidin
2. "New Application" butonuna tıklayın
3. Bot adı: `BBLIP Discord Bot`
4. "Bot" sekmesine gidin ve "Add Bot" butonuna tıklayın
5. Token'ı kopyalayın ve kaydedin

### 2. Bot Permissions
Bot'unuzun aşağıdaki izinlere ihtiyacı var:
- Send Messages
- Embed Links
- Use Slash Commands
- Manage Messages (rate limiting için)
- Timeout Members (rate limiting için)
- Read Message History
- Add Reactions

### 3. Bot'u Sunucunuza Ekleyin
1. OAuth2 > URL Generator sekmesine gidin
2. Scopes: `bot` ve `applications.commands` seçin
3. Bot Permissions: Yukarıdaki izinleri seçin
4. Oluşturulan URL'yi kullanarak bot'u sunucunuza ekleyin

### 4. Environment Variables
`.env` dosyasını oluşturun:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Web App URL
WEB_APP_URL=https://bblip.io

# Bot Settings
NODE_ENV=production
LOG_LEVEL=info
```

### 5. Bot'u Başlatın
```bash
npm install
npm start
```

## Bot Komutları

- `/xp` - XP ve seviye bilgilerini göster
- `/leaderboard` - En yüksek XP'li kullanıcıları göster
- `/connect` - Hesap bağlantı talimatlarını göster
- `/help` - Tüm komutları göster

## XP Sistemi

- **Mesaj gönderme**: +1 XP
- **Reaksiyon alma**: +2 XP
- **Günlük aktivite**: +5 XP
- **Haftalık streak**: +10 XP

## Seviyeler

- **Bronze**: 0-100 XP (1 BBLP/gün)
- **Silver**: 101-250 XP (3 BBLP/gün)
- **Gold**: 251-500 XP (5 BBLP/gün)
- **Platinum**: 501-1000 XP (10 BBLP/gün)
- **Diamond**: 1001+ XP (20 BBLP/gün)

## Rate Limiting

Bot spam koruması için rate limiting kullanır:
- Maksimum 10 mesaj/dakika
- Maksimum 100 mesaj/saat
- 3 uyarıdan sonra 5 dakika timeout

## Özellikler

### Otomatik XP Takibi
- Her mesaj için +1 XP
- Her reaksiyon için +2 XP
- Seviye atlama bildirimleri
- Gerçek zamanlı XP güncellemeleri

### Kullanıcı Bağlantısı
- Bağlı olmayan kullanıcılara otomatik bağlantı mesajı
- Hesap bağlantı butonları
- Bağlantı durumu kontrolü

### Yeni Üye Karşılama
- Yeni üyeler için otomatik karşılama mesajı
- Hesap bağlantı talimatları
- Bot özelliklerinin tanıtımı

### Komut Sistemi
- Slash komutları ile kolay kullanım
- XP istatistikleri görüntüleme
- Liderlik tablosu
- Yardım komutları

## Database Entegrasyonu

Bot aşağıdaki Supabase tablolarını kullanır:
- `discord_users` - Kullanıcı bilgileri
- `discord_activities` - Aktivite istatistikleri
- `discord_message_logs` - Mesaj kayıtları
- `discord_reaction_logs` - Reaksiyon kayıtları

## Deployment

### Vercel (Serverless)
Bot'u Vercel'de çalıştırmak için:
1. Vercel CLI kurun
2. `vercel` komutunu çalıştırın
3. Environment variables'ları ayarlayın

### Railway
1. Railway hesabı oluşturun
2. GitHub repo'nuzu bağlayın
3. Environment variables'ları ayarlayın
4. Deploy edin

### Heroku
1. Heroku hesabı oluşturun
2. Yeni app oluşturun
3. GitHub repo'nuzu bağlayın
4. Environment variables'ları ayarlayın
5. Deploy edin

## Sorun Giderme

### Bot Mesaj Göndermiyor
- Bot'un mesaj gönderme izni olduğundan emin olun
- Kanal izinlerini kontrol edin
- Bot'un online olduğunu kontrol edin

### XP Güncellenmiyor
- Database bağlantısını kontrol edin
- Supabase service key'in doğru olduğundan emin olun
- Bot'un database tablolarına erişimi olduğunu kontrol edin

### Komutlar Çalışmıyor
- Bot'un slash command izni olduğundan emin olun
- Komutları yeniden deploy edin
- Bot'un sunucuda olduğunu kontrol edin

## Geliştirme

### Yeni Komut Ekleme
1. `bot.js` dosyasında komut handler'ı ekleyin
2. Komut fonksiyonunu oluşturun
3. Slash command'i deploy edin

### Yeni XP Kaynağı Ekleme
1. XP miktarını tanımlayın
2. Event handler ekleyin
3. `addXP` fonksiyonunu çağırın
4. Database'e log kaydı ekleyin

## Lisans

MIT License - Detaylar için LICENSE dosyasına bakın. 