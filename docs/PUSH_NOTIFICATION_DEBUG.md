# Push Notification Debug Guide

## 🔍 Sorun Tespiti

Push notification'ların gelmemesinin olası nedenleri:

### 1. ✅ Device Token Kaydı Kontrolü

**Kontrol:**

```sql
-- Supabase SQL Editor'de çalıştırın
SELECT
  id,
  user_id,
  push_token,
  platform,
  is_active,
  created_at,
  updated_at
FROM public.user_devices
WHERE user_id = 'YOUR_USER_ID'  -- Kendi user_id'nizi yazın
ORDER BY created_at DESC;
```

**Beklenen:**

- `is_active = true` olan en az 1 kayıt olmalı
- `push_token` `ExponentPushToken[...]` formatında olmalı
- `platform` `ios` veya `android` olmalı

**Sorun varsa:**

- Uygulamayı yeniden başlatın
- Permissions'ı kontrol edin (Settings → Apps → Talkee → Notifications)
- `app/_layout.tsx`'te `notificationsService.initialize()` çağrıldığından emin olun

---

### 2. ✅ Webhook'ta user_id Kontrolü

**Kontrol:**

```sql
-- Son payment intent'leri kontrol edin
SELECT
  metadata->>'user_id' as user_id,
  id,
  amount,
  status,
  created
FROM stripe.payment_intents
ORDER BY created DESC
LIMIT 10;
```

**Beklenen:**

- `metadata.user_id` dolu olmalı
- `user_id` `users` tablosunda mevcut olmalı

**Sorun varsa:**

- `app/credit-selection.tsx`'te `stripeService.createPaymentIntent()` çağrısında `user.id` gönderildiğinden emin olun

---

### 3. ✅ Send-Push Function Kontrolü

**Kontrol:**
Supabase Dashboard → Edge Functions → `send-push` → Logs

**Beklenen loglar:**

```
Successfully fetched device tokens: { count: 1 }
Sending push notification to: ExponentPushToken[...]
Push notification sent successfully
```

**Sorun varsa:**

- `user_devices` tablosunda `is_active = true` kayıt var mı kontrol edin
- Token formatı doğru mu kontrol edin (`ExponentPushToken[...]` veya `ExpoPushToken[...]`)

---

### 4. ✅ Expo Push Token Formatı

**Kontrol:**

```sql
-- Token formatını kontrol edin
SELECT
  push_token,
  CASE
    WHEN push_token LIKE 'ExponentPushToken[%' THEN 'Valid Expo Format'
    WHEN push_token LIKE 'ExpoPushToken[%' THEN 'Valid Expo Format (Old)'
    ELSE 'Invalid Format'
  END as token_status
FROM public.user_devices
WHERE user_id = 'YOUR_USER_ID'
  AND is_active = true;
```

**Beklenen:**

- Tüm token'lar `ExponentPushToken[...]` veya `ExpoPushToken[...]` formatında olmalı

---

### 5. ✅ Permissions Kontrolü

**Android:**

- Settings → Apps → Talkee → Notifications → **Enabled** olmalı
- `AndroidManifest.xml`'de `POST_NOTIFICATIONS` permission var mı kontrol edin

**iOS:**

- Settings → Talkee → Notifications → **Allow Notifications** açık olmalı
- İlk açılışta permission istenmeli

**Kontrol:**

```typescript
// Uygulamada console'a bakın
// app/_layout.tsx'te initialize() sonrası log'lar:
// "Push notifications initialized" veya
// "Push notifications not available (permissions denied or web platform)"
```

---

### 6. ✅ Webhook Logs Kontrolü

**Kontrol:**
Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs

**Beklenen loglar:**

```
Payment succeeded: { user_id: '...', amount: 10, ... }
Creating notification...
Push notification sent successfully: { user_id: '...', ... }
```

**Sorun varsa:**

- `Failed to send push notification` hatası varsa → `send-push` function loglarına bakın
- `No active devices found` hatası varsa → `user_devices` tablosunu kontrol edin

