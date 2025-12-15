-- ============================================================================
-- TEST INVOICE INSERT FOR CREDIT PURCHASE
-- ============================================================================
-- Bu script credit purchase için invoice insert'i test eder
-- Önce schema'yı kontrol edin, sonra bu script'i çalıştırın

-- 1. ÖNCE: Schema'yı kontrol et (check_invoices_schema.sql çalıştırın)
-- 2. SONRA: Bu test script'ini çalıştırın

-- Test için gerekli bilgiler (kendi değerlerinizle değiştirin)
DO $$
DECLARE
  v_user_id UUID := '9a366b55-a9ff-4e43-ada6-35b08a59ecaa'; -- Test user ID
  v_test_amount DECIMAL(10,2) := 50.00;
  v_test_payment_intent_id TEXT := 'pi_test_' || gen_random_uuid()::TEXT;
  v_test_stripe_invoice_id TEXT := 'in_test_' || gen_random_uuid()::TEXT;
  v_invoice_number TEXT;
  v_invoice_date TIMESTAMPTZ;
  v_result UUID;
BEGIN
  -- Generate invoice number
  v_invoice_number := 'INV-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(SUBSTRING(v_test_payment_intent_id, -8));
  v_invoice_date := NOW();

  -- Test insert
  INSERT INTO invoices (
    call_id,
    caller_id,
    professional_id,
    invoice_number,
    subtotal,
    service_fee,
    tax,
    total_amount,
    currency,
    call_duration_minutes,
    rate_per_minute,
    call_date,
    invoice_date,
    due_date,
    paid_at,
    status,
    pdf_url,
    image_url,
    notes,
    metadata
  ) VALUES (
    NULL, -- call_id: null for credit purchase
    v_user_id, -- caller_id: user who purchased
    v_user_id, -- professional_id: temporary, using user_id
    v_invoice_number,
    v_test_amount, -- subtotal
    0, -- service_fee
    0, -- tax
    v_test_amount, -- total_amount
    'usd', -- currency
    0, -- call_duration_minutes
    0, -- rate_per_minute
    v_invoice_date, -- call_date
    v_invoice_date, -- invoice_date
    NULL, -- due_date
    v_invoice_date, -- paid_at
    'paid', -- status
    NULL, -- pdf_url (optional)
    NULL, -- image_url
    'Credit purchase - ' || v_test_amount || ' credits', -- notes
    jsonb_build_object(
      'type', 'credit_purchase',
      'payment_intent_id', v_test_payment_intent_id,
      'stripe_invoice_id', v_test_stripe_invoice_id,
      'credits', v_test_amount
    ) -- metadata
  )
  RETURNING id INTO v_result;

  RAISE NOTICE '✅ Invoice insert başarılı! Invoice ID: %', v_result;
  RAISE NOTICE 'Invoice Number: %', v_invoice_number;

  -- Test invoice'u sil (opsiyonel)
  -- DELETE FROM invoices WHERE id = v_result;
  -- RAISE NOTICE 'Test invoice silindi';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Hata: %', SQLERRM;
    RAISE NOTICE 'Error Code: %', SQLSTATE;
    
    -- Hata türüne göre öneri
    IF SQLSTATE = '23503' THEN
      RAISE NOTICE '💡 FOREIGN KEY hatası - professional_id veya caller_id geçersiz';
      RAISE NOTICE '   Çözüm: professional_id için geçerli bir professional ID kullanın veya schema''yı güncelleyin';
    ELSIF SQLSTATE = '23502' THEN
      RAISE NOTICE '💡 NOT NULL hatası - Zorunlu bir alan NULL';
      RAISE NOTICE '   Çözüm: Schema''yı güncelleyin (ALTER TABLE invoices ALTER COLUMN ... DROP NOT NULL)';
    ELSIF SQLSTATE = '23514' THEN
      RAISE NOTICE '💡 CHECK constraint hatası - Status değeri geçersiz';
      RAISE NOTICE '   Çözüm: Status değerini kontrol edin (pending, paid, cancelled, refunded)';
    END IF;
END $$;

-- Sonuçları kontrol et
SELECT 
  id,
  invoice_number,
  caller_id,
  professional_id,
  total_amount,
  status,
  metadata->>'type' as invoice_type,
  created_at
FROM invoices
WHERE metadata->>'type' = 'credit_purchase'
ORDER BY created_at DESC
LIMIT 5;
