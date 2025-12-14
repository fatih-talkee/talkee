# Offline Support Documentation

## Overview

Talkee uygulaması artık offline durumunu tespit ediyor ve kullanıcıya bilgi veriyor. Offline durumunda cache'lenmiş veriler gösterilir ve network bağlantısı geri geldiğinde otomatik olarak veriler yenilenir.

## Features

### 1. Network Status Detection
- **Hook**: `hooks/useNetworkStatus.ts`
- **Kütüphane**: `@react-native-community/netinfo`
- **Özellikler**:
  - Gerçek zamanlı network durumu takibi
  - Connection type bilgisi (wifi, cellular, etc.)
  - Internet reachability kontrolü
  - Otomatik loglama

### 2. Offline Banner
- **Component**: `components/ui/OfflineBanner.tsx`
- **Özellikler**:
  - Ekranın üstünde görünen banner
  - Smooth animasyonlar (fade + slide)
  - SafeAreaView desteği
  - Theme-aware (error color kullanır)

### 3. React Query Offline Support
- **Konfigürasyon**: `app/_layout.tsx`
- **Özellikler**:
  - `networkMode: 'offlineFirst'` - Offline durumunda cache'den çalışır
  - Network hatalarında retry yapılmaz
  - Online olduğunda otomatik refetch
  - Cache'lenmiş veriler gösterilir

## Usage

### Network Status Hook

```typescript
import { useNetworkStatus, useIsOnline } from '@/hooks/useNetworkStatus';

// Full network status
const { isConnected, isInternetReachable, type } = useNetworkStatus();

// Simple boolean check
const isOnline = useIsOnline();
```

### Offline Banner

Banner otomatik olarak `app/_layout.tsx` içinde render edilir. Manuel olarak eklemek isterseniz:

```typescript
import { OfflineBanner } from '@/components/ui/OfflineBanner';

<OfflineBanner />
```

## Behavior

### When Offline
1. **Banner gösterilir**: Kullanıcıya internet bağlantısı olmadığı bildirilir
2. **Cache kullanılır**: React Query cache'lenmiş verileri gösterir
3. **API çağrıları yapılmaz**: Network hatalarında retry yapılmaz
4. **Mutations başarısız olur**: Network hatası döner

### When Back Online
1. **Banner gizlenir**: Animasyon ile kaybolur
2. **Otomatik refetch**: Tüm queries otomatik olarak yenilenir
3. **Normal çalışma**: Tüm özellikler tekrar aktif olur

## React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst', // Use cache when offline
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
    },
  },
});
```

## Future Enhancements

### Potential Improvements
1. **Offline Queue**: Offline durumunda yapılan işlemleri queue'ya almak
2. **Background Sync**: Online olduğunda queue'daki işlemleri otomatik sync etmek
3. **Offline Indicators**: Her sayfada offline durumunu gösteren küçük indicator'lar
4. **Selective Caching**: Kritik veriler için daha uzun cache süreleri
5. **Offline Mode Toggle**: Kullanıcının manuel olarak offline moda geçebilmesi

## Testing

### Manual Testing
1. **Airplane Mode**: Cihazı uçak moduna alın
2. **WiFi Kapat**: WiFi'yi kapatın
3. **Network Simulator**: iOS Simulator'da network durumunu değiştirin

### Expected Behavior
- Banner görünmeli
- Cache'lenmiş veriler gösterilmeli
- Yeni API çağrıları başarısız olmalı
- Online olduğunda otomatik refresh olmalı

## Dependencies

- `@react-native-community/netinfo`: Network durumu tespiti için

## Related Files

- `hooks/useNetworkStatus.ts`: Network status hook
- `components/ui/OfflineBanner.tsx`: Offline banner component
- `app/_layout.tsx`: React Query configuration ve banner integration

