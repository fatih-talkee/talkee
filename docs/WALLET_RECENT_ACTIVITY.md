# 📊 Wallet "Recent Activity" Bölümü - Teknik Detaylar

## 🎯 Özet

Wallet sayfasındaki "Recent Activity" bölümü, kullanıcının **son 5 transaction'ını** gösterir.

---

## 📋 Teknik Detaylar

### 1. Ne Kadar Gerideki Aktiviteleri Gösteriyor?

**Cevap: Son 5 transaction**

```typescript
// app/(tabs)/wallet.tsx - Line 64
useWalletTransactions(5, 0);
```

- **Limit:** `5` - Son 5 transaction
- **Offset:** `0` - İlk 5'i al (pagination yok)

### 2. Mantığı Nedir?

#### A. Veri Kaynağı

- **Tablo:** `transactions` (Supabase)
- **Filtre:** Sadece current user'ın transaction'ları (`user_id = currentUser.id`)
- **Sıralama:** `created_at DESC` (en yeni önce)
- **Limit:** 5 kayıt

#### B. API Çağrısı

```typescript
// services/supabase/user.service.ts - Line 288-316
async getTransactions(limit: number = 20, offset: number = 0) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}
```

#### C. Cache Stratejisi

```typescript
// lib/cacheConfig.ts - Line 83-86
TRANSACTIONS: {
  staleTime: 30 * CACHE_TIME.SECOND, // 30 saniye
  gcTime: 2 * CACHE_TIME.MINUTE, // 2 dakika
}
```

- **staleTime:** 30 saniye - 30 saniye içinde yeni istek yapılmazsa cache kullanılır
- **gcTime:** 2 dakika - 2 dakika kullanılmazsa cache'den silinir
- **refetchOnWindowFocus:** `true` - Uygulama ön plana geldiğinde otomatik yeniden fetch

### 3. API Bağlı mı?

**Evet, Supabase API'ye bağlı.**

#### Veri Akışı:

```
Wallet Screen
    ↓
useWalletTransactions(5, 0) hook
    ↓
usersService.getTransactions(5, 0)
    ↓
Supabase API (transactions table)
    ↓
React Query Cache (30 saniye)
    ↓
UI'da gösterim
```

---

## 🔄 Otomatik Yenileme

### Ne Zaman Yenilenir?

1. **İlk yükleme:** Sayfa açıldığında
2. **30 saniye sonra:** Cache stale olduğunda
3. **Uygulama ön plana geldiğinde:** `refetchOnWindowFocus: true`
4. **Manuel refresh:** Pull-to-refresh yapıldığında
5. **Cache invalidate edildiğinde:** Payment sonrası vs.

### Pull-to-Refresh

```typescript
// app/(tabs)/wallet.tsx - Line 102-111
const onRefresh = async () => {
  setRefreshing(true);
  try {
    await Promise.all([refetchBalance(), refetchTransactions()]);
  } catch (error) {
    logger.error('Error refreshing wallet data', error);
  } finally {
    setRefreshing(false);
  }
};
```

Kullanıcı aşağı çektiğinde hem balance hem de transactions yenilenir.

---

## 📊 Gösterilen Transaction Tipleri

Tüm transaction tipleri gösterilir:

- ✅ `income` - Gelir
- ✅ `expenses` - Gider
- ✅ `credit_purchase` - Kredi satın alma
- ✅ `call_earning` - Arama kazancı
- ✅ `call_expense` - Arama gideri

**Filtreleme yok** - Tüm tipler gösterilir.

---

## 🔍 Daha Fazla Transaction Görmek İçin

"View All" butonuna tıklayınca `/wallet-history` sayfasına gider:

```typescript
// app/(tabs)/wallet.tsx - Line 490-498
<TouchableOpacity onPress={() => router.push('/wallet-history')}>
  <Text>View All</Text>
</TouchableOpacity>
```

`wallet-history.tsx` sayfasında:

- **Limit:** `100` transaction
- **Filtreleme:** All / Income / Expenses
- **Tarih gruplama:** Today, Yesterday, etc.

---

## ⚙️ Limit'i Değiştirmek İsterseniz

### Seçenek 1: Sadece Wallet Sayfasında

```typescript
// app/(tabs)/wallet.tsx - Line 64
useWalletTransactions(10, 0); // 5 yerine 10
```

### Seçenek 2: Tüm Uygulamada

```typescript
// hooks/useUser.ts - Line 93
export function useWalletTransactions(limit: number = 10, offset: number = 0);
```

Default değeri değiştirebilirsiniz.

---

## 📈 Performans

### Neden Sadece 5?

1. **Hızlı yükleme:** Az veri = hızlı API response
2. **Düşük bandwidth:** Mobil veri kullanımını azaltır
3. **UI performansı:** Liste kısa olduğu için render hızlı
4. **Kullanıcı deneyimi:** Çoğu kullanıcı son birkaç transaction'a bakar

### Cache Avantajları

- **30 saniye cache:** Gereksiz API çağrılarını önler
- **Otomatik refetch:** Uygulama ön plana geldiğinde güncel veri
- **Optimistic updates:** Payment sonrası hemen güncellenir

---

## 🆘 Sorun Giderme

### Sorun: Transaction'lar görünmüyor

**Kontrol edin:**

1. `transactions` tablosunda kayıt var mı?

   ```sql
   SELECT * FROM transactions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. API çağrısı başarılı mı?

   - Supabase logs kontrol edin
   - Network tab'da request görünüyor mu?

3. Cache sorunu mu?
   - Pull-to-refresh yapın
   - Veya cache'i invalidate edin

### Sorun: Eski transaction'lar görünüyor

**Çözüm:**

- Pull-to-refresh yapın
- Veya 30 saniye bekleyin (otomatik refetch)

### Sorun: Yeni transaction görünmüyor

**Çözüm:**

1. Pull-to-refresh yapın
2. Uygulamayı kapatıp açın (refetchOnWindowFocus)
3. Cache'i invalidate edin:
   ```typescript
   queryClient.invalidateQueries({ queryKey: userKeys.transactions() });
   ```

---

## 📚 İlgili Dosyalar

- `app/(tabs)/wallet.tsx` - Wallet sayfası (Line 58-64, 477-593)
- `hooks/useUser.ts` - useWalletTransactions hook (Line 93-100)
- `services/supabase/user.service.ts` - getTransactions method (Line 288-316)
- `lib/cacheConfig.ts` - Cache ayarları (Line 83-86)
- `app/wallet-history.tsx` - Tüm transaction'lar sayfası

---

## ✅ Özet

| Özellik                           | Değer                          |
| --------------------------------- | ------------------------------ |
| **Gösterilen transaction sayısı** | 5                              |
| **API bağlı mı?**                 | Evet (Supabase)                |
| **Cache süresi**                  | 30 saniye                      |
| **Otomatik yenileme**             | Evet (refetchOnWindowFocus)    |
| **Manuel yenileme**               | Evet (pull-to-refresh)         |
| **Sıralama**                      | En yeni önce (created_at DESC) |
| **Filtreleme**                    | Yok (tüm tipler)               |
