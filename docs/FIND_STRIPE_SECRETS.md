# 🔍 Stripe Secrets'ı Nerede Bulabilirim?

## ⚠️ Yaygın Hata: Yanlış Bölüm

Eğer **Settings → API Keys** bölümüne bakıyorsanız, **yanlış yerde**siniz!

**API Keys** bölümü:

- Supabase'in kendi API key'leri için (`anon`, `service_role`)
- Stripe secrets için **DEĞİL**

---

## ✅ Doğru Yer: Secrets Bölümü

Stripe secrets'ları **Secrets** bölümünde bulunur. İki farklı yoldan erişebilirsiniz:

### Yol 1: Settings → Secrets

1. Sol menüden **Settings**'e tıklayın
2. **Secrets**'a tıklayın (PROJECT SETTINGS altında)
3. Burada `STRIPE_SECRET_KEY` ve `STRIPE_WEBHOOK_SECRET` olmalı

### Yol 2: Edge Functions → Secrets

1. Sol menüden **Edge Functions**'a tıklayın
2. Üst menüden **Secrets** sekmesine tıklayın
3. Burada da secrets'ları görebilirsiniz

---

## 📸 Görsel Rehber

### ❌ YANLIŞ: API Keys Bölümü

```
Settings
├── API Keys          ← Burada değil!
│   ├── Publishable keys
│   └── Secret keys (Supabase'in kendi key'leri)
```

### ✅ DOĞRU: Secrets Bölümü

```
Settings
└── Secrets           ← Burada!
    ├── STRIPE_SECRET_KEY
    └── STRIPE_WEBHOOK_SECRET
```

veya

```
Edge Functions
└── Secrets           ← Veya burada!
    ├── STRIPE_SECRET_KEY
    └── STRIPE_WEBHOOK_SECRET
```

---

## 🔍 Secrets Bölümünde Ne Görmelisiniz?

Secrets bölümünde şöyle bir liste görmelisiniz:

```
Secrets
├── STRIPE_SECRET_KEY = sk_test_51SdKSj9FgtmyYQNj...
├── STRIPE_WEBHOOK_SECRET = whsec_...
└── (diğer secrets'lar)
```

Eğer burada yoksa, eklemeniz gerekiyor.

---

## ➕ Secrets Nasıl Eklenir?

1. **Secrets** bölümüne gidin (Settings → Secrets veya Edge Functions → Secrets)
2. **"Add new secret"** veya **"+"** butonuna tıklayın
3. **Name:** `STRIPE_SECRET_KEY`
4. **Value:** Stripe Dashboard'dan aldığınız secret key (`sk_test_...`)
5. **Save**

Aynı işlemi `STRIPE_WEBHOOK_SECRET` için de tekrarlayın.

---

## 🆘 Hala Bulamıyorum?

### Supabase CLI ile Kontrol:

```bash
# Supabase CLI ile login
supabase login

# Secrets listesi
supabase secrets list
```

### Veya Test Script ile:

```bash
./scripts/check-stripe-secrets.sh
```

Bu script secrets'ların olup olmadığını test eder.

---

## 📝 Checklist

- [ ] Settings → API Keys'e **DEĞİL**, Settings → Secrets'e gittim
- [ ] Veya Edge Functions → Secrets'e gittim
- [ ] `STRIPE_SECRET_KEY` var mı kontrol ettim
- [ ] `STRIPE_WEBHOOK_SECRET` var mı kontrol ettim
- [ ] Yoksa ekledim
