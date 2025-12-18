# Metro Bundler Connection Hatası Çözümü

## Hata
```
java.net.SocketTimeoutException: failed to connect to /192.x.x.x
```

## Hızlı Çözümler

### 1. Metro Bundler'ı Yeniden Başlatın

```bash
# Metro bundler'ı durdurun (Ctrl+C)
# Sonra yeniden başlatın:
npx expo start --clear
```

### 2. Tunnel Modunu Kullanın

Eğer cihaz ve bilgisayar aynı WiFi'de değilse:

```bash
npx expo start --tunnel
```

Bu daha yavaş ama her zaman çalışır.

### 3. IP Adresini Manuel Ayarlayın

```bash
# Bilgisayarınızın IP adresini öğrenin:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Metro bundler'ı başlatırken IP'yi belirtin:
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --host tunnel
```

### 4. Firewall Kontrolü

**Mac:**
- System Preferences → Security & Privacy → Firewall
- Metro bundler'ın bağlantılara izin verdiğinden emin olun

**Windows:**
- Windows Defender Firewall → Allow an app
- Node.js ve Metro bundler'ı ekleyin

### 5. Development Build'te QR Kod Kullanın

1. `npx expo start` çalıştırın
2. QR kodu tarayın (Expo Go ile değil, development build ile)
3. Veya terminalde "a" tuşuna basarak Android emulator'de açın

### 6. LAN Modunu Kontrol Edin

```bash
npx expo start --lan
```

## Adım Adım Çözüm

1. **Metro bundler'ı durdurun** (çalışıyorsa Ctrl+C)

2. **Cache'i temizleyin:**
   ```bash
   npx expo start --clear
   ```

3. **Cihazı yeniden bağlayın:**
   - Uygulamada "Reload" butonuna basın
   - Veya QR kodu tekrar tarayın

4. **Hala çalışmıyorsa tunnel modunu deneyin:**
   ```bash
   npx expo start --tunnel --clear
   ```

## Önerilen Çözüm

En güvenilir yöntem tunnel modu:

```bash
npx expo start --tunnel --clear
```

Bu yöntem:
- ✅ Farklı WiFi ağlarında çalışır
- ✅ Firewall sorunlarını aşar
- ✅ Her zaman güvenilir

Tek dezavantajı biraz daha yavaş olmasıdır.







