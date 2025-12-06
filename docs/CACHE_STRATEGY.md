# Cache Strategy Documentation

## Overview

Bu proje **React Query** kullanarak frontend tarafında cache mekanizması implement ediyor. Supabase'in kendi cache mekanizması yoktur (PostgREST üzerinden HTTP cache var ama kontrolümüzde değil).

## Architecture

### 1. React Query (TanStack Query)

- **Kurulu**: ✅ Zaten mevcut
- **Konum**: `app/_layout.tsx` içinde `QueryClientProvider`
- **Strateji**: Stale-while-revalidate pattern

### 2. Cache Stratejisi

#### Stale Time (Veri Ne Zaman Eski Sayılır?)

| Data Type | Stale Time | Açıklama |
|-----------|------------|----------|
| Categories | 10 dakika | Kategoriler nadiren değişir |
| Professionals List | 2 dakika | Liste orta sıklıkta değişir |
| Professional Detail | 5 dakika | Profil detayları nadiren değişir |
| User Profile | 5 dakika | Kullanıcı profili nadiren değişir |
| Favorites | 2 dakika | Favoriler kullanıcıya özel, daha sık değişir |
| Wallet Balance | 1 dakika | Finansal veri daha fresh olmalı |
| Transactions | 30 saniye | İşlemler sık değişir |

#### GC Time (Cache'te Ne Kadar Kalır?)

- **Default**: 10 dakika
- **Categories**: 30 dakika (nadiren değişir)
- **User Data**: 15 dakika
- **Financial Data**: 5 dakika

### 3. Hooks Yapısı

Tüm data fetching hooks'ları `hooks/` dizininde:

- `useCategories.ts` - Kategoriler
- `useProfessionals.ts` - Profesyoneller
- `useFavorites.ts` - Favoriler (optimistic updates ile)
- `useUser.ts` - Kullanıcı ve wallet

### 4. Optimistic Updates

Mutations için optimistic updates kullanılıyor:

- ✅ **Add Favorite**: Hemen UI'da göster, hata olursa geri al
- ✅ **Remove Favorite**: Hemen UI'dan kaldır, hata olursa geri al
- ✅ **Update User**: Hemen UI'da güncelle, hata olursa geri al

### 5. Cache Invalidation

Data değiştiğinde cache'i invalidate etmek için:

```typescript
const invalidateCategories = useInvalidateCategories();
invalidateCategories(); // Categories cache'ini temizle
```

## Best Practices

### ✅ Yapılması Gerekenler

1. **React Query hooks kullan**: Direkt service çağrıları yerine hooks kullan
2. **Stale time ayarla**: Her query için uygun stale time belirle
3. **Optimistic updates**: Mutations için kullan (UX iyileştirir)
4. **Query keys**: Tutarlı ve anlamlı query key'ler kullan
5. **Error handling**: React Query otomatik handle ediyor (global error handler)

### ❌ Yapılmaması Gerekenler

1. **Direkt service çağrıları**: `useState` + `useEffect` yerine hooks kullan
2. **Gereksiz refetch**: `refetchOnMount: false` kullan (data fresh ise)
3. **Cache'i ignore etme**: Her sayfa açılışında yeni fetch yapma
4. **Manual cache management**: React Query otomatik yönetiyor

## Supabase Realtime (Future)

Supabase Realtime subscriptions ile real-time updates eklenebilir:

```typescript
// Örnek: Real-time favorites updates
supabase
  .channel('favorites')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'talkee', table: 'favorites' },
    (payload) => {
      // Invalidate favorites cache
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    }
  )
  .subscribe();
```

## Migration Guide

### Eski Kod (useState + useEffect)

```typescript
const [categories, setCategories] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await categoriesService.getCategories();
      setCategories(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);
```

### Yeni Kod (React Query)

```typescript
const { data: categories = [], isLoading: loading, error } = useCategories();

// Error handling otomatik (global error handler)
```

## Performance Benefits

1. **Reduced API Calls**: Cache sayesinde gereksiz fetch'ler önlenir
2. **Instant UI Updates**: Cached data anında gösterilir
3. **Background Refetch**: Stale data gösterilirken arka planda fresh data çekilir
4. **Optimistic Updates**: Mutations anında UI'da görünür
5. **Automatic Retry**: Network hatalarında otomatik retry

## Monitoring

React Query DevTools ile cache durumunu izleyebilirsiniz (development'ta):

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Development'ta ekle
{__DEV__ && <ReactQueryDevtools />}
```

