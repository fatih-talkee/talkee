# Push Notification Setup Guide

## 🎯 Önerilen Yaklaşım: Expo Push API + Supabase Edge Function

**Neden bu yaklaşım?**

- ✅ Firebase dosyaları zaten var (Expo otomatik kullanıyor)
- ✅ Expo Push API, Firebase FCM'i otomatik kullanıyor
- ✅ Supabase Edge Function ile kolay entegrasyon
- ✅ Multi-device desteği otomatik
- ✅ Token yönetimi otomatik

---

## 📋 Mevcut Durum

### ✅ Hazır Olanlar

1. **Firebase Dosyaları:**

   - `firebase/android/google-services.json` ✅
   - `firebase/ios/GoogleService-Info.plist` ✅
   - `app.json` içinde Firebase config ✅

2. **Frontend:**

   - `services/notifications.service.ts` - Token alma/kaydetme ✅
   - `services/push-notifications.service.ts` - Push gönderme servisi ✅
   - Listener'lar kurulu ✅
   - Multi-device desteği ✅

3. **Database:**
   - `user_devices` tablosu ✅
   - RLS policies ✅
   - Index'ler ✅

### ⚠️ Yapılması Gerekenler

1. **Supabase Edge Function deploy et**
2. **Test et**

---

## 🚀 Kurulum Adımları

### Adım 1: Supabase CLI Kurulumu (Eğer yoksa)

```bash
npm install -g supabase
```

### Adım 2: Supabase Projesine Bağlan

```bash
supabase login
supabase link --project-ref your-project-ref
```

### Adım 3: Edge Function Deploy Et

```bash
# Function'ı deploy et
supabase functions deploy send-push

# Environment variables ayarla (gerekirse)
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Adım 4: Test Et

```typescript
// Frontend'den test
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/send-push',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: 'your-user-id',
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { type: 'test' },
    }),
  }
);

const result = await response.json();
console.log(result);
```

---

## 🔄 Alternatif Yaklaşımlar

### Seçenek 1: Supabase Edge Function (Önerilen) ✅

**Avantajlar:**

- ✅ Supabase ekosistemi içinde
- ✅ Otomatik scaling
- ✅ Kolay deploy
- ✅ Environment variables yönetimi

**Dezavantajlar:**

- ⚠️ Deno runtime (TypeScript uyumlu)

**Dosya:** `supabase/functions/send-push/index.ts` ✅ (Oluşturuldu)

---

### Seçenek 2: Node.js API Route

Eğer Supabase Edge Function kullanmak istemiyorsan:

**Avantajlar:**

- ✅ Node.js runtime (tanıdık)
- ✅ Express/Next.js ile kolay entegrasyon

**Dezavantajlar:**

- ⚠️ Kendi server'ını yönetmen gerekir
- ⚠️ Scaling'i sen yaparsın

**Örnek:** `docs/PUSH_NOTIFICATION_SERVICE.md` dosyasında var

---

### Seçenek 3: Database Trigger

**Avantajlar:**

- ✅ Otomatik (notification insert olduğunda)
- ✅ Serverless

**Dezavantajlar:**

- ⚠️ Sadece notification insert'lerinde çalışır
- ⚠️ Custom logic eklemek zor

**Örnek:** `supabase/functions/send-push/README.md` dosyasında var

---

## 📝 Kullanım Örnekleri

### Örnek 1: Call Request Bildirimi

```typescript
// Frontend'den
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/send-push',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: professionalId,
      title: 'New Call Request',
      body: `${userName} wants to call you`,
      data: {
        type: 'call_request',
        call_id: callId,
        user_id: userId,
      },
      sound: 'default',
      priority: 'high',
    }),
  }
);
```

### Örnek 2: Database Trigger ile Otomatik

```sql
-- notifications tablosuna insert olduğunda otomatik push gönder
CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'data', NEW.data
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();
```

---

## 🔍 Firebase vs Expo Push API

### Firebase FCM (Direkt Kullanım)

**Gereksinimler:**

- Firebase Admin SDK
- FCM server key
- Platform-specific kod (iOS/Android)

**Karmaşıklık:** Yüksek

---

### Expo Push API (Önerilen) ✅

**Gereksinimler:**

- Sadece Expo Push API endpoint
- Firebase dosyaları zaten var (Expo otomatik kullanıyor)

**Karmaşıklık:** Düşük

**Nasıl Çalışır:**

1. Expo Push API'ye istek gönder
2. Expo, Firebase FCM/APNs'i otomatik kullanır
3. Bildirim cihaza ulaşır

**Avantaj:**

- Firebase yapılandırması zaten mevcut
- Expo otomatik olarak FCM/APNs'i kullanıyor
- Ekstra yapılandırma gerekmez

---

## ✅ Sonuç ve Öneri

**Önerilen Yaklaşım:**

1. ✅ **Supabase Edge Function kullan** (`supabase/functions/send-push/index.ts`)
2. ✅ **Expo Push API kullan** (Firebase FCM'e direkt erişmeye gerek yok)
3. ✅ **Firebase dosyaları zaten var** (Expo otomatik kullanıyor)

**Neden?**

- En az yapılandırma
- En kolay entegrasyon
- Firebase zaten hazır (Expo kullanıyor)
- Multi-device desteği otomatik

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Supabase CLI kur (eğer yoksa)
npm install -g supabase

# 2. Login ol
supabase login

# 3. Projeye bağlan
supabase link --project-ref your-project-ref

# 4. Function'ı deploy et
supabase functions deploy send-push

# 5. Test et (fiziksel cihazda)
```

---

## 📚 İlgili Dosyalar

- `supabase/functions/send-push/index.ts` - Edge Function
- `services/push-notifications.service.ts` - Frontend servisi (opsiyonel)
- `docs/PUSH_NOTIFICATION_SERVICE.md` - Detaylı kullanım kılavuzu
- `docs/NOTIFICATION_SYSTEM_SETUP.md` - Genel setup kılavuzu
