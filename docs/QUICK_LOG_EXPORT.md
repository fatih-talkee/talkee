# 🚀 Hızlı Log Export - Supabase Dashboard

## ⚡ En Hızlı Yöntem: Browser Console Script

### Adım 1: Dashboard'a Git

1. **Supabase Dashboard'u aç:**
   ```
   https://supabase.com/dashboard/project/hmimorflmdhcgjhlxbwn/functions/twilio-webhook/logs
   ```

2. **Logs sayfasının yüklendiğinden emin ol**

### Adım 2: Browser Console'u Aç

- **Mac:** `Cmd + Option + I`
- **Windows/Linux:** `Ctrl + Shift + I`
- **Console** sekmesine git

### Adım 3: Script'i Çalıştır

Console'a şu kodu yapıştır ve Enter'a bas:

```javascript
// Tüm log elementlerini bul ve topla
const collectLogs = () => {
  const logs = [];
  
  // Farklı selector'ları dene
  const selectors = [
    '[class*="log"]',
    '[data-testid*="log"]',
    'pre',
    'code',
    '[class*="Log"]',
    'div[class*="log"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      const text = el.innerText || el.textContent;
      if (text && text.length > 10 && !logs.some(l => l.text === text)) {
        logs.push({
          index: logs.length + 1,
          text: text.trim(),
          selector: selector
        });
      }
    });
  });
  
  return logs;
};

// Logları topla
const logs = collectLogs();
console.log(`✅ ${logs.length} log bulundu`);

// JSON formatında hazırla
const logsText = logs.map(l => l.text).join('\n\n---\n\n');
const logsJson = JSON.stringify(logs, null, 2);

// Clipboard'a kopyala
navigator.clipboard.writeText(logsText).then(() => {
  console.log('✅ Loglar clipboard\'a kopyalandı!');
  console.log('📋 Şimdi bir text dosyasına yapıştırabilirsin');
  console.log(`📊 Toplam: ${logs.length} log`);
}).catch(err => {
  console.error('❌ Kopyalama hatası:', err);
  console.log('Manuel kopyala (logsText değişkeni):');
  console.log(logsText);
});

// Logları göster
console.table(logs.slice(0, 10));
```

### Adım 4: Logları Kaydet

1. Console'da loglar clipboard'a kopyalandı
2. Yeni bir dosya oluştur: `supabase-logs-twilio-webhook.txt`
3. Logları yapıştır (`Cmd+V` veya `Ctrl+V`)
4. Kaydet

---

## 🔄 Alternatif: Network Tab'dan API Response'larını Yakala

### Adım 1: Network Tab'ı Aç

1. Developer Tools → **Network** sekmesi
2. **Preserve log** seçeneğini aç
3. Logs sayfasını yenile (F5)

### Adım 2: API Çağrısını Bul

1. Network tab'da filtrele: `logs` veya `functions`
2. API çağrısını bul (genellikle `GET` request)
3. Response'u incele

### Adım 3: Response'u Kopyala

1. Response sekmesine git
2. **Copy response** butonuna tıkla
3. Dosyaya kaydet

---

## 📋 Manuel Yöntem (Basit)

1. Dashboard'da logları görüntüle
2. Tüm logları seç (`Cmd+A` veya `Ctrl+A`)
3. Kopyala (`Cmd+C` veya `Ctrl+C`)
4. Yeni dosyaya yapıştır ve kaydet

---

## 🎯 Tüm Function'lar İçin

Her function için ayrı ayrı yap:

1. `twilio-webhook` → Logs → Console script çalıştır
2. `send-push` → Logs → Console script çalıştır
3. `stripe-webhook` → Logs → Console script çalıştır

Sonra logları birleştir:
```bash
cat supabase-logs-*.txt > all-logs.txt
```

