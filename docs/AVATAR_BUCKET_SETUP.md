# 📦 Avatar Bucket Setup Guide

## ❌ Sorun

Avatar yüklerken şu hatayı alıyorsunuz:
```
Storage bucket 'avatars' does not exist. Please create it in Supabase Dashboard → Storage → New Bucket
```

## ✅ Çözüm: Bucket Oluşturma

### Adım 1: Supabase Dashboard'a Gidin

1. [Supabase Dashboard](https://supabase.com/dashboard) açın
2. Projenizi seçin
3. Sol menüden **Storage** → **Buckets** seçin

### Adım 2: Yeni Bucket Oluşturun

1. **"New bucket"** butonuna tıklayın
2. Aşağıdaki ayarları yapın:
   - **Name:** `avatars` (tam olarak bu isim, küçük harf)
   - **Public bucket:** ✅ **YES** (önemli! Avatar'lar herkese açık olmalı)
   - **File size limit:** 5 MB (veya istediğiniz limit)
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp` (opsiyonel)
3. **"Create bucket"** butonuna tıklayın

### Adım 3: RLS Policies Kontrolü

Bucket oluşturduktan sonra, RLS policies'lerin doğru olduğundan emin olun:

1. **Storage** → **Policies** sekmesine gidin
2. `avatars` bucket'ı için şu policy'lerin olduğunu kontrol edin:
   - ✅ "Users can upload their own avatars" (INSERT)
   - ✅ "Users can update their own avatars" (UPDATE)
   - ✅ "Users can delete their own avatars" (DELETE)
   - ✅ "Public can view avatars" (SELECT)

Eğer policy'ler yoksa, `docs/sql/create_avatars_bucket.sql` dosyasındaki SQL'i çalıştırın.

### Adım 4: Test Edin

1. Uygulamayı yeniden başlatın
2. Profil sayfasına gidin
3. Avatar yüklemeyi deneyin
4. Artık çalışmalı! ✅

## 🔍 Doğrulama

Bucket'ın oluşturulduğunu kontrol etmek için:

```sql
SELECT * FROM storage.buckets WHERE name = 'avatars';
```

Sonuç dönmeli ve `public: true` olmalı.

## ⚠️ Önemli Notlar

- Bucket adı tam olarak `avatars` olmalı (küçük harf, çoğul)
- Bucket **mutlaka public** olmalı (avatar'lar herkese açık olmalı)
- RLS policies doğru yapılandırılmalı
- Bucket oluşturduktan sonra uygulamayı yeniden başlatın

## 🐛 Sorun Giderme

### Hala "Bucket does not exist" hatası alıyorsanız:

1. **Bucket adını kontrol edin:** Tam olarak `avatars` olmalı
2. **Public ayarını kontrol edin:** Bucket public olmalı
3. **Uygulamayı yeniden başlatın:** Cache sorunu olabilir
4. **Supabase projenizi kontrol edin:** Doğru projede olduğunuzdan emin olun

### RLS Policy hatası alıyorsanız:

1. `docs/sql/create_avatars_bucket.sql` dosyasındaki SQL'i çalıştırın
2. Policy'lerin doğru oluşturulduğunu kontrol edin:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'objects' 
     AND schemaname = 'storage'
     AND policyname LIKE '%avatar%';
   ```

