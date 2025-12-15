# 📄 Invoice URL - Stripe'dan Çekme

## ✅ Çözüm

URL yoksa Stripe'dan invoice'u çekip URL'yi almak için yeni bir edge function oluşturuldu.

## 🔧 Yapılan Değişiklikler

### 1. Yeni Edge Function: `get-invoice-url`

**Dosya:** `supabase/functions/get-invoice-url/index.ts`

**Özellikler:**

- Stripe invoice ID veya payment intent ID ile invoice'u çeker
- Invoice finalize edilmemişse finalize eder
- `hosted_invoice_url` veya `invoice_pdf` URL'sini döner
- URL bulunursa database'deki invoice'u günceller (opsiyonel)

**Kullanım:**

```typescript
const { data, error } = await supabase.functions.invoke('get-invoice-url', {
  body: {
    invoice_id: invoice.id,
    stripe_invoice_id: invoice.metadata?.stripe_invoice_id,
    payment_intent_id: invoice.metadata?.payment_intent_id,
  },
});
```

### 2. Frontend Güncellemesi

**Dosya:** `app/invoices/index.tsx`

**Değişiklikler:**

- `handleViewInvoice` fonksiyonu güncellendi
- URL yoksa Stripe'dan çekmeyi dener
- URL bulunursa otomatik olarak açar
- URL bulunamazsa invoice detaylarını gösterir

## 📋 Yapılacaklar

### Adım 1: Edge Function'ı Deploy Et

```bash
supabase functions deploy get-invoice-url
```

### Adım 2: Config Güncellemesi

`supabase/config.toml` dosyasına function eklendi. Eğer manuel deploy yapıyorsanız, config'i de güncellemeyi unutmayın.

### Adım 3: Test Et

1. Invoice sayfasına gidin
2. URL'si olmayan bir invoice'u seçin
3. "View Invoice" butonuna tıklayın
4. Stripe'dan URL çekilmeli ve açılmalı

## 🔍 Nasıl Çalışıyor?

1. **URL Kontrolü:**

   - Önce `pdf_url`, `metadata.hosted_url` vb. kontrol edilir
   - URL varsa direkt açılır

2. **Stripe'dan Çekme:**

   - URL yoksa ve `stripe_invoice_id` veya `payment_intent_id` varsa
   - Edge function'a request gönderilir
   - Stripe'dan invoice çekilir
   - URL alınır

3. **URL Açma:**

   - URL bulunursa otomatik olarak açılır
   - Database'deki invoice güncellenir (opsiyonel, async)

4. **Fallback:**
   - URL bulunamazsa invoice detayları alert olarak gösterilir

## 🆘 Sorun Giderme

### Edge Function Çalışmıyor

**Kontrol 1: Deploy Edildi mi?**

```bash
supabase functions list
```

**Kontrol 2: Config Doğru mu?**

- `supabase/config.toml` dosyasında `[functions.get-invoice-url]` var mı?

**Kontrol 3: Loglar**

- Supabase Dashboard → Edge Functions → get-invoice-url → Logs
- Hata mesajlarını kontrol edin

### URL Hala Bulunamıyor

**Kontrol 1: Stripe Invoice ID Var mı?**

```sql
SELECT metadata->>'stripe_invoice_id', metadata->>'payment_intent_id
FROM invoices
WHERE id = 'invoice_id';
```

**Kontrol 2: Stripe Dashboard**

- Stripe Dashboard → Invoices
- Invoice ID ile arayın
- Invoice görünüyor mu?

**Kontrol 3: Invoice Finalize Edildi mi?**

- Edge function otomatik olarak finalize eder
- Ama eğer hata varsa logları kontrol edin

## 📚 İlgili Dosyalar

- `supabase/functions/get-invoice-url/index.ts` - Edge function
- `app/invoices/index.tsx` - Frontend (handleViewInvoice)
- `supabase/config.toml` - Function config
