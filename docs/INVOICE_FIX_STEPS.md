# 📋 Invoice Fix - Adım Adım Yapılacaklar

## ✅ Tamamlanan Adımlar

1. ✅ Invoice insert kodu webhook'a eklendi
2. ✅ Schema kontrolü yapıldı - hata yok
3. ✅ Test insert başarılı - hata yok

---

## 🔄 Şimdi Yapılacaklar (Sırasıyla)

### Adım 1: Webhook'u Redeploy Et

Webhook'a invoice insert kodu eklendi, şimdi deploy etmeniz gerekiyor:

```bash
# Terminal'de çalıştırın
supabase functions deploy stripe-webhook
```

**Beklenen Çıktı:**

```
Deploying function stripe-webhook...
Function deployed successfully!
```

---

### Adım 2: Test Payment Yap

1. **Uygulamayı açın**
2. **Wallet sayfasına gidin** (`/(tabs)/wallet`)
3. **Bir credit package seçin** (örn: 250 credits)
4. **"Purchase Credits" butonuna tıklayın**
5. **Stripe payment modal'ında test kartı ile ödeme yapın:**
   - Kart: `4242 4242 4242 4242`
   - Tarih: Gelecek bir tarih (örn: `12/25`)
   - CVC: Herhangi bir 3 haneli sayı (örn: `123`)
   - ZIP: Herhangi bir 5 haneli sayı (örn: `12345`)

---

### Adım 3: Invoice Kontrolü

Payment başarılı olduktan sonra:

#### 3.1. Invoices Sayfasına Gidin

- **Profile** → **Invoices** (veya direkt `/invoices` route'u)

#### 3.2. Kontrol Edin

✅ **Görünmesi Gerekenler:**

- Invoice number: `INV-...` formatında
- Amount: Ödediğiniz miktar
- Status: `Paid`
- Date: Bugünün tarihi
- Type: `Credit Purchase` (metadata'da)

❌ **Eğer görünmüyorsa:**

- Webhook loglarını kontrol edin
- Supabase Dashboard → Edge Functions → stripe-webhook → Logs

---

### Adım 4: Webhook Log Kontrolü (Opsiyonel)

Eğer invoice görünmüyorsa:

1. **Supabase Dashboard'a gidin**
2. **Edge Functions** → **stripe-webhook**
3. **Logs** sekmesine tıklayın
4. **Son payment'ın loglarını kontrol edin:**

**Aranacak Loglar:**

```
✅ "Invoice created successfully:" - Invoice oluşturuldu
❌ "Error creating invoice:" - Hata var, log mesajını kontrol edin
```

---

### Adım 5: Sonuç Paylaş

Test sonucunu paylaşın:

- ✅ Invoice görünüyor mu?
- ❌ Hata var mı? (varsa log mesajı)

---

## 🎯 Başarılı Test Sonrası

Eğer invoice başarıyla görünüyorsa:

✅ **Invoice fix tamamlandı!**

Sonraki adım: **Push Notification** sorununu inceleyeceğiz.

---

## 🆘 Sorun Giderme

### Invoice Görünmüyor

**Kontrol 1: Webhook Çalıştı mı?**

- Supabase Dashboard → Edge Functions → stripe-webhook → Logs
- `payment_intent.succeeded` event'i var mı?

**Kontrol 2: Invoice Insert Başarılı mı?**

- Loglarda `"Invoice created successfully:"` var mı?
- Yoksa `"Error creating invoice:"` hatası var mı?

**Kontrol 3: Database'de Var mı?**

```sql
SELECT
  id,
  invoice_number,
  caller_id,
  total_amount,
  status,
  metadata->>'type' as invoice_type,
  created_at
FROM invoices
WHERE metadata->>'type' = 'credit_purchase'
ORDER BY created_at DESC
LIMIT 5;
```

### Webhook 401 Hatası

Eğer hala 401 hatası alıyorsanız:

- `supabase/config.toml` dosyasında `verify_jwt = false` olduğundan emin olun
- Webhook'u tekrar deploy edin

---

## 📚 İlgili Dosyalar

- `supabase/functions/stripe-webhook/index.ts` - Webhook function
- `app/invoices/index.tsx` - Invoices sayfası
- `docs/INVOICE_CREDIT_PURCHASE_FIX.md` - Fix detayları
