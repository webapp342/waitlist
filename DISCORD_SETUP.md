# Discord Entegrasyonu Kurulum Rehberi

Bu rehber Discord entegrasyonunu kurmanız için gerekli adımları içerir.

## 1. Discord Developer Portal Ayarları

### Discord Application Oluşturma
1. [Discord Developer Portal](https://discord.com/developers/applications)'a gidin
2. "New Application" butonuna tıklayın
3. Application adı: `BBLIP Discord Integration`
4. "Create" butonuna tıklayın

### OAuth2 Ayarları
1. Sol menüden "OAuth2" > "General" sekmesine gidin
2. "Redirects" bölümüne şu URL'yi ekleyin:
   - Development: `http://localhost:3000/discord/callback`
   - Production: `https://bblip.io/discord/callback`
3. "Save Changes" butonuna tıklayın

### Bot Ayarları
1. Sol menüden "Bot" sekmesine gidin
2. "Add Bot" butonuna tıklayın
3. Bot permissions'ları ayarlayın:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Manage Messages
   - Timeout Members
   - Read Message History
   - Add Reactions

### Gerekli Bilgileri Not Edin
Aşağıdaki bilgileri not edin:
- **Client ID**: OAuth2 > General sekmesinde
- **Client Secret**: OAuth2 > General sekmesinde "Reset Secret" ile oluşturun
- **Bot Token**: Bot sekmesinde "Reset Token" ile oluşturun

## 2. Discord Sunucusu Ayarları

### Bot'u Sunucunuza Ekleyin
1. OAuth2 > URL Generator sekmesine gidin
2. Scopes: `bot` ve `applications.commands` seçin
3. Bot Permissions: Yukarıdaki izinleri seçin
4. Oluşturulan URL'yi kullanarak bot'u sunucunuza ekleyin

### Sunucu ID'sini Alın
1. Discord'da Developer Mode'u açın (User Settings > Advanced > Developer Mode)
2. Sunucunuza sağ tıklayın ve "Copy Server ID" seçin
3. Bu ID'yi not edin

## 3. Environment Variables

### Ana Proje (.env.local)
```env
# Discord OAuth2 Configuration
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://bblip.io/discord/callback
DISCORD_CLIENT_SECRET=your_client_secret_here

# Discord Bot Configuration (bot için)
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
```

### Discord Bot (.env)
```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
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

## 4. Database Kurulumu

### Supabase'de Schema Çalıştırın
1. Supabase Dashboard'a gidin
2. SQL Editor'ü açın
3. `discord_schema.sql` dosyasının içeriğini kopyalayın
4. Execute butonuna tıklayın

### Tablolar Oluşturuldu mu Kontrol Edin
Aşağıdaki tablolar oluşturulmalı:
- `discord_oauth_sessions`
- `discord_users`
- `discord_activities`
- `discord_daily_claims`
- `discord_message_logs`
- `discord_reaction_logs`

## 5. Discord Bot Kurulumu

### Bot Klasörüne Gidin
```bash
cd discord-bot
```

### Dependencies Kurun
```bash
npm install
```

### Slash Commands Deploy Edin
```bash
npm run deploy-commands
```

### Bot'u Başlatın
```bash
npm start
```

## 6. Web Uygulaması Test

### Development
1. Ana projeyi başlatın: `npm run dev`
2. `http://localhost:3000/discord` adresine gidin
3. Wallet bağlayın
4. "Connect Discord" butonuna tıklayın
5. Discord OAuth akışını test edin

### Production
1. Environment variables'ları production'a deploy edin
2. Web uygulamasını deploy edin
3. Discord bot'u production'a deploy edin

## 7. Özellikler ve Test

### OAuth2 Bağlantısı
- ✅ Discord hesabı bağlama
- ✅ Kullanıcı bilgilerini alma
- ✅ Avatar ve profil bilgileri
- ✅ Token yönetimi

### XP Sistemi
- ✅ Mesaj gönderme: +1 XP
- ✅ Reaksiyon alma: +2 XP
- ✅ Seviye atlama
- ✅ Günlük ödüller

### Bot Komutları
- ✅ `/xp` - XP istatistikleri
- ✅ `/leaderboard` - Liderlik tablosu
- ✅ `/connect` - Bağlantı talimatları
- ✅ `/help` - Yardım

### Rate Limiting
- ✅ Spam koruması
- ✅ Uyarı sistemi
- ✅ Timeout sistemi

## 8. Sorun Giderme

### OAuth2 Hataları
- **"Invalid redirect URI"**: Redirect URI'nin Discord Developer Portal'da doğru ayarlandığından emin olun
- **"Invalid client"**: Client ID'nin doğru olduğundan emin olun
- **"Invalid scope"**: Scope'ların doğru ayarlandığından emin olun

### Bot Hataları
- **"Bot not responding"**: Bot token'ının doğru olduğundan emin olun
- **"Missing permissions"**: Bot'un gerekli izinlere sahip olduğundan emin olun
- **"Commands not working"**: Slash commands'ları deploy ettiğinizden emin olun

### Database Hataları
- **"Table not found"**: Schema'yı çalıştırdığınızdan emin olun
- **"Permission denied"**: Supabase service key'in doğru olduğundan emin olun
- **"Connection failed"**: Supabase URL'nin doğru olduğundan emin olun

## 9. Production Deployment

### Vercel (Web App)
1. Environment variables'ları Vercel'e ekleyin
2. Web uygulamasını deploy edin
3. Discord redirect URI'yi production URL'ye güncelleyin

### Railway (Bot)
1. Discord bot klasörünü ayrı repo'ya taşıyın
2. Railway'de yeni proje oluşturun
3. Environment variables'ları ayarlayın
4. Deploy edin

### Heroku (Bot)
1. Discord bot klasörünü ayrı repo'ya taşıyın
2. Heroku'da yeni app oluşturun
3. Environment variables'ları ayarlayın
4. Deploy edin

## 10. Monitoring ve Logs

### Bot Logs
- Bot başlatma logları
- XP kazanma logları
- Seviye atlama logları
- Hata logları

### Web App Logs
- OAuth bağlantı logları
- Database işlem logları
- Hata logları

### Database Monitoring
- Kullanıcı bağlantı sayıları
- XP kazanma istatistikleri
- Günlük ödül claim sayıları

## 11. Güvenlik

### OAuth2 Güvenliği
- Client secret'ı güvenli tutun
- Redirect URI'leri doğru ayarlayın
- State parameter kullanın

### Bot Güvenliği
- Bot token'ını güvenli tutun
- Rate limiting kullanın
- Permission kontrolü yapın

### Database Güvenliği
- Row Level Security (RLS) kullanın
- Service key'i güvenli tutun
- Input validation yapın

## 12. Performans

### Optimizasyonlar
- Database indexleri
- Rate limiting
- Caching
- Connection pooling

### Monitoring
- Response time
- Error rate
- User activity
- Database performance

Bu rehber Discord entegrasyonunu tam olarak kurmanız için gerekli tüm adımları içerir. Herhangi bir sorunla karşılaşırsanız, yukarıdaki sorun giderme bölümünü kontrol edin. 