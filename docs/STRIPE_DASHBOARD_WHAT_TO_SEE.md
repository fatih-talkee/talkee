# 👀 Stripe Dashboard'da Ne Göreceksiniz?

## 🎯 Test Webhook Gönderdikten Sonra

### 1. 📊 Webhooks → Events

**Nerede:** Stripe Dashboard → Developers → Webhooks → [Endpoint'iniz] → Events

**Göreceğiniz:**

- ✅ Son gönderilen event'ler
- ✅ Event type: `payment_intent.succeeded`
- ✅ Status: `Succeeded` (yeşil) veya `Failed` (kırmızı)
- ✅ Response: `200 OK` (başarılı) veya hata mesajı
- ✅ Timestamp: Ne zaman gönderildi

**Örnek:**

```
Event: payment_intent.succeeded
Status: ✅ Succeeded
Response: 200 OK
Time: 2 seconds ago
```

---

### 2. 💳 Payments → Payment Intents

**Nerede:** Stripe Dashboard → Payments → Payment Intents

**Göreceğiniz:**

- ✅ Test payment intent'ler (test mode'da)
- ✅ Payment intent ID: `pi_...`
- ✅ Amount: Ödeme tutarı
- ✅ Status: `succeeded`, `processing`, `failed`
- ✅ Customer: Eğer customer oluşturulduysa
- ✅ Metadata: `user_id`, `type` (credit_purchase)

**Örnek:**

```
Payment Intent: pi_3SeKSa9FgtmyYQNj1loBq2s6
Amount: $10.00
Status: ✅ Succeeded
Customer: cus_xxxxx (eğer oluşturulduysa)
Metadata: { user_id: "...", type: "credit_purchase" }
```

---

### 3. 📄 Invoices (YENİ!)

**Nerede:** Stripe Dashboard → Invoices

**Göreceğiniz:**

- ✅ Yeni oluşturulan invoice'lar
- ✅ Invoice ID: `in_...`
- ✅ Customer: Hangi customer için
- ✅ Amount: Tutar
- ✅ Status: `paid`, `open`, `void`
- ✅ PDF: "View invoice" butonu ile PDF'i görebilirsiniz
- ✅ Payment Intent: Hangi payment intent ile ödendi

**Örnek:**

```
Invoice: in_1SeKSa9FgtmyYQNjxxxxx
Customer: cus_xxxxx
Amount: $10.00
Status: ✅ Paid
Payment Intent: pi_3SeKSa9FgtmyYQNj1loBq2s6
```

**Not:** Invoice oluşturma webhook function'ında eklendi, bu yüzden yeni test'lerde görünecek!

---

### 4. 👥 Customers

**Nerede:** Stripe Dashboard → Customers

**Göreceğiniz:**

- ✅ Yeni oluşturulan customer'lar
- ✅ Customer ID: `cus_...`
- ✅ Email: User'ın email'i
- ✅ Name: User'ın adı
- ✅ Metadata: `user_id`
- ✅ Payment Methods: Kayıtlı kartlar (varsa)
- ✅ Invoices: Bu customer'a ait invoice'lar

**Örnek:**

```
Customer: cus_xxxxx
Email: user@example.com
Name: John Doe
Metadata: { user_id: "..." }
Invoices: 1 invoice
```

**Not:** Customer otomatik oluşturuluyor (eğer yoksa)!

---

### 5. 🔍 Events (Tüm Event'ler)

**Nerede:** Stripe Dashboard → Developers → Events

**Göreceğiniz:**

- ✅ Tüm event'lerin listesi
- ✅ Event type: `payment_intent.succeeded`, `invoice.created`, `customer.created`, vb.
- ✅ Event ID: `evt_...`
- ✅ Timestamp: Ne zaman oluştu
- ✅ API Version: Hangi API versiyonu

**Örnek:**

```
Event: payment_intent.succeeded
ID: evt_1SeKSa9FgtmyYQNjxxxxx
Time: 2 seconds ago
API Version: 2023-10-16
```

---

### 6. 📈 Logs (Webhook Response)

**Nerede:** Stripe Dashboard → Developers → Webhooks → [Endpoint'iniz] → Logs

**Göreceğiniz:**

- ✅ Her webhook gönderiminin detayları
- ✅ Request: Stripe'tan gönderilen data
- ✅ Response: Supabase function'ınızdan dönen response
- ✅ Status Code: `200`, `400`, `500`, vb.
- ✅ Response Time: Ne kadar sürdü
- ✅ Error: Varsa hata mesajı

**Örnek:**

```
Request: POST /functions/v1/stripe-webhook
Response: { "received": true }
Status: 200 OK
Response Time: 150ms
Error: None
```

---

## 🎯 Test Sonrası Kontrol Listesi

### Stripe Dashboard'da Kontrol Edin:

- [ ] **Webhooks → Events:** Event gönderildi mi? Status başarılı mı?
- [ ] **Payments → Payment Intents:** Payment intent oluştu mu? Status `succeeded` mi?
- [ ] **Invoices:** Invoice oluşturuldu mu? (Yeni test'lerde görünecek)
- [ ] **Customers:** Customer oluşturuldu mu? (Eğer yoksa)
- [ ] **Events:** Tüm event'ler görünüyor mu?

---

## 🔍 Detaylı İnceleme

### Payment Intent Detayları:

1. **Payment Intent'e tıklayın**
2. **"View details"** butonuna tıklayın
3. **Göreceğiniz:**
   - Amount, Currency
   - Status
   - Customer (eğer varsa)
   - Payment Method
   - Metadata: `user_id`, `type`
   - Charges: Ödeme detayları
   - Related: Invoice (eğer oluşturulduysa)

### Invoice Detayları:

1. **Invoice'a tıklayın**
2. **Göreceğiniz:**
   - Invoice Number
   - Customer
   - Amount
   - Status
   - PDF: "View invoice" ile PDF'i görebilirsiniz
   - Payment Intent: Hangi payment ile ödendi

---

## 🚨 Sorun Giderme

### Problem: Event görünmüyor

**Çözüm:**

- Test mode'da mısınız kontrol edin (sağ üstte "Test mode" yazmalı)
- Event listesini yenileyin
- Filtreleri kontrol edin

### Problem: Invoice görünmüyor

**Çözüm:**

- Invoice oluşturma yeni eklendi, eski test'lerde görünmeyebilir
- Yeni bir test webhook gönderin
- Customer ID var mı kontrol edin

### Problem: Customer görünmüyor

**Çözüm:**

- Customer otomatik oluşturuluyor (eğer user'ın email'i varsa)
- User'ın `primary_email` var mı kontrol edin
- Webhook log'larına bakın

---

## 📝 Özet

**Test webhook gönderdikten sonra Stripe Dashboard'da görecekleriniz:**

1. ✅ **Webhooks → Events:** Event gönderildi, status başarılı
2. ✅ **Payments → Payment Intents:** Payment intent oluştu
3. ✅ **Invoices:** Invoice oluşturuldu (yeni test'lerde)
4. ✅ **Customers:** Customer oluşturuldu (eğer yoksa)
5. ✅ **Events:** Tüm event'ler görünüyor

**En önemli kontrol noktaları:**

- Webhook event status: `Succeeded` ✅
- Payment intent status: `succeeded` ✅
- Invoice oluşturuldu mu? ✅ (yeni test'lerde)
