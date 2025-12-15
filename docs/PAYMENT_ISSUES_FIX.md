# Payment Issues Fix Guide

## 🔍 Sorunlar

1. ✅ **Wallet balance 0 gösteriyor** - `add_user_credits` function `wallet_balance` güncellemiyor olabilir
2. ✅ **Push notification gelmiyor** - Device token kaydı eksik olabilir
3. ✅ **History'de görünmüyor** - Transaction kaydı oluşmuyor olabilir
4. ✅ **Image upload failed** - Avatars bucket yok veya permissions yanlış

---

## 🔧 Çözümler

### 1. Wallet Balance Sorunu

**Problem:** `add_user_credits` RPC function'ı `users.wallet_balance` kolonunu güncellemiyor olabilir.

**Çözüm:**

1. **SQL Function'ı oluştur/güncelle:**

   ```sql
   -- docs/sql/create_add_user_credits_function.sql dosyasını Supabase SQL Editor'de çalıştırın
   ```

2. **Function'ın doğru çalıştığını kontrol edin:**

   ```sql
   -- Function var mı?
   SELECT routine_name, routine_definition
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name = 'add_user_credits';

   -- Test edin:
   SELECT * FROM users WHERE id = 'YOUR_USER_ID';
   -- wallet_balance değerini not edin

   -- Function'ı çağırın:
   SELECT add_user_credits(
     'YOUR_USER_ID'::uuid,
     10.00,
     'purchase',
     'Test credit',
     NULL
   );

   -- Tekrar kontrol edin:
   SELECT wallet_balance FROM users WHERE id = 'YOUR_USER_ID';
   -- wallet_balance artmış olmalı!
   ```

3. **Webhook loglarını kontrol edin:**
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - "Wallet balance updated successfully" mesajını arayın
   - "Error adding credits" hatası varsa → RPC function'ı kontrol edin

---

### 2. Push Notification Sorunu

**Problem:** Device token kaydedilmemiş veya `is_active = false`.

**Çözüm:**

1. **Device token kontrolü:**

   ```sql
   SELECT * FROM public.user_devices
   WHERE user_id = 'YOUR_USER_ID'
     AND is_active = true;
   ```

2. **Token yoksa:**

   - Uygulamayı kapatıp açın
   - Settings → Apps → Talkee → Notifications → **Enabled** olduğundan emin olun
   - Uygulama açıldığında `notificationsService.initialize()` çağrılmalı

3. **Manuel push test:**
   - Supabase Dashboard → Edge Functions → `send-push` → Invoke
   - Body:
   ```json
   {
     "user_id": "YOUR_USER_ID",
     "title": "Test Push",
     "body": "This is a test notification"
   }
   ```

---

### 3. History'de Görünmüyor

**Problem:** Transaction kaydı oluşmuyor veya yanlış user_id ile oluşuyor.

**Çözüm:**

1. **Transaction kayıtlarını kontrol edin:**

   ```sql
   SELECT * FROM public.transactions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Webhook'ta user_id kontrolü:**

   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - "Payment succeeded" log'unda `user_id` değerini kontrol edin
   - `paymentIntent.metadata.user_id` doğru mu?

3. **Credit transaction kayıtlarını kontrol edin:**
   ```sql
   SELECT * FROM public.credit_transactions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

---

### 4. Image Upload Failed

**Problem:** `avatars` bucket yok veya RLS policies yanlış.

**Çözüm:**

1. **Bucket oluşturma (Supabase Dashboard):**

   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
   - Click "New bucket"
   - Name: `avatars`
   - Public bucket: ✅ **YES** (avatars need to be publicly accessible)
   - Create

2. **RLS Policies ekle:**

   ```sql
   -- docs/sql/create_avatars_bucket.sql dosyasındaki policies'leri çalıştırın
   ```

3. **Bucket kontrolü:**

   ```sql
   SELECT * FROM storage.buckets WHERE name = 'avatars';
   ```

4. **Policies kontrolü:**
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'objects'
     AND schemaname = 'storage'
     AND policyname LIKE '%avatar%';
   ```

---

## 📋 Hızlı Kontrol Listesi

### Wallet Balance:

- [ ] `add_user_credits` function mevcut mu? (`docs/sql/create_add_user_credits_function.sql`)
- [ ] Function `users.wallet_balance` güncelliyor mu?
- [ ] Webhook loglarında "Wallet balance updated successfully" görünüyor mu?
- [ ] `users` tablosunda `wallet_balance` kolonu var mı?

### Push Notification:

- [ ] `user_devices` tablosunda `is_active = true` kayıt var mı?
- [ ] `push_token` doğru formatta mı? (`ExponentPushToken[...]`)
- [ ] Permissions verilmiş mi? (Settings → Apps → Talkee → Notifications)
- [ ] `send-push` function manuel test edildi mi?

### History:

- [ ] `transactions` tablosunda kayıt var mı?
- [ ] `credit_transactions` tablosunda kayıt var mı?
- [ ] Webhook'ta `user_id` doğru mu?

### Image Upload:

- [ ] `avatars` bucket mevcut mu?
- [ ] Bucket public mi?
- [ ] RLS policies doğru mu?
- [ ] Storage permissions doğru mu?

---

## 🚨 Acil Düzeltmeler

### 1. add_user_credits Function'ı Oluştur

```sql
-- Supabase SQL Editor'de çalıştırın:
-- docs/sql/create_add_user_credits_function.sql
```

### 2. Avatars Bucket Oluştur

1. Supabase Dashboard → Storage → New Bucket
2. Name: `avatars`
3. Public: ✅ YES
4. Create
5. Policies ekle: `docs/sql/create_avatars_bucket.sql`

### 3. Device Token Kontrolü

```sql
-- Token var mı?
SELECT * FROM public.user_devices
WHERE user_id = 'YOUR_USER_ID';
```

Token yoksa → Uygulamayı yeniden başlatın, permissions verin.

---

## ✅ Test Adımları

1. **Payment test:**

   - Credit purchase yapın
   - Webhook loglarını kontrol edin
   - `users.wallet_balance` güncellendi mi kontrol edin

2. **Push test:**

   - Manuel push gönderin (Supabase Dashboard)
   - Notification geldi mi kontrol edin

3. **History test:**

   - `transactions` tablosunu kontrol edin
   - Wallet history sayfasında görünüyor mu?

4. **Image upload test:**
   - Avatar yüklemeyi deneyin
   - Storage'da dosya oluştu mu kontrol edin
