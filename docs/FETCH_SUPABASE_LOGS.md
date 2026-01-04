# 📊 Supabase Loglarını Toplu Olarak Çekme Rehberi

## 🚀 Hızlı Başlangıç

### Yöntem 1: Script ile (Önerilen)

```bash
# Tüm twilio-webhook loglarını çek (son 24 saat)
./scripts/fetch-supabase-logs.sh twilio-webhook

# Farklı bir function için
./scripts/fetch-supabase-logs.sh send-push

# Farklı bir function ve zaman aralığı için
./scripts/fetch-supabase-logs.sh stripe-webhook 48
```

### Yöntem 2: Supabase CLI ile (Manuel)

```bash
# Önce login ol (eğer olmadıysan)
supabase login

# twilio-webhook loglarını çek
supabase functions logs twilio-webhook \
    --project-ref hmimorflmdhcgjhlxbwn \
    --limit 1000 \
    > twilio-webhook-logs-$(date +%Y%m%d_%H%M%S).log

# send-push loglarını çek
supabase functions logs send-push \
    --project-ref hmimorflmdhcgjhlxbwn \
    --limit 1000 \
    > send-push-logs-$(date +%Y%m%d_%H%M%S).log

# stripe-webhook loglarını çek
supabase functions logs stripe-webhook \
    --project-ref hmimorflmdhcgjhlxbwn \
    --limit 1000 \
    > stripe-webhook-logs-$(date +%Y%m%d_%H%M%S).log
```

### Yöntem 3: Tüm Function'ları Tek Seferde Çek

```bash
# Tüm önemli function'ların loglarını çek
for func in twilio-webhook send-push stripe-webhook; do
    echo "📊 Çekiliyor: $func"
    supabase functions logs "$func" \
        --project-ref hmimorflmdhcgjhlxbwn \
        --limit 1000 \
        > "supabase-logs-${func}-$(date +%Y%m%d_%H%M%S).log"
done

echo "✅ Tüm loglar çekildi!"
```

---

## 📋 Supabase Dashboard'dan Export

### Adım Adım:

1. **Supabase Dashboard'a git:**
   ```
   https://supabase.com/dashboard/project/hmimorflmdhcgjhlxbwn
   ```

2. **Edge Functions → Function Adı → Logs:**
   - Sol menüden "Edge Functions" seç
   - Function adına tıkla (örn: `twilio-webhook`)
   - "Logs" sekmesine tıkla

3. **Filtreleme:**
   - Tarih aralığı seç (örn: Son 24 saat)
   - Log seviyesi seç (Info, Warning, Error)
   - Arama yap (örn: "billing", "webhook", "error")

4. **Export:**
   - ⚠️ **Not:** Supabase Dashboard şu anda logları direkt export etmiyor
   - Alternatif: Logları manuel olarak kopyala-yapıştır yapabilirsin
   - Veya CLI kullan (önerilen)

---

## 🔍 Logları Filtreleme

### Grep ile Filtrele:

```bash
# Sadece billing ile ilgili logları göster
cat supabase-logs-twilio-webhook-*.log | grep -i "billing"

# Sadece error'ları göster
cat supabase-logs-twilio-webhook-*.log | grep -i "error\|❌"

# Sadece signature verification loglarını göster
cat supabase-logs-twilio-webhook-*.log | grep -i "signature\|verification"

# Belirli bir call_id için logları göster
cat supabase-logs-twilio-webhook-*.log | grep "CA223f0bc0c20217811e"
```

### JSON Formatında Parse Et:

```bash
# Logları JSON formatında parse et (eğer JSON ise)
cat supabase-logs-twilio-webhook-*.log | jq '.'

# Sadece error'ları JSON formatında göster
cat supabase-logs-twilio-webhook-*.log | jq 'select(.level == "error")'
```

---

## 📊 Real-time Log Takibi

### CLI ile Real-time:

```bash
# Real-time log takibi (Ctrl+C ile durdur)
supabase functions logs twilio-webhook \
    --project-ref hmimorflmdhcgjhlxbwn \
    --follow
```

### Dashboard'dan Real-time:

1. Supabase Dashboard → Edge Functions → twilio-webhook → Logs
2. Sayfa otomatik olarak yenilenir (real-time)
3. Filtreleme yapabilirsin

---

## 🎯 Örnek Kullanım Senaryoları

### Senaryo 1: Billing Sorununu İnceleme

```bash
# 1. Logları çek
./scripts/fetch-supabase-logs.sh twilio-webhook

# 2. Billing ile ilgili logları filtrele
cat supabase-logs-twilio-webhook-*.log | grep -i "billing" > billing-logs.txt

# 3. Belirli bir call için logları bul
cat supabase-logs-twilio-webhook-*.log | grep "CA223f0bc0c20217811e" > call-logs.txt
```

### Senaryo 2: Signature Verification Sorununu İnceleme

```bash
# 1. Logları çek
./scripts/fetch-supabase-logs.sh twilio-webhook

# 2. Signature verification loglarını filtrele
cat supabase-logs-twilio-webhook-*.log | grep -i "signature\|verification" > signature-logs.txt
```

### Senaryo 3: Tüm Function'ların Loglarını Toplu Çekme

```bash
# Tüm önemli function'ların loglarını çek
./scripts/fetch-all-logs.sh
```

---

## 📝 Log Dosyası Formatı

Supabase CLI logları genellikle şu formatta gelir:

```
[timestamp] [level] [function] message
```

Örnek:
```
2026-01-02T09:46:32.374Z [INFO] [twilio-webhook] 📞 Webhook received
2026-01-02T09:46:32.377Z [WARN] [twilio-webhook] ⚠️ Invalid signature
2026-01-02T09:46:32.379Z [ERROR] [twilio-webhook] ❌ Billing failed
```

---

## 🆘 Sorun Giderme

### Sorun: "Access token not provided"

**Çözüm:**
```bash
supabase login
```

### Sorun: "Function not found"

**Çözüm:**
- Function adını kontrol et: `supabase functions list`
- Project ref'i kontrol et: `hmimorflmdhcgjhlxbwn`

### Sorun: "Logs empty"

**Çözüm:**
- Function'ın son 24 saatte çalıştığından emin ol
- `--limit` parametresini artır: `--limit 5000`
- Tarih aralığını genişlet

---

## 💡 İpuçları

1. **Log dosyalarını organize et:**
   ```bash
   mkdir -p logs/supabase
   mv supabase-logs-*.log logs/supabase/
   ```

2. **Logları sıkıştır:**
   ```bash
   gzip supabase-logs-*.log
   ```

3. **Logları temizle (eski logları sil):**
   ```bash
   find . -name "supabase-logs-*.log" -mtime +7 -delete
   ```

4. **Logları arama yapılabilir hale getir:**
   ```bash
   # Logları tek bir dosyada birleştir
   cat supabase-logs-*.log > all-logs.txt
   
   # Veya belirli bir tarih aralığı için
   cat supabase-logs-*-20260102*.log > logs-2026-01-02.txt
   ```

