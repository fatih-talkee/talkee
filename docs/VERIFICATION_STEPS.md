# Verification Adımları - user_devices Tablosu

## 🎯 Amaç

Migration'ın başarılı olduğunu doğrulamak için bu adımları takip edin.

---

## 📋 Adım Adım Kontrol

### **Adım 1: Supabase SQL Editor'ı Aç**

1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. Projenizi seçin
3. Sol menüden **"SQL Editor"** sekmesine tıklayın
4. **"New query"** butonuna tıklayın

---

### **Adım 2: Verification Query'lerini Çalıştır**

#### **Seçenek 1: Tek Tek Çalıştır (Önerilen)**

Her query'yi ayrı ayrı çalıştırarak sonuçları görebilirsiniz:

1. `docs/VERIFICATION_QUERIES.sql` dosyasını açın
2. İlk query'yi kopyalayın (1. TABLO YAPISINI KONTROL ET)
3. SQL Editor'a yapıştırın
4. **"Run"** butonuna tıklayın
5. Sonuçları kontrol edin
6. Sonraki query'ye geçin

#### **Seçenek 2: Hepsini Birden Çalıştır**

1. `docs/VERIFICATION_QUERIES.sql` dosyasının **tüm içeriğini** kopyalayın
2. SQL Editor'a yapıştırın
3. **"Run"** butonuna tıklayın
4. Tüm sonuçları aşağı kaydırarak kontrol edin

---

## ✅ Beklenen Sonuçlar

### **1. Tablo Yapısı**

**Beklenen:** 10 kolon görmelisiniz:

```
✅ id (uuid)
✅ user_id (uuid)
✅ push_token (text)
✅ platform (text)
✅ device_name (text, nullable)
✅ device_id (varchar, nullable) ← YENİ EKLENEN
✅ app_version (varchar, nullable) ← YENİ EKLENEN
✅ is_active (boolean)
✅ created_at (timestamp)
✅ updated_at (timestamp)
```

**Kontrol:** `column_name` sütununda 10 satır görmelisiniz.

---

### **2. RLS Durumu**

**Beklenen:**

```json
{
  "status": "RLS status",
  "tablename": "user_devices",
  "rls_enabled": true  ← Bu true olmalı!
}
```

**Kontrol:** `rls_enabled` değeri `true` olmalı.

---

### **3. RLS Policy'leri**

**Beklenen:** 4 policy görmelisiniz:

```
✅ "Users can view their own devices" (SELECT)
✅ "Users can insert their own devices" (INSERT)
✅ "Users can update their own devices" (UPDATE)
✅ "Users can delete their own devices" (DELETE)
```

**Kontrol:** `policyname` sütununda 4 satır görmelisiniz.

---

### **4. Index'ler** ✅ (Zaten kontrol ettiniz)

**Beklenen:** 5 index:

```
✅ user_devices_pkey (Primary key)
✅ user_devices_user_id_push_token_key (Unique constraint)
✅ idx_user_devices_user_id
✅ idx_user_devices_push_token
✅ idx_user_devices_is_active
```

---

### **5. Constraint'ler**

**Beklenen:** En az 4 constraint:

```
✅ Primary key constraint (id)
✅ Unique constraint (user_id, push_token)
✅ Check constraint (platform IN ('ios', 'android', 'web'))
✅ Foreign key constraint (user_id -> users) (opsiyonel)
```

**Kontrol:** `constraint_name` sütununda en az 3-4 satır görmelisiniz.

---

### **6. Trigger'lar**

**Beklenen:** 1 trigger:

```
✅ update_user_devices_updated_at (BEFORE UPDATE)
```

**Kontrol:** `trigger_name` sütununda 1 satır görmelisiniz.

---

## 🎯 Hızlı Kontrol (Tek Query)

Eğer hızlı bir kontrol yapmak isterseniz:

1. **`docs/QUICK_VERIFICATION.sql`** dosyasını açın
2. Tüm içeriği kopyalayın
3. SQL Editor'a yapıştırın ve çalıştırın

Veya bu query'yi kullanın:

```sql
SELECT
  'Table exists' as check_item,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_devices'
    ) THEN 'true'
    ELSE 'false'
  END as result
UNION ALL
SELECT
  'RLS enabled',
  CASE
    WHEN rowsecurity THEN 'true'
    ELSE 'false'
  END
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_devices'
UNION ALL
SELECT
  'Column count',
  COUNT(*)::text
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_devices'
UNION ALL
SELECT
  'Policy count',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_devices'
UNION ALL
SELECT
  'Index count',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'user_devices'
UNION ALL
SELECT
  'Trigger count',
  COUNT(*)::text
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'user_devices';
```

**Beklenen Sonuçlar:**

```
✅ Table exists: true
✅ RLS enabled: true
✅ Column count: 10
✅ Policy count: 4
✅ Index count: 5
✅ Trigger count: 1
```

---

## ❌ Sorun Varsa

### **Problem: Kolon sayısı 10 değil**

- **Çözüm:** Migration'ı tekrar çalıştırın. `device_id` ve `app_version` kolonları eklenmemiş olabilir.

### **Problem: RLS enabled = false**

- **Çözüm:** Migration dosyasındaki `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` satırını manuel olarak çalıştırın.

### **Problem: Policy sayısı 4 değil**

- **Çözüm:** Migration dosyasındaki RLS policy bölümünü tekrar çalıştırın.

### **Problem: Trigger yok**

- **Çözüm:** Migration dosyasındaki trigger bölümünü tekrar çalıştırın.

---

## ✅ Tüm Kontroller Başarılı mı?

Eğer tüm sonuçlar beklenen değerlerle eşleşiyorsa:

🎉 **Migration başarılı!** Artık notification sistemi kullanıma hazır.

---

## 📝 Sonraki Adımlar

1. **Uygulamayı test edin:**

   - Uygulamayı açın
   - Push notification izni verin
   - Token'ın kaydedildiğini kontrol edin

2. **Veritabanında kontrol edin:**

   ```sql
   SELECT * FROM public.user_devices
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC;
   ```

3. **Birden fazla cihaz testi:**
   - Farklı bir cihazda uygulamayı açın
   - Aynı kullanıcı ile giriş yapın
   - Her iki cihazın da token'ının kaydedildiğini kontrol edin