---

### 7. ✅ Test Push Notification

**Manuel test:**

```sql
-- Supabase SQL Editor'de çalıştırın
-- Önce notification oluşturun
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  message,
  data
) VALUES (
  'YOUR_USER_ID',  -- Kendi user_id'nizi yazın
  'system',
  'Test Notification',
  'This is a test notification',
  '{}'::jsonb
);

-- Sonra send-push function'ı manuel çağırın
-- Supabase Dashboard → Edge Functions → send-push → Invoke
-- Body:
{
  "user_id": "YOUR_USER_ID",
  "title": "Test Push",
  "body": "This is a test push notification"
}
```

---

## 🔧 Hızlı Çözümler

### Çözüm 1: Device Token Yeniden Kaydetme

```typescript
// Uygulamayı kapatıp açın veya:
// Settings → Apps → Talkee → Clear Data → Uygulamayı yeniden açın
```

### Çözüm 2: Permissions Yeniden İsteme

```typescript
// Uygulamada:
// Settings → Apps → Talkee → Notifications → Toggle OFF → Toggle ON
```

### Çözüm 3: Webhook'ta user_id Kontrolü

```typescript
// app/credit-selection.tsx'te kontrol edin:
const { clientSecret, paymentIntentId } =
  await stripeService.createPaymentIntent(totalPrice, user.id);
// user.id dolu olmalı!
```

---

## 📋 Checklist

- [ ] `user_devices` tablosunda `is_active = true` kayıt var mı?
- [ ] `push_token` doğru formatta mı? (`ExponentPushToken[...]`)
- [ ] Permissions verilmiş mi? (Android: Settings → Apps → Talkee → Notifications)
- [ ] Webhook'ta `user_id` doğru mu? (`paymentIntent.metadata.user_id`)
- [ ] `send-push` function loglarında hata var mı?
- [ ] Expo Push API'ye istek gidiyor mu? (Network tab'ında kontrol edin)
- [ ] Physical device'da mı test ediyorsunuz? (Simulator/Emulator'da çalışmaz!)

---

## 🚨 Yaygın Hatalar

### Hata 1: "No active devices found"

**Sebep:** `user_devices` tablosunda `is_active = true` kayıt yok
**Çözüm:** Uygulamayı yeniden başlatın, permissions verin

### Hata 2: "No valid push tokens"

**Sebep:** Token formatı yanlış
**Çözüm:** `notificationsService.initialize()` çağrısını kontrol edin

### Hata 3: "DeviceNotRegistered"

**Sebep:** Token geçersiz veya eski
**Çözüm:** Uygulamayı yeniden yükleyin, yeni token alın

### Hata 4: Push notification gelmiyor ama notification kaydı var

**Sebep:** `send-push` function çağrılmıyor veya hata veriyor
**Çözüm:** Webhook loglarını kontrol edin, `send-push` function'ı manuel test edin

---

## 📞 Test Adımları

1. **Device Token Kontrolü:**

   ```sql
   SELECT * FROM public.user_devices WHERE user_id = 'YOUR_USER_ID';
   ```

2. **Manuel Push Test:**

   - Supabase Dashboard → Edge Functions → `send-push` → Invoke
   - Body'ye user_id, title, body gönderin

3. **Webhook Test:**

   - Stripe Dashboard → Webhooks → Test event → `payment_intent.succeeded`
   - Supabase webhook loglarını kontrol edin

4. **App Logs:**
   - Uygulamada console'a bakın
   - `app/_layout.tsx`'te initialize() loglarını kontrol edin

---

## ✅ Başarı Kriterleri

- ✅ `user_devices` tablosunda `is_active = true` kayıt var
- ✅ `push_token` `ExponentPushToken[...]` formatında
- ✅ Permissions verilmiş
- ✅ Webhook loglarında "Push notification sent successfully" görünüyor
- ✅ Physical device'da test ediliyor
- ✅ Notification kaydı `notifications` tablosunda oluşuyor
