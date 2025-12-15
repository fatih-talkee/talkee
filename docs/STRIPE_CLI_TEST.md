# 🧪 Stripe CLI ile Test Etme

## ✅ Stripe CLI Kuruldu

Stripe CLI başarıyla kuruldu. Şimdi test edebilirsiniz!

---

## 🔐 1. Stripe CLI Login (İlk Kullanım)

Eğer daha önce login olmadıysanız:

```bash
stripe login
```

Bu komut browser'ı açacak ve Stripe hesabınıza bağlanmanızı isteyecek.

---

## 🧪 2. Test Webhook Gönderme

### Yöntem 1: Stripe CLI ile Trigger

```bash
# Payment intent succeeded event'i gönder
stripe trigger payment_intent.succeeded

# Veya belirli bir payment intent ID ile
stripe events resend evt_xxxxx
```

### Yöntem 2: Local Webhook Testing (Önerilen)

```bash
# Local webhook listener başlat
stripe listen --forward-to https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook

# Başka bir terminal'de trigger gönder
stripe trigger payment_intent.succeeded
```

**Avantaj:**

- Webhook secret otomatik alınır
- Local'de test edebilirsiniz
- Gerçek webhook'ları dinleyebilirsiniz

---

## 🎯 3. Gerçek Test Ödeme

### Test Kartları:

```bash
# Başarılı ödeme
Kart: 4242 4242 4242 4242
CVV: Herhangi bir 3 haneli sayı
Tarih: Gelecek bir tarih

# Başarısız ödeme
Kart: 4000 0000 0000 0002
CVV: Herhangi bir 3 haneli sayı
Tarih: Gelecek bir tarih
```

### Test Adımları:

1. **App'te test ödeme yap**
2. **Webhook otomatik tetiklenecek**
3. **Logs kontrol et:**
   ```bash
   supabase functions logs stripe-webhook --follow
   ```

---

## 📋 4. Webhook Secret Alma

Local testing için webhook secret gerekir:

```bash
# Stripe listen başlattığınızda secret gösterilir
stripe listen --forward-to https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook

# Output'ta şunu göreceksiniz:
# > Ready! Your webhook signing secret is whsec_xxxxx
```

Bu secret'ı Supabase Secrets'e ekleyebilirsiniz (test için).

---

## 🔍 5. Event Logs Kontrol

```bash
# Son event'leri listele
stripe events list --limit 10

# Belirli bir event'i detaylı gör
stripe events retrieve evt_xxxxx
```

---

## 🚨 Troubleshooting

### Problem: "stripe: command not found"

**Çözüm:**

```bash
# Homebrew ile kur
brew install stripe/stripe-cli/stripe

# Veya PATH'i kontrol et
which stripe
```

### Problem: "You are not authenticated"

**Çözüm:**

```bash
stripe login
```

### Problem: "Webhook signature verification failed"

**Çözüm:**

- Supabase Secrets'te `STRIPE_WEBHOOK_SECRET` doğru mu kontrol et
- Local testing için `stripe listen` ile aldığınız secret'ı kullanın

---

## ✅ Hızlı Test Komutları

```bash
# 1. Login (ilk kullanım)
stripe login

# 2. Test webhook gönder
stripe trigger payment_intent.succeeded

# 3. Logs kontrol
supabase functions logs stripe-webhook --follow

# 4. Event listesi
stripe events list --limit 5
```

---

## 📝 Notlar

- **Test Mode:** Stripe CLI varsayılan olarak test mode'da çalışır
- **Webhook Secret:** Local testing için `stripe listen` ile alınan secret kullanılır
- **Production:** Production'da Stripe Dashboard'dan alınan webhook secret kullanılır
