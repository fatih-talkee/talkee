# 📄 Invoice URL Sorunu ve Çözümü

## ❌ Sorun

Invoice'lar oluşturuluyor ama `pdf_url` null. "View Invoice" butonu çalışmıyor.

## 🔍 Neden?

1. **Stripe Invoice URL'leri:**

   - `hosted_invoice_url`: Web'de görüntüleme URL'si
   - `invoice_pdf`: PDF indirme URL'si
   - Her ikisi de invoice finalize edildikten sonra oluşur

2. **Mevcut Kod:**

   - Sadece `hosted_invoice_url` kontrol ediliyordu
   - `invoice_pdf` kontrol edilmiyordu
   - Eğer `hosted_invoice_url` yoksa, `invoice_pdf` de denenmeli

3. **Olası Senaryolar:**
   - Stripe invoice oluşturuldu ama `hosted_invoice_url` null (bazı durumlarda olabilir)
   - `invoice_pdf` her zaman daha güvenilir

## ✅ Çözüm

### 1. Webhook'ta URL Kontrolü İyileştirildi

```typescript
// Önceki kod (sadece hosted_invoice_url):
invoicePdfUrl = finalizedInvoice.hosted_invoice_url || null;

// Yeni kod (hem hosted_invoice_url hem invoice_pdf):
invoicePdfUrl =
  finalizedInvoice.hosted_invoice_url || finalizedInvoice.invoice_pdf || null;
```

### 2. Metadata'ya URL Eklendi

Invoice metadata'sına URL'ler eklendi:

```typescript
metadata: {
  type: 'credit_purchase',
  payment_intent_id: paymentIntent.id,
  stripe_invoice_id: stripeInvoiceId || null,
  credits: amount,
  hosted_url: invoicePdfUrl || null,  // Yeni
  invoice_pdf: invoicePdfUrl || null, // Yeni
}
```

### 3. Daha İyi Logging

Stripe invoice oluşturulurken tüm URL'ler loglanıyor:

```typescript
console.log('Stripe invoice created:', {
  invoice_id: stripeInvoiceId,
  hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
  invoice_pdf: finalizedInvoice.invoice_pdf,
  pdf_url: invoicePdfUrl,
});
```

## 🔧 Yapılacaklar

### Adım 1: Webhook'u Redeploy Et

```bash
supabase functions deploy stripe-webhook
```

### Adım 2: Yeni Payment Yap

Eski invoice'lar için URL yok (Stripe invoice oluşturulurken URL alınamadı). Yeni bir payment yapın:

1. Wallet sayfasına gidin
2. Credit package seçin
3. Payment yapın
4. Invoice kontrol edin

### Adım 3: Logları Kontrol Et

Supabase Dashboard → Edge Functions → stripe-webhook → Logs

Aranacak loglar:

```
✅ "Stripe invoice created:" - invoice_id, hosted_invoice_url, invoice_pdf, pdf_url
❌ "Failed to create Stripe invoice:" - Hata detayları
```

## 🆘 Sorun Giderme

### URL Hala Null

**Kontrol 1: Customer ID Var mı?**

```sql
SELECT id, name, stripe_customer_id, primary_email
FROM users
WHERE id = 'your_user_id';
```

**Kontrol 2: Stripe Invoice Oluşturuldu mu?**

- Supabase Dashboard → Edge Functions → stripe-webhook → Logs
- `"Stripe invoice created:"` mesajını arayın
- `invoice_id` var mı?

**Kontrol 3: Stripe Dashboard'da Invoice Var mı?**

- Stripe Dashboard → Invoices
- Payment intent ID ile arayın
- Invoice görünüyor mu?

### Customer ID Yok

Eğer `stripe_customer_id` null ise:

- Webhook otomatik olarak customer oluşturmalı
- Loglarda `"Stripe customer created:"` mesajını arayın
- Eğer yoksa, `primary_email` null olabilir

## 📝 Notlar

- **Eski Invoice'lar:** URL yok, çünkü Stripe invoice oluşturulurken URL alınamadı
- **Yeni Invoice'lar:** URL olmalı (webhook güncellendi)
- **Fallback:** URL yoksa invoice detayları alert olarak gösteriliyor (frontend'de zaten var)

## 📚 İlgili Dosyalar

- `supabase/functions/stripe-webhook/index.ts` - Webhook function
- `app/invoices/index.tsx` - Invoice sayfası (View Invoice butonu)
