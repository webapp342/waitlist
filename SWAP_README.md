# 🔄 BSC Mainnet Swap Interface

Production-ready token swap interface for BSC Mainnet powered by PancakeSwap V2 Router.

## ✅ Özellikler

- **Tamamen On-Chain:** Doğrudan PancakeSwap V2 Router ile işlem
- **API Key Gerektirmez:** 1inch veya benzeri off-chain servisler kullanmaz
- **BSC Mainnet:** Chain ID 56 üzerinde çalışır
- **Token Listesi:** PancakeSwap'in resmi token listesini dinamik yükler
- **Modern UI/UX:** Responsive ve kullanıcı dostu arayüz
- **Slippage Kontrolü:** Ayarlanabilir slippage tolerance
- **Fiyat Bilgisi:** Anlık fiyat ve minimum alım miktarı gösterimi
- **Approval Sistemi:** ERC20 token onayları otomatik yönetim

## 🏗️ Yeni Dosyalar

### Type Definitions
- `types/swap.ts` - Swap işlemleri için TypeScript tipleri

### Configuration
- `config/swap.ts` - BSC mainnet contract adresleri ve konfigürasyon

### Hooks
- `hooks/useSwap.ts` - Swap işlemlerini yöneten React hook

### Components
- `components/swap/SwapInterface.tsx` - Ana swap arayüzü
- `components/swap/TokenSelector.tsx` - Token seçim modali
- `components/swap/SwapSettings.tsx` - Slippage ve deadline ayarları
- `components/swap/WalletConnectButton.tsx` - Wallet bağlantı butonu
- `components/ui/card.tsx` - Card bileşeni (yeni eklendi)
- `components/ui/label.tsx` - Label bileşeni (yeni eklendi)

### Pages
- `app/swap/page.tsx` - Ana swap sayfası

## 🔧 Teknik Detaylar

### Contract Adresleri (BSC Mainnet)
- **Router V2:** `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- **Factory V2:** `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`
- **WBNB:** `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`

### Token Listesi
- **API:** `https://tokens.pancakeswap.finance/pancakeswap-extended.json`
- **Filtre:** Sadece BSC mainnet (chain ID 56) tokenları
- **Limit:** Performans için ilk 100 token

### Swap İşlem Akışı
1. **Token Seçimi:** Giriş ve çıkış tokenları seçilir
2. **Fiyat Hesaplama:** `getAmountsOut` ile anlık fiyat alınır
3. **Approval:** ERC20 tokenlar için router'a onay verilir
4. **Swap Execution:** Uygun swap fonksiyonu çağrılır
   - BNB → Token: `swapExactETHForTokens`
   - Token → BNB: `swapExactTokensForETH`
   - Token → Token: `swapExactTokensForTokens`

### Routing
- **Direkt Swap:** İki token arasında doğrudan likidite varsa
- **WBNB Aracılığı:** Gerekirse WBNB üzerinden routing

## 🚀 Kullanım

1. **Wallet Bağlantısı:** MetaMask veya desteklenen wallet ile bağlanın
2. **Network:** BSC Mainnet'e geçiş yapın (otomatik önerilir)
3. **Token Seçimi:** Giriş ve çıkış tokenlarını seçin
4. **Miktar Girişi:** Swap edilecek miktarı girin
5. **Ayarlar:** Slippage tolerance ve deadline ayarlayın
6. **Approval:** İlk defa swap yapıyorsanız token'ı onaylayın
7. **Swap:** İşlemi onaylayın ve tamamlayın

## ⚠️ Güvenlik Notları

- **Mainnet:** Real fonlar kullanılmaktadır
- **Kontrol:** Token adreslerini ve miktarları dikkatli kontrol edin
- **Slippage:** Yüksek slippage unfavorable trades'e sebep olabilir
- **Gas:** İşlem ücretleri için yeterli BNB bulundurun

## 🔗 Bağımlılıklar

Mevcut proje dependencies:
- **wagmi v2** - Wallet bağlantısı ve blockchain işlemleri
- **ethers v6** - Contract etkileşimleri
- **viem** - Low-level blockchain operations
- **Next.js 15** - React framework
- **Tailwind CSS** - Styling
- **Sonner** - Toast notifications

## 📱 Responsive Design

- **Desktop:** Tam özellikli arayüz
- **Mobile:** Touch-friendly, kompakt tasarım
- **Dark Mode:** Otomatik tema desteği

## 🔄 Network Isolation

Bu swap sayfası mevcut sistemi **hiçbir şekilde etkilemez:**
- Sadece `/swap` route'unda çalışır
- BSC mainnet'e izole edilmiştir
- Mevcut testnet konfigürasyonu korunmuştur
- Bağımsız state management kullanır

## 📈 Future Enhancements

- **V3 Router:** PancakeSwap V3 desteği eklenebilir
- **Price Charts:** Token fiyat grafikleri
- **Transaction History:** Geçmiş işlem listesi
- **Favorites:** Favori token listesi
- **Portfolio:** Token bakiyeleri ve değerleri

## 🌐 URLs

- **Local:** `http://localhost:3000/swap`
- **Production:** `[domain]/swap`

---

## 🎯 Sonuç

Bu swap interface:
- ✅ Production-ready
- ✅ Tamamen on-chain
- ✅ Güvenli ve güvenilir
- ✅ Modern ve kullanıcı dostu
- ✅ Mevcut sistemi bozmaz
- ✅ BSC mainnet'e izole edilmiş

Kullanıcılar artık doğrudan BSC mainnet üzerinde PancakeSwap router'ı kullanarak güvenli token swapları yapabilirler. 
 