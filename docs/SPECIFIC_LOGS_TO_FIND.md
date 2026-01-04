# 🔍 Aranan Spesifik Loglar

## 🎯 Hangi Logları Arıyoruz?

### 1. ✅ Signature Verification (TWILIO_WEBHOOK_URL)

**Ara:**

- `🔐 [twilio-webhook] Signature verification details`
- `✅ [twilio-webhook] Signature verification successful`
- `⚠️ [twilio-webhook] Invalid Twilio signature`

**Kontrol et:**

- `ConfiguredUrl`: `https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/twilio-webhook/voice` olmalı
- `HasAuthToken`: `true` olmalı
- Signature verification başarılı mı?

---

### 2. 💰 Billing: Caller Debit

**Ara:**

- `💰 [twilio-webhook] Billing: Charging caller`
- `✅ [twilio-webhook] Billing: Caller debited successfully`
- `❌ [twilio-webhook] Billing: caller debit failed`
- `user_credits_balance_check` (hata mesajında)

**Kontrol et:**

- Caller debit başarılı mı?
- `PreviousBalance` ve `NewBalance` değerleri doğru mu?
- Hata var mı? (`user_credits_balance_check` hatası var mıydı?)

---

### 3. 💰 Billing: Professional Credit

**Ara:**

- `💰 [twilio-webhook] Billing: Crediting professional`
- `✅ [twilio-webhook] Billing: Professional credited successfully`
- `❌ [twilio-webhook] Billing: professional credit failed`
- `credit_transactions_type_check` (hata mesajında)

**Kontrol et:**

- Professional credit başarılı mı?
- `PreviousBalance` ve `NewBalance` değerleri doğru mu?
- Hata var mı? (`credit_transactions_type_check` hatası var mıydı?)

---

### 4. 📋 CallId Resolution

**Ara:**

- `🔍 [twilio-webhook] Initial callId resolution`
- `✅ [twilio-webhook] Resolved CallId from participants`
- `📋 [twilio-webhook] Final callId after resolution`

**Kontrol et:**

- CallId bulundu mu?
- `HasCallId`: `true` olmalı

---

### 5. 💰 Billing Calculation

**Ara:**

- `💰 [twilio-webhook] Billing calculation`
- `computedTotalCost`: Değer doğru mu?
- `durationMinutes`: Değer doğru mu?
- `ratePerMinute`: Değer doğru mu?

---

## 🔍 Dashboard'da Nasıl Bulunur?

### Yöntem 1: Arama Kutusu Kullan

1. Supabase Dashboard → Edge Functions → twilio-webhook → Logs
2. Arama kutusuna şunları yaz:
   - `billing`
   - `signature`
   - `debit failed`
   - `credit failed`
   - `callId resolution`

### Yöntem 2: Browser Console Script

Console'a şu kodu yapıştır:

```javascript
// Spesifik logları bul
const searchTerms = [
  'signature verification',
  'billing: charging caller',
  'billing: crediting professional',
  'caller debit',
  'professional credit',
  'callId resolution',
  'billing calculation',
  'user_credits_balance_check',
  'credit_transactions_type_check',
];

const allText = document.body.innerText;
const foundLogs = [];

searchTerms.forEach((term) => {
  if (allText.toLowerCase().includes(term.toLowerCase())) {
    // Bu term'i içeren logları bul
    const elements = Array.from(document.querySelectorAll('*')).filter((el) => {
      const text = el.innerText || el.textContent;
      return text && text.toLowerCase().includes(term.toLowerCase());
    });

    elements.forEach((el) => {
      const text = el.innerText || el.textContent;
      if (text && !foundLogs.some((l) => l.text === text)) {
        foundLogs.push({
          term: term,
          text: text.substring(0, 500), // İlk 500 karakter
        });
      }
    });
  }
});

console.log(`✅ ${foundLogs.length} ilgili log bulundu`);
console.table(foundLogs);

// Tüm bulunan logları birleştir
const logsText = foundLogs
  .map((l) => `[${l.term}]\n${l.text}`)
  .join('\n\n---\n\n');
navigator.clipboard.writeText(logsText).then(() => {
  console.log("✅ Loglar clipboard'a kopyalandı!");
});
```

---

## 📋 Örnek Log Formatı

### Başarılı Senaryo:

```
🔐 [twilio-webhook] Signature verification details {
  ConfiguredUrl: "https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/twilio-webhook/voice",
  HasAuthToken: true,
  ...
}
✅ [twilio-webhook] Signature verification successful

💰 [twilio-webhook] Billing: Charging caller {
  CallId: "...",
  Amount: 45,
  ...
}
✅ [twilio-webhook] Billing: Caller debited successfully {
  PreviousBalance: 100,
  NewBalance: 55
}

💰 [twilio-webhook] Billing: Crediting professional {
  Amount: 36,
  ...
}
✅ [twilio-webhook] Billing: Professional credited successfully {
  PreviousBalance: 200,
  NewBalance: 236
}
```

### Hata Senaryosu:

```
❌ [twilio-webhook] Billing: caller debit failed {
  message: 'new row for relation "user_credits" violates check constraint "user_credits_balance_check"',
  ...
}

❌ [twilio-webhook] Billing: professional credit failed {
  message: 'new row for relation "credit_transactions" violates check constraint "credit_transactions_type_check"',
  ...
}
```

---

## 🎯 Hangi Logları Paylaşmalısın?

1. **Signature verification logları** (TWILIO_WEBHOOK_URL doğru mu?)
2. **Billing calculation logları** (computedTotalCost, durationMinutes, ratePerMinute)
3. **Caller debit logları** (başarılı mı? hata var mı?)
4. **Professional credit logları** (başarılı mı? hata var mı?)

Bu logları bulup paylaşırsan, sorunları daha hızlı çözebiliriz! 🚀
