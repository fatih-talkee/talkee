# Cache Best Practices Guide

## Overview

Bu dokümantasyon, Talkee projesinde cache mekanizmasının nasıl yönetilmesi gerektiğini açıklar. Best practice'lere göre cache stratejisi **HOOKS'LARDA** tanımlanmalı, servisler sadece data fetching yapmalıdır.

## Architecture

### 1. Cache Yönetimi Nerede Yapılmalı?

```
✅ DOĞRU: Hook'larda
❌ YANLIŞ: Servislerde veya sayfalarda
```

**Neden Hook'larda?**
- React Query hook'ları cache'i yönetir
- Servisler sadece API çağrıları yapar (single responsibility)
- Sayfalar sadece UI render eder
- Hook'lar data fetching + cache yönetimini birleştirir

### 2. Dosya Yapısı

```
lib/
  cacheConfig.ts          # Merkezi cache constants
hooks/
  useProfessionals.ts     # Cache ayarları burada
  useProfile.ts           # Cache ayarları burada
  useCategories.ts        # Cache ayarları burada
services/
  professionals.service.ts # Sadece API çağrıları (cache yok)
app/
  professional/[id].tsx   # Sadece hook kullanır (cache yok)
```

## Cache Configuration

### Merkezi Cache Constants

Tüm cache ayarları `lib/cacheConfig.ts` dosyasında tanımlanır:

```typescript
import { CACHE_CONFIG } from '@/lib/cacheConfig';

// Hook'ta kullanım
export function useProfessional(id: string) {
  return useQuery({
    queryKey: ['professional', id],
    queryFn: () => professionalsService.getProfessional(id),
    ...CACHE_CONFIG.PROFESSIONAL_DETAIL, // Merkezi config
  });
}
```

### Cache Stratejisi

| Data Type | Stale Time | GC Time | Açıklama |
|-----------|------------|---------|----------|
| Categories | 10 min | 30 min | Nadiren değişir |
| Professional List | 2 min | 10 min | Orta sıklıkta değişir |
| Professional Detail | 5 min | 15 min | Nadiren değişir |
| User Profile | 5 min | 15 min | Nadiren değişir |
| Favorites | 2 min | 10 min | Kullanıcıya özel |
| Wallet Balance | 1 min | 5 min | Finansal veri |
| Transactions | 30 sec | 2 min | Sık değişir |
| Notifications | 1 min | 5 min | Real-time data |

## Best Practices

### ✅ DOĞRU Kullanım

#### 1. Hook'larda Cache Tanımla

```typescript
// hooks/useProfessionals.ts
import { CACHE_CONFIG } from '@/lib/cacheConfig';

export function useProfessional(id: string) {
  return useQuery({
    queryKey: ['professional', id],
    queryFn: () => professionalsService.getProfessional(id),
    enabled: !!id,
    ...CACHE_CONFIG.PROFESSIONAL_DETAIL,
  });
}
```

#### 2. Servisler Sadece Data Fetching Yapar

```typescript
// services/professionals.service.ts
export class ProfessionalsService {
  async getProfessional(id: string) {
    // Sadece API çağrısı, cache yok
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}
```

#### 3. Sayfalarda Sadece Hook Kullan

```typescript
// app/professional/[id].tsx
export default function ProfessionalScreen() {
  // Hook kullan, cache otomatik yönetilir
  const { data: professional, isLoading } = useProfessional(id);
  
  // Cache ayarları burada yok, hook'ta tanımlı
  return <View>...</View>;
}
```

### ❌ YANLIŞ Kullanım

#### 1. Servislerde Cache Tanımlama

```typescript
// ❌ YANLIŞ
export class ProfessionalsService {
  private cache = new Map(); // Cache serviste olmamalı
  
  async getProfessional(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id); // React Query bunu yapıyor
    }
    // ...
  }
}
```

#### 2. Sayfalarda Cache Ayarları

```typescript
// ❌ YANLIŞ
export default function ProfessionalScreen() {
  const { data } = useQuery({
    queryKey: ['professional', id],
    queryFn: () => service.getProfessional(id),
    staleTime: 5 * 60 * 1000, // Sayfada cache ayarı olmamalı
  });
}
```

#### 3. useState + useEffect ile Manual Cache

```typescript
// ❌ YANLIŞ
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(setData); // React Query kullanmalı
}, []);
```

## Query Keys

### Factory Pattern Kullan

```typescript
// ✅ DOĞRU: Factory pattern
export const professionalsKeys = {
  all: ['professionals'] as const,
  lists: () => [...professionalsKeys.all, 'list'] as const,
  list: (categoryId?: string) => 
    [...professionalsKeys.lists(), categoryId] as const,
  details: () => [...professionalsKeys.all, 'detail'] as const,
  detail: (id: string) => 
    [...professionalsKeys.details(), id] as const,
};

// Kullanım
queryKey: professionalsKeys.detail(id)
```

### Invalidation

```typescript
// Tüm professionals cache'ini invalidate et
queryClient.invalidateQueries({ 
  queryKey: professionalsKeys.all 
});

// Sadece bir professional'ı invalidate et
queryClient.invalidateQueries({ 
  queryKey: professionalsKeys.detail(id) 
});
```

## Cache Invalidation Strategy

### 1. Optimistic Updates

```typescript
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async (professionalId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ 
        queryKey: favoritesKeys.lists() 
      });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(favoritesKeys.lists());
      
      // Optimistically update
      queryClient.setQueryData(favoritesKeys.lists(), (old) => {
        // Update logic
      });
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        favoritesKeys.lists(), 
        context.previous
      );
    },
  });
}
```

### 2. Invalidation After Mutation

```typescript
export function useUpdateProfessional() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProfessional,
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: professionalsKeys.detail(variables.id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: professionalsKeys.lists() 
      });
    },
  });
}
```

## Offline Support

React Query otomatik olarak offline durumunda cache'lenmiş verileri gösterir:

```typescript
// app/_layout.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Cache'den çalışır offline'da
    },
  },
});
```

## Monitoring

### React Query DevTools

Development'ta cache durumunu izlemek için:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

{__DEV__ && <ReactQueryDevtools />}
```

## Summary

1. ✅ **Cache ayarları hook'larda** tanımlanmalı
2. ✅ **Servisler sadece** data fetching yapmalı
3. ✅ **Sayfalar sadece** hook kullanmalı
4. ✅ **Merkezi cache config** kullanılmalı
5. ✅ **Query keys factory pattern** ile standardize edilmeli
6. ✅ **Optimistic updates** mutations için kullanılmalı
7. ✅ **Cache invalidation** stratejik yapılmalı

