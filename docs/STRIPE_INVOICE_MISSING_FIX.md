# 📄 Stripe Invoice Oluşturulamama Sorunu

## ❌ Sorun

Invoice kayıtlarında `stripe_invoice_id` ve `pdf_url` null. Stripe invoice oluşturulamıyor.

## 🔍 Neden?

1. **Customer ID Yok:**

   - Stripe invoice oluşturmak için `customerId` gerekli
   - `customerId` oluşturmak için `primary_email` gerekli
   - Eğer `primary_email` yoksa customer oluşturulamıyor
   - Customer yoksa invoice oluşturulamıyor

2. **Email Kaynakları:**

   - `user.primary_email` (users tablosunda)
   - `paymentIntent.receipt_email` (Stripe'dan)
   - `paymentIntent.customer_email` (Stripe'dan)

3. **Mevcut Kod:**
   - Sadece `user.primary_email` kontrol ediliyordu
   - Eğer yoksa customer oluşturulmuyordu
   - Invoice oluşturulmuyordu

## ✅ Çözüm

### 1. Email Kaynakları Genişletildi

**Önceki Kod:**

```typescript
if (!customerId && user.primary_email) {
  // Create customer
}
```

**Yeni Kod:**

```typescript
if (!customerId) {
  const userEmail =
    user.primary_email ||
    paymentIntent.receipt_email ||
    paymentIntent.customer_email;

  if (userEmail) {
    // Create customer
  }
}
```

### 2. Daha İyi Logging

Customer oluşturulamazsa veya invoice oluşturulamazsa detaylı loglar:

- Email kaynakları
- Hata mesajları
- Error codes

### 3. Invoice Oluşturma Kontrolü

Invoice oluşturulmazsa neden loglanıyor:

- Customer ID yok mu?
- Email yok mu?
- Stripe hatası mı?

## 🔧 Yapılacaklar

### Adım 1: Webhook'u Redeploy Et

```bash
supabase functions deploy stripe-webhook
```

### Adım 2: Yeni Payment Yap

Eski invoice'lar için Stripe invoice yok. Yeni bir payment yapın:

1. Wallet sayfasına gidin
2. Credit package seçin
3. Payment yapın
4. Invoice kontrol edin

### Adım 3: Logları Kontrol Et

Supabase Dashboard → Edge Functions → stripe-webhook → Logs

**Aranacak Loglar:**

✅ **Başarılı:**

```
"Stripe customer created:" - customer_id, email
"Stripe invoice created:" - invoice_id, pdf_url
```

❌ **Hata:**

```
"Failed to create Stripe customer:" - error, email
"Skipping Stripe invoice creation - no customer ID:" - email sources
"Failed to create Stripe invoice:" - error, customer_id
```

## 🆘 Sorun Giderme

### Customer Oluşturulamıyor

**Kontrol 1: Email Var mı?**

```sql
SELECT id, name, primary_email
FROM users
WHERE id = 'your_user_id';
```

**Kontrol 2: Payment Intent'te Email Var mı?**

- Stripe Dashboard → Payments → Payment Intents
- Payment intent ID ile arayın
- `receipt_email` veya `customer_email` var mı?

**Kontrol 3: Loglar**

- `"Failed to create Stripe customer:"` mesajını arayın
- Hangi email kaynakları kontrol edildi?

### Invoice Oluşturulamıyor

**Kontrol 1: Customer ID Var mı?**

```sql
SELECT id, name, stripe_customer_id
FROM users
WHERE id = 'your_user_id';
```

**Kontrol 2: Stripe Customer Var mı?**

- Stripe Dashboard → Customers
- Customer ID ile arayın
- Customer görünüyor mu?

**Kontrol 3: Loglar**

- `"Skipping Stripe invoice creation - no customer ID:"` mesajını arayın
- `"Failed to create Stripe invoice:"` mesajını arayın
- Hata detayları neler?

## 📝 Notlar

- **Eski Invoice'lar:** Stripe invoice yok, çünkü customer oluşturulamadı
- **Yeni Invoice'lar:** Customer ve invoice oluşturulmalı (email varsa)
- **Fallback:** `get-invoice-url` edge function ile Stripe'dan çekilebilir

## 📚 İlgili Dosyalar

- `supabase/functions/stripe-webhook/index.ts` - Webhook function
- `supabase/functions/get-invoice-url/index.ts` - URL çekme function
