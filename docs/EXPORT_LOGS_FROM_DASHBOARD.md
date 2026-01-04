# 📊 Supabase Dashboard'dan Log Export Rehberi

## 🎯 Hızlı Yöntem: Browser Console ile Toplu Export

Supabase Dashboard şu anda logları direkt export etmiyor, ama browser console ile toplu alabilirsin:

### Adım 1: Dashboard'a Git

1. **Supabase Dashboard'u aç:**
   ```
   https://supabase.com/dashboard/project/hmimorflmdhcgjhlxbwn/functions
   ```

2. **Function'a tıkla:**
   - `twilio-webhook` → Logs sekmesi

### Adım 2: Browser Console'u Aç

1. **Browser Developer Tools'u aç:**
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `Ctrl + Shift + I`

2. **Console sekmesine git**

### Adım 3: Logları Toplu Çek

Console'a şu kodu yapıştır ve Enter'a bas:

```javascript
// Tüm logları topla
const logs = [];
const logElements = document.querySelectorAll('[class*="log"], [data-testid*="log"]');

logElements.forEach((el, index) => {
  const text = el.innerText || el.textContent;
  if (text) {
    logs.push({
      index: index + 1,
      text: text,
      timestamp: new Date().toISOString()
    });
  }
});

// JSON olarak kopyala
const logsJson = JSON.stringify(logs, null, 2);
console.log(`✅ ${logs.length} log bulundu`);
console.log('Logları kopyalamak için: copy(logsJson)');

// Clipboard'a kopyala
navigator.clipboard.writeText(logsJson).then(() => {
  console.log('✅ Loglar clipboard\'a kopyalandı!');
}).catch(err => {
  console.error('❌ Kopyalama hatası:', err);
  console.log('Manuel kopyala:', logsJson);
});
```

### Adım 4: Logları Kaydet

1. Console'da `copy(logsJson)` yaz ve Enter'a bas
2. Veya logları manuel olarak kopyala
3. Yeni bir dosyaya yapıştır: `supabase-logs-dashboard.json`

---

## 🔄 Alternatif: Network Tab'dan API Çağrılarını Yakala

### Adım 1: Network Tab'ı Aç

1. Developer Tools → Network sekmesi
2. Logs sayfasını yenile (F5)
3. API çağrılarını filtrele: `logs` veya `functions`

### Adım 2: API Response'larını İncele

1. Network tab'da log API çağrısını bul
2. Response'u incele
3. Response'u kopyala ve kaydet

---

## 📋 Manuel Yöntem: Logları Kopyala-Yapıştır

### Adım 1: Logları Seç

1. Dashboard'da logları görüntüle
2. Tüm logları seç (`Cmd+A` veya `Ctrl+A`)
3. Kopyala (`Cmd+C` veya `Ctrl+C`)

### Adım 2: Dosyaya Yapıştır

1. Yeni bir dosya oluştur: `supabase-logs-manual.txt`
2. Logları yapıştır
3. Kaydet

---

## 🚀 En Hızlı Yöntem: Supabase CLI

Eğer CLI'ye login olduysan:

```bash
# Tüm logları çek
./scripts/fetch-all-logs.sh

# Veya tek tek
supabase functions logs twilio-webhook \
    --project-ref hmimorflmdhcgjhlxbwn \
    --limit 1000 \
    > twilio-webhook-logs-$(date +%Y%m%d_%H%M%S).log
```

---

## 💡 İpuçları

1. **Filtreleme:**
   - Dashboard'da log seviyesi filtrele (Info, Warning, Error)
   - Tarih aralığı seç
   - Arama yap (örn: "billing", "error")

2. **Toplu Export:**
   - Her function için ayrı ayrı yap
   - Logları birleştir: `cat *.log > all-logs.txt`

3. **Format:**
   - Dashboard logları genellikle JSON formatında
   - CLI logları text formatında

---

## 🆘 Sorun Giderme

### Sorun: Console'da log bulunamıyor

**Çözüm:**
- Sayfayı yenile (F5)
- Logs sekmesinin yüklendiğinden emin ol
- Farklı selector'lar dene

### Sorun: API çağrıları görünmüyor

**Çözüm:**
- Network tab'ı temizle
- Sayfayı yenile
- "Preserve log" seçeneğini aç

### Sorun: Çok fazla log var

**Çözüm:**
- Dashboard'da filtreleme yap
- Tarih aralığını daralt
- Sadece error'ları export et

