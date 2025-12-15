# 🔧 add_user_credits "User not found" Hatası - Çözüm Rehberi

## ❌ Sorun

`add_user_credits` function'ı çalıştırıldığında şu hata alınıyor:

```
ERROR: P0001: User not found: 9a366b55-a9ff-4e43-ada6-35b08a59ecaa
CONTEXT: PL/pgSQL function add_user_credits(uuid,numeric,text,text,text) line 11 at RAISE
```

## 🔍 Neden Oluyor?

Function'ın içinde şu kontrol var:

```sql
SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_user_exists;

IF NOT v_user_exists THEN
  RAISE EXCEPTION 'User not found: %', p_user_id;
END IF;
```

Bu, `users` tablosunda bu `user_id` ile bir kayıt olmadığı anlamına gelir.

## ✅ Çözüm Adımları

### 1. User'ın Gerçekten Var Olup Olmadığını Kontrol Edin

Supabase SQL Editor'de şu sorguyu çalıştırın:

```sql
-- User'ı kontrol et
SELECT
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance,
  created_at
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

**Eğer sonuç boşsa:**

- User `users` tablosunda yok
- Ama `auth.users` tablosunda olabilir (OAuth login sonrası sync olmamış olabilir)

### 2. Auth.users Tablosunda Var mı Kontrol Edin

```sql
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

**Eğer burada varsa ama `users` tablosunda yoksa:**

- User sync sorunu var
- OAuth login sonrası user `users` tablosuna eklenmemiş

### 3. User Sync Sorununu Çözün

Eğer user `auth.users`'da var ama `users` tablosunda yoksa:

#### Seçenek A: User'ı Manuel Olarak Ekleyin

```sql
-- Auth.users'dan user bilgilerini al
SELECT id, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;

-- Sonra users tablosuna ekleyin (gerekli alanları doldurun)
INSERT INTO users (
  id,
  auth_id,
  name,
  primary_email,
  wallet_balance,
  role,
  created_at
)
VALUES (
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  'User Name', -- auth.users'dan alın
  'user@example.com', -- auth.users'dan alın
  0.00,
  'user',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

#### Seçenek B: Auth Trigger Kontrolü

`auth.users` tablosuna insert olduğunda `users` tablosuna da ekleyen bir trigger olmalı. Kontrol edin:

```sql
-- Trigger var mı kontrol et
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name LIKE '%auth%';
```

### 4. Function'ı Test Edin

User eklendikten sonra:

```sql
-- Function'ı test et
SELECT add_user_credits(
  '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid,
  10.00,
  'purchase',
  'Test credit',
  NULL
);

-- Balance güncellendi mi kontrol et
SELECT wallet_balance
FROM users
WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid;
```

## 🔍 Olası Senaryolar

### Senaryo 1: User Gerçekten Yok

- **Çözüm:** User'ı oluşturun veya doğru `user_id` kullanın

### Senaryo 2: User auth.users'da Var Ama users Tablosunda Yok

- **Çözüm:** User sync trigger'ını kontrol edin veya manuel ekleyin

### Senaryo 3: User ID Yanlış Format

- **Çözüm:** UUID formatını kontrol edin: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Senaryo 4: RLS (Row Level Security) Sorunu

- **Çözüm:** Function `SECURITY DEFINER` kullanıyor, bu normalde RLS'yi bypass eder. Ama yine de kontrol edin:

```sql
-- RLS policies kontrol et
SELECT * FROM pg_policies
WHERE tablename = 'users';
```

## 📋 Checklist

- [ ] User `users` tablosunda var mı kontrol edildi
- [ ] User `auth.users` tablosunda var mı kontrol edildi
- [ ] Eğer yoksa, user eklendi
- [ ] Function test edildi ve çalışıyor
- [ ] Wallet balance güncellendi

## 🆘 Hala Sorun Varsa

### Debug İçin SQL Sorguları

```sql
-- 1. Tüm users tablosundaki user'ları listele
SELECT id, name, primary_email, wallet_balance
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Function'ın user'ı bulup bulamadığını test et
SELECT EXISTS(
  SELECT 1 FROM users
  WHERE id = '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'::uuid
) as user_exists;

-- 3. Function definition'ı kontrol et
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'add_user_credits';
```

## 📚 İlgili Dokümanlar

- `docs/sql/update_add_user_credits_function.sql` - Function definition
- `docs/sql/check_user_exists.sql` - User kontrol sorguları
