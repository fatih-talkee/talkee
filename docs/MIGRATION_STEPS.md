# Migration Adımları - user_devices Tablosu

## 📋 Yapılacaklar Listesi

Bu migration, `public.user_devices` tablosunu günceller ve eksik kolonları, constraint'leri, index'leri ve RLS policy'lerini ekler.

---

## 🚀 Adım Adım Talimatlar

### **Adım 1: Supabase Dashboard'a Git**

1. Tarayıcıda Supabase projenizi açın: https://supabase.com/dashboard
2. Projenizi seçin

---

### **Adım 2: SQL Editor'ı Aç**

1. Sol menüden **"SQL Editor"** sekmesine tıklayın
2. **"New query"** butonuna tıklayın (veya mevcut bir query'yi temizleyin)

---

### **Adım 3: Migration Dosyasını Kopyala**

1. Projenizdeki `docs/sql/update_user_devices_table.sql` dosyasını açın
2. **Tüm içeriği** kopyalayın (Ctrl+A / Cmd+A, sonra Ctrl+C / Cmd+C)

---

### **Adım 4: SQL Editor'a Yapıştır ve Çalıştır**

1. Supabase SQL Editor'a yapıştırın (Ctrl+V / Cmd+V)
2. Sağ üstteki **"Run"** butonuna tıklayın (veya Ctrl+Enter / Cmd+Enter)
3. İşlemin tamamlanmasını bekleyin (birkaç saniye sürebilir)

---

### **Adım 5: Sonuçları Kontrol Et**

Migration çalıştıktan sonra, dosyanın sonundaki **verification query'leri** otomatik olarak çalışır ve sonuçları gösterir:

#### ✅ Beklenen Sonuçlar:

1. **Table Structure** - Tablo yapısı görüntülenir:

   ```
   status: "user_devices table structure"
   columns: id, user_id, push_token, platform, device_name, device_id, app_version, is_active, created_at, updated_at
   ```

2. **RLS Status** - RLS aktif olmalı:

   ```
   status: "RLS status"
   rls_enabled: true
   ```

3. **RLS Policies** - 4 policy olmalı:

   ```
   status: "RLS policies"
   policy_count: 4
   ```

4. **Indexes** - En az 3 index olmalı:
   ```
   - idx_user_devices_user_id
   - idx_user_devices_push_token
   - idx_user_devices_is_active
   ```

---

### **Adım 6: Hata Kontrolü**

Eğer hata alırsanız:

#### ❌ Hata: "relation does not exist"

- **Çözüm:** `public.user_devices` tablosu mevcut değil. Önce tabloyu oluşturmanız gerekebilir.

#### ❌ Hata: "permission denied"

- **Çözüm:** Supabase admin yetkileriniz olmayabilir. Proje sahibi ile iletişime geçin.

#### ❌ Hata: "constraint already exists"

- **Çözüm:** Bu normal! Migration dosyası zaten mevcut constraint'leri kontrol eder ve sadece yoksa ekler. Bu hata görmezden gelinebilir.

#### ⚠️ Uyarı: "Could not add foreign key constraint"

- **Çözüm:** Bu normal olabilir. Foreign key eklenemezse, tablo yine de çalışır. `users` tablosunun konumunu kontrol edin (`talkee.users` veya `public.users`).

---

### **Adım 7: Manuel Kontrol (Opsiyonel)**

Migration başarılı olduysa, manuel kontrol için şu query'yi çalıştırabilirsiniz:

```sql
-- Tablo yapısını kontrol et
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_devices'
ORDER BY ordinal_position;

-- RLS policy'lerini kontrol et
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_devices';

-- Index'leri kontrol et
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_devices';
```

---

## ✅ Migration Başarılı Oldu mu?

Migration başarılı olduysa:

1. ✅ Tablo yapısı güncellendi
2. ✅ `device_id` ve `app_version` kolonları eklendi (yoksa)
3. ✅ Unique constraint `(user_id, push_token)` eklendi
4. ✅ Index'ler oluşturuldu
5. ✅ RLS policy'ler ayarlandı
6. ✅ `updated_at` trigger'ı çalışıyor

---

## 🎯 Sonraki Adımlar

Migration tamamlandıktan sonra:

1. **Uygulamayı test edin:**

   - Uygulamayı açın
   - Push notification izni verin
   - Token'ın `user_devices` tablosuna kaydedildiğini kontrol edin

2. **Birden fazla cihaz testi:**

   - Farklı bir cihazda uygulamayı açın
   - Aynı kullanıcı ile giriş yapın
   - Her iki cihazın da token'ının kaydedildiğini kontrol edin

3. **Push notification gönderme:**
   - Backend servisi ile push notification göndermeyi test edin
   - Tüm aktif cihazlara bildirim gitmeli

---

## 📝 Notlar

- Migration **idempotent**'tir (güvenle birden fazla kez çalıştırılabilir)
- Mevcut veriler **korunur** (sadece yeni kolonlar eklenir)
- RLS policy'ler **yeniden oluşturulur** (eski policy'ler silinip yenileri eklenir)

---

## 🆘 Yardım Gerekirse

Eğer sorun yaşarsanız:

1. SQL Editor'daki hata mesajını kopyalayın
2. Migration dosyasının tamamını kontrol edin
3. Supabase loglarını kontrol edin (Settings > Database > Logs)
