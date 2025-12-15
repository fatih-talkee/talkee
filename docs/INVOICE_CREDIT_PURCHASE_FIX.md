# 📄 Credit Purchase Invoice Oluşturma - Çözüm

## ❌ Sorun

Payment başarılı oldu ama `invoices` tablosuna kayıt oluşmadı.

## 🔍 Neden?

Webhook'ta Stripe invoice oluşturuluyordu ama Supabase'deki `invoices` tablosuna kayıt yapılmıyordu.

## ✅ Çözüm

Webhook'a invoice insert eklendi:

```typescript
// Create invoice record (for credit purchase)
if (stripeInvoiceId) {
  const invoiceNumber = `INV-${Date.now()}-${paymentIntent.id
    .slice(-8)
    .toUpperCase()}`;
  const invoiceDate = new Date().toISOString();

  await supabase.from('invoices').insert({
    call_id: null, // Credit purchase has no call
    caller_id: user_id,
    professional_id: user_id, // Temporary: using user_id as professional_id
    invoice_number: invoiceNumber,
    subtotal: amount,
    service_fee: 0,
    tax: 0,
    total_amount: amount,
    currency: paymentIntent.currency || 'usd',
    call_duration_minutes: 0,
    rate_per_minute: 0,
    call_date: invoiceDate,
    invoice_date: invoiceDate,
    due_date: null,
    paid_at: invoiceDate,
    status: 'paid',
    pdf_url: invoicePdfUrl,
    image_url: null,
    notes: `Credit purchase - ${amount} credits`,
    metadata: {
      type: 'credit_purchase',
      payment_intent_id: paymentIntent.id,
      stripe_invoice_id: stripeInvoiceId,
      credits: amount,
    },
  });
}
```

## ⚠️ Önemli Not

Invoice tablosu **call-based** bir yapıya sahip:

- `call_id`: Call için gerekli, credit purchase için `null`
- `professional_id`: Call için gerekli, credit purchase için geçici olarak `user_id` kullanılıyor

**Eğer hata alırsanız:**

- `professional_id` foreign key constraint hatası alabilirsiniz
- Bu durumda invoice tablosunun schema'sını güncellemeniz gerekebilir

## 🔧 Schema Güncellemesi (Gerekirse)

Eğer `professional_id` foreign key hatası alırsanız:

```sql
-- Option 1: professional_id'yi nullable yapmak (önerilir)
ALTER TABLE invoices
ALTER COLUMN professional_id DROP NOT NULL;

-- Option 2: call_id'yi nullable yapmak
ALTER TABLE invoices
ALTER COLUMN call_id DROP NOT NULL;
```

## 📋 Test

1. **Payment yapın**
2. **Invoices sayfasına gidin**
3. **Credit purchase invoice görünmeli:**
   - Invoice number: `INV-...`
   - Amount: Payment amount
   - Status: `paid`
   - PDF URL: Stripe invoice URL (varsa)

## 🆘 Sorun Giderme

### Hata: "professional_id foreign key constraint"

**Neden:** `professional_id` `professionals` tablosuna referans veriyor ama `user_id` professionals tablosunda yok.

**Çözüm:**

1. Schema'yı güncelleyin (yukarıdaki SQL)
2. Veya system professional oluşturun ve onu kullanın

### Hata: "call_id NOT NULL constraint"

**Neden:** `call_id` zorunlu ama credit purchase için call yok.

**Çözüm:**

```sql
ALTER TABLE invoices
ALTER COLUMN call_id DROP NOT NULL;
```

---

## 📚 İlgili Dosyalar

- `supabase/functions/stripe-webhook/index.ts` - Webhook function
- `app/invoices/index.tsx` - Invoices sayfası
- `docs/sql/check_invoices_schema.sql` - Schema kontrol sorguları
