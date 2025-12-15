# 📱 APK ile Test Rehberi

## ✅ Evet, Bu Mükemmel Bir Test Yöntemi!

APK alıp telefona yükleyip credits sayfasından ödeme yaparak gerçek bir test yapabilirsiniz.

---

## 🚀 Adım 1: APK Build Etme

### Yöntem 1: Release APK (Önerilen)

```bash
# Android release APK build
cd android
./gradlew assembleRelease

# APK dosyası şurada olacak:
# android/app/build/outputs/apk/release/app-release.apk
```

### Yöntem 2: Debug APK (Daha Hızlı)

```bash
# Android debug APK build
cd android
./gradlew assembleDebug

# APK dosyası şurada olacak:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Yöntem 3: Expo Build (Eğer Expo kullanıyorsanız)

```bash
# Expo ile build
eas build --platform android --profile preview
```

---

## 📲 Adım 2: APK'yı Telefona Yükleme

### Yöntem 1: USB ile

```bash
# APK'yı telefona kopyala
adb install android/app/build/outputs/apk/release/app-release.apk

# Veya manuel:
# 1. APK'yı telefona kopyala (USB, email, cloud, vb.)
# 2. Telefonda "Bilinmeyen kaynaklardan yükleme" izni ver
# 3. APK'yı aç ve yükle
```

### Yöntem 2: Manuel

1. APK dosyasını telefona kopyala (USB, email, cloud, vb.)
2. Telefonda **"Bilinmeyen kaynaklardan yükleme"** izni ver
3. APK dosyasına tıkla ve yükle

---

## 💳 Adım 3: Test Ödeme Yapma

### 1. App'i Aç

- App'i açın
- Login olun (veya register)

### 2. Credits Sayfasına Git

- Credits/Wallet sayfasına gidin
- "Add Credits" veya "Purchase Credits" butonuna tıklayın

### 3. Test Kartı ile Ödeme Yap

**Başarılı Ödeme için:**

```
Kart No: 4242 4242 4242 4242
CVV: Herhangi bir 3 haneli sayı (örn: 123)
Tarih: Gelecek bir tarih (örn: 12/25)
ZIP: Herhangi bir 5 haneli sayı (örn: 12345)
```

**Başarısız Ödeme için (test):**

```
Kart No: 4000 0000 0000 0002
CVV: Herhangi bir 3 haneli sayı
Tarih: Gelecek bir tarih
```

### 4. Ödeme Sonrası Kontrol

**App'te kontrol edin:**

- ✅ Krediler eklendi mi?
- ✅ Bildirim geldi mi?
- ✅ Wallet history'de görünüyor mu?

---

## 🔍 Adım 4: Backend Kontrolü

### 1. Stripe Dashboard Kontrol

1. **Stripe Dashboard → Payments → Payment Intents**

   - Yeni payment intent görünüyor mu?
   - Status: `succeeded` ✅

2. **Stripe Dashboard → Invoices**

   - Invoice oluşturuldu mu?
   - Status: `paid` ✅

3. **Stripe Dashboard → Webhooks → Events**
   - Webhook gönderildi mi?
   - Status: `Succeeded` ✅

### 2. Supabase Dashboard Kontrol

1. **Edge Functions → stripe-webhook → Logs**

   - Function çalıştı mı?
   - Log mesajları var mı?

2. **Table Editor → credit_transactions**

   ```sql
   SELECT * FROM credit_transactions
   ORDER BY created_at DESC
   LIMIT 5;
   ```

   - Yeni kayıt var mı? ✅

3. **Table Editor → transactions**

   ```sql
   SELECT * FROM transactions
   WHERE type = 'credit_purchase'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

   - Yeni kayıt var mı? ✅

4. **Table Editor → notifications**
   ```sql
   SELECT * FROM notifications
   WHERE type = 'payment'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Bildirim oluşturuldu mu? ✅

---

## 🧪 Test Senaryoları

### Senaryo 1: Başarılı Ödeme

1. ✅ Test kartı ile ödeme yap
2. ✅ Krediler eklendi mi kontrol et
3. ✅ Stripe Dashboard'da payment intent görünüyor mu?
4. ✅ Supabase'de kayıtlar oluştu mu?

### Senaryo 2: Başarısız Ödeme

1. ✅ Başarısız kart ile ödeme dene
2. ✅ Hata mesajı görünüyor mu?
3. ✅ Krediler eklenmedi mi?
4. ✅ Notification geldi mi? (hata bildirimi)

### Senaryo 3: İade (Opsiyonel)

1. ✅ Stripe Dashboard'dan refund yap
2. ✅ Krediler geri alındı mı?
3. ✅ Transaction history'de görünüyor mu?

---

## 🚨 Troubleshooting

### Problem: APK yüklenmiyor

**Çözüm:**

- Telefonda "Bilinmeyen kaynaklardan yükleme" izni ver
- Android 8+ için: Settings → Apps → Special access → Install unknown apps

### Problem: Ödeme yapılamıyor

**Çözüm:**

- Internet bağlantısı var mı kontrol et
- Stripe publishable key doğru mu kontrol et (`.env` dosyasında)
- Test mode'da mısınız kontrol et

### Problem: Krediler eklenmedi

**Çözüm:**

1. Supabase Dashboard → Edge Functions → stripe-webhook → Logs

   - Function çalıştı mı?
   - Hata var mı?

2. Stripe Dashboard → Webhooks → Events

   - Webhook gönderildi mi?
   - Status başarılı mı?

3. Database kayıtlarını kontrol et

### Problem: Invoice görünmüyor

**Çözüm:**

- Invoice oluşturma yeni eklendi
- Yeni bir test ödeme yapın
- Customer ID var mı kontrol et

---

## ✅ Test Checklist

### Build:

- [ ] APK build edildi
- [ ] APK telefona yüklendi
- [ ] App açılıyor

### Ödeme:

- [ ] Test kartı ile ödeme yapıldı
- [ ] Ödeme başarılı oldu
- [ ] Krediler eklendi
- [ ] Bildirim geldi

### Backend:

- [ ] Stripe Dashboard'da payment intent görünüyor
- [ ] Stripe Dashboard'da invoice görünüyor (yeni test'lerde)
- [ ] Supabase function log'larında görünüyor
- [ ] Database'de kayıtlar oluştu

---

## 📝 Notlar

- **Test Mode:** Stripe test mode'da çalışıyor, gerçek para harcanmaz
- **Test Kartları:** Sadece test kartları çalışır, gerçek kartlar çalışmaz
- **Webhook:** Webhook otomatik tetiklenir, manuel bir şey yapmanıza gerek yok
- **Invoice:** Invoice oluşturma yeni eklendi, eski test'lerde görünmeyebilir

---

## 🎯 Hızlı Komutlar

```bash
# APK build
cd android && ./gradlew assembleRelease

# APK yükleme
adb install android/app/build/outputs/apk/release/app-release.apk

# Logs kontrol
supabase functions logs stripe-webhook --follow
```

---

## 🚀 Sonuç

APK ile test yapmak **en gerçekçi test yöntemi**!

1. ✅ APK build et
2. ✅ Telefona yükle
3. ✅ Credits sayfasından ödeme yap
4. ✅ Backend'i kontrol et

Başarılar! 🎉
