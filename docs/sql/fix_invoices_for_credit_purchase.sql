-- ============================================================================
-- FIX INVOICES TABLE FOR CREDIT PURCHASE
-- ============================================================================
-- Credit purchase için invoice oluşturabilmek için schema'yı güncelle

-- 1. professional_id'yi nullable yap (credit purchase için call yok)
ALTER TABLE invoices
ALTER COLUMN professional_id DROP NOT NULL;

-- 2. call_id'yi nullable yap (credit purchase için call yok)
ALTER TABLE invoices
ALTER COLUMN call_id DROP NOT NULL;

-- 3. professional_id foreign key constraint'ini kaldır (opsiyonel - eğer hata verirse)
-- NOT: Eğer foreign key hatası alırsanız, bu constraint'i kaldırın
-- ALTER TABLE invoices
-- DROP CONSTRAINT IF EXISTS invoices_professional_id_fkey;

-- 4. call_id foreign key constraint'ini kaldır (opsiyonel - eğer hata verirse)
-- NOT: Eğer foreign key hatası alırsanız, bu constraint'i kaldırın
-- ALTER TABLE invoices
-- DROP CONSTRAINT IF EXISTS invoices_call_id_fkey;

-- 5. Kontrol et
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name IN ('professional_id', 'call_id')
ORDER BY column_name;
