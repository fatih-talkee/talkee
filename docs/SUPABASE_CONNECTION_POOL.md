# 🔌 Supabase Connection Pool Kontrolü

## 📊 Dashboard'dan Kontrol

### 1. Supabase Dashboard'a Giriş

1. https://supabase.com/dashboard adresine gidin
2. Projenizi seçin
3. **Settings** → **Database** bölümüne gidin

### 2. Connection Pool Ayarları

- **Connection Pooling**: Supabase'de varsayılan olarak connection pooling aktif
- **Pool Mode**: `transaction` veya `session` modu
- **Max Connections**: Projenizin planına göre değişir

### 3. Database Metrics

**Dashboard** → **Database** → **Metrics** bölümünde:

- Active connections
- Connection pool usage
- Query performance

---

## 🔍 SQL ile Kontrol

### Hızlı Kontrol

```sql
-- Aktif connection sayısı
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid();
```

### Detaylı Kontrol

`docs/sql/check_connection_pool.sql` dosyasını Supabase SQL Editor'da çalıştırın.

---

## ⚠️ Sorun Tespiti

### 1. Connection Pool Dolu

**Belirtiler:**

- "too many connections" hatası
- Query'ler çok yavaş
- Timeout'lar artıyor

**Çözüm:**

- Supabase planınızı yükseltin (daha fazla connection limit)
- Connection leak'leri düzeltin (transaction'ları kapatın)
- Connection pool mode'unu optimize edin

### 2. Connection Leak

**Belirtiler:**

- `idle in transaction` connection'ları çok fazla
- Connection sayısı sürekli artıyor

**Çözüm:**

- Transaction'ları mutlaka commit/rollback edin
- Try-finally bloklarında connection'ları kapatın
- Connection timeout'ları ayarlayın

### 3. Yavaş Query'ler

**Belirtiler:**

- Query'ler 5+ saniye sürüyor
- Connection'lar bekliyor (waiting_connections)

**Çözüm:**

- Query'leri optimize edin (index'ler, EXPLAIN ANALYZE)
- Yavaş query'leri bulun ve optimize edin
- Database load'u azaltın

---

## 🔧 Connection Pool Optimizasyonu

### 1. Supabase Client Timeout

`lib/supabase.ts` dosyasında:

```typescript
global: {
  fetch: createTimeoutFetch(20_000), // 20 saniye
}
```

### 2. Query Timeout'ları

Her service'te timeout ekleyin:

```typescript
const queryTimeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Query timeout')), 15000)
);
```

### 3. Connection Pool Mode

Supabase Dashboard'dan:

- **Transaction Mode**: Her transaction için connection (önerilen)
- **Session Mode**: Her session için connection (daha fazla connection kullanır)

---

## 📈 Monitoring

### Supabase Dashboard

1. **Database** → **Metrics**
2. **Connection Pool Usage** grafiğini kontrol edin
3. **Active Connections** sayısını izleyin

### SQL Monitoring

```sql
-- Her 5 saniyede bir connection sayısını kontrol et
SELECT
    now() as timestamp,
    count(*) as connections,
    count(*) FILTER (WHERE state = 'active') as active
FROM pg_stat_activity
WHERE datname = current_database();
```

---

## 🚨 Acil Durum

### Connection Pool Doluysa

1. **Supabase Dashboard** → **Database** → **Restart** (son çare)
2. Yavaş query'leri durdurun:

```sql
-- Yavaş query'leri bul
SELECT pid, query, now() - query_start as duration
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start ASC;

-- Query'yi durdur (dikkatli kullanın!)
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;
```

---

## 📝 Best Practices

1. ✅ **Transaction'ları kapatın**: Her transaction'ı commit/rollback edin
2. ✅ **Timeout ekleyin**: Tüm query'lere timeout ekleyin
3. ✅ **Connection pool'u izleyin**: Düzenli olarak kontrol edin
4. ✅ **Yavaş query'leri optimize edin**: EXPLAIN ANALYZE kullanın
5. ✅ **Connection leak'leri önleyin**: Try-finally blokları kullanın

---

## 🔗 İlgili Dosyalar

- `docs/sql/check_connection_pool.sql` - Connection pool kontrol script'i
- `lib/supabase.ts` - Supabase client konfigürasyonu
- `app/auth/callback.tsx` - Query timeout örneği
