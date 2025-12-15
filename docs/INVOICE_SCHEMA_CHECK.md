# 📋 Invoice Schema Kontrolü ve Test

## ✅ Status Check Constraint

Status constraint uygun:

- ✅ `'pending'` - Beklemede
- ✅ `'paid'` - Ödendi (credit purchase için kullanıyoruz)
- ✅ `'cancelled'` - İptal edildi
- ✅ `'refunded'` - İade edildi

## 🔍 Kontrol Edilmesi Gerekenler

### 1. NOT NULL Constraints

Aşağıdaki sorguyu çalıştırın:

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;
```

**Önemli Kontroller:**

- `call_id` - NULL olabilmeli (credit purchase için)
- `professional_id` - NULL olabilmeli veya geçerli bir professional ID olmalı
- `caller_id` - NOT NULL olmalı (✅ kullanıyoruz)

### 2. FOREIGN KEY Constraints

Aşağıdaki sorguyu çalıştırın:

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'invoices';
```

**Önemli Kontroller:**

- `professional_id` → `professionals.id` - Eğer user_id kullanıyorsak, bu hata verebilir
- `caller_id` → `users.id` - ✅ Uygun
- `call_id` → `calls.id` - NULL olabilmeli

## 🧪 Test

### Adım 1: Schema Kontrolü

```bash
# Supabase SQL Editor'da çalıştırın
docs/sql/check_invoices_schema.sql
```

### Adım 2: Test Insert

```bash
# Test invoice insert
docs/sql/test_invoice_insert.sql
```

**Not:** Test script'inde `v_user_id` değerini kendi user ID'nizle değiştirin.

## 🔧 Olası Sorunlar ve Çözümler

### Sorun 1: `professional_id` FOREIGN KEY Hatası

**Hata:**

```
ERROR: insert or update on table "invoices" violates foreign key constraint
DETAIL: Key (professional_id)=(9a366b55-...) is not present in table "professionals".
```

**Çözüm 1: Schema'yı Güncelle (Önerilen)**

```sql
-- professional_id'yi nullable yap
ALTER TABLE invoices
ALTER COLUMN professional_id DROP NOT NULL;

-- Foreign key constraint'i kaldır veya güncelle
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_professional_id_fkey;
```

**Çözüm 2: System Professional Oluştur**

```sql
-- System professional oluştur (credit purchase için)
INSERT INTO professionals (
  id,
  user_id,
  name,
  status,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'System - Credit Purchase',
  'active',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sonra webhook'ta bu ID'yi kullan
```

### Sorun 2: `call_id` NOT NULL Hatası

**Hata:**

```
ERROR: null value in column "call_id" violates not-null constraint
```

**Çözüm:**

```sql
ALTER TABLE invoices
ALTER COLUMN call_id DROP NOT NULL;
```

### Sorun 3: `call_date` NOT NULL Hatası

**Hata:**

```
ERROR: null value in column "call_date" violates not-null constraint
```

**Çözüm:**

```sql
-- call_date için invoice_date kullanıyoruz, bu sorun olmamalı
-- Ama eğer hata alırsanız:
ALTER TABLE invoices
ALTER COLUMN call_date DROP NOT NULL;
```

## ✅ Başarılı Test Sonucu

Eğer test başarılı olursa:

```
✅ Invoice insert başarılı! Invoice ID: [uuid]
Invoice Number: INV-1734268800-ABCD1234
```

Sonra invoices sayfasında görünmeli:

- Invoice number
- Amount
- Status: `paid`
- Type: `credit_purchase` (metadata'da)

## 📚 İlgili Dosyalar

- `docs/sql/check_invoices_schema.sql` - Schema kontrol sorguları
- `docs/sql/test_invoice_insert.sql` - Test insert script'i
- `supabase/functions/stripe-webhook/index.ts` - Webhook function
