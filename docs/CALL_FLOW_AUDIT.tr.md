# Talkee Call Flow Audit (TR)

Bu doküman, uygulamanın temel akışı olan **call** (caller/callee), Twilio bağlantıları, Supabase webhook/DB güncellemeleri, push notification senaryoları ve call’a bağlı **fiyatlandırma (credits + Stripe)** bütününü denetlemek için hazırlanmıştır.

> Kapsam: iOS/Android + foreground/background + “caller” ve “callee” akışları ayrı ayrı.

---

## 1) Mimari Harita (Bugünkü gerçek akış)

### 1.1 Outgoing Call (Caller → Professional)

- **UI**: `app/professional/[id].tsx`

  - Kullanıcı bakiyesi (min 5 dk) kontrol edilir.
  - Uygunluk (availability) kontrol edilir.
  - `/call/[id]` ekranına gidilir (id=professionalId).

- **Call ekranı**: `app/call/[id].tsx`

  - `useTwilioVoice().makeCall(...)` çağrılır.

- **Call kayıt + push**: `services/twilioVoice.service.ts` → `services/calls.service.ts`

  - `callsService.initiateCall(...)` DB’de `calls` satırı oluşturur.
  - Callee’ye **call_request** push gönderir (Expo push) (OS notification + deep link).

- **Twilio Connect**: `services/twilioVoice.service.ts`

  - Twilio SDK `Voice.connect()` ile çağrı başlatır.

- **Status & Billing**: `supabase/functions/twilio-webhook/index.ts`
  - Twilio status callback’lerini alır.
  - `calls` satırını best-effort günceller.
  - Call tamamlandığında: süre + ücret hesaplar, caller’dan düşer, professional’a kazanç yazar.

### 1.2 Incoming Call (Callee / Professional)

- **Push modal**: `components/call/Incomingcallhandler.tsx`

  - `call_request` push alınırsa modal gösterir.
  - Aynı anda Twilio SDK `CallInvite` event’i gelirse invite ile senkronlar.

- **Call ekranı**: `app/call/[id].tsx`

  - id = **calls.id** ile açılır (incoming=true).
  - DB’den caller bilgisi çekilir.
  - Invite geldiğinde accept/reject yapılır.

- **Twilio status callback + follow-up push**: `supabase/functions/twilio-webhook/index.ts`
  - Call erken biterse callee’ye `call_ended` / `call_missed` push gider.
  - UI bu push’ları dinleyip ekranı kapatır.

---

## 2) Caller Setup Checklist

### 2.1 UI/Navigation

- [x] Caller /call ekranına girebiliyor (`/call/[id]` id=professionalId).
- [x] Call ekranı “connect/connected/disconnected” state’lerine göre UI güncelliyor.
- [x] Background’a geçince (connecting/ringing aşamasında) otomatik hangup var.
- [x] Call bitince ekrandan çıkış (router.back) var.

### 2.2 Pricing (Caller)

- [x] Call ekranında rate/cost görünümü doğru rate’e bağlandı.
- [x] Caller tarafında **balance depleted** guardrail eklendi (best-effort otomatik bitirme).

### 2.3 Edge Cases (Caller)

- [ ] Token expiry/refresh: Access token refresh stratejisi ve re-register (gri alan).
- [ ] Server-side “max call duration by balance” enforcement (gri alan, öneri).

---

## 3) Callee Setup Checklist

### 3.1 Incoming Modal

- [x] Push ile modal geliyor.
- [x] Twilio CallInvite geldiğinde modal/SDK state senkron.
- [x] Timeout + DB polling safety net var.
- [x] Video/voice metni düzeltildi.

### 3.2 Incoming Call Screen

- [x] Accept sonrası callee “in-call UI”ye geçiyor (önceden stuck oluyordu).

### 3.3 Edge Cases (Callee)

- [ ] iOS killed/background incoming: VoIP Push/CallKit tarafının kesin doğrulanması gerekir (gri alan).

---

## 4) Twilio Checklist

### 4.1 Token

- [x] Token Supabase function `twilio-token` ile üretiliyor.
- [ ] Token TTL/renewal stratejisi netleştirilmeli.

### 4.2 SDK Init/Register

- [x] `app/_layout.tsx` içinde login sonrası init+register yapılıyor.
- [x] Logout/unmount cleanup stale-state bug’ı düzeltildi.

### 4.3 Android Incoming Push

- [x] `TalkeeFirebaseMessagingService` Twilio payload’larını Twilio SDK’ya route ediyor.

### 4.4 iOS Incoming Push

- [ ] AppDelegate tarafında explicit PushKit/CallKit code yok (muhtemelen SDK içinden); pratikte doğrulanmalı.

---

## 5) Supabase / Webhook Checklist

### 5.1 Twilio Webhook Security

- [x] Opsiyonel Twilio signature verification eklendi (`TWILIO_AUTH_TOKEN` + `TWILIO_WEBHOOK_URL`).

### 5.2 Call Record Updates

- [x] Call completion’da `duration_minutes` + `total_cost` set ediliyor.

### 5.3 Billing

- [x] Caller debit + professional earning düzeltildi (professional_id ≠ user_id hatası giderildi).
- [x] Wallet history için `transactions` satırları yazılıyor (call_expense / call_earning).
- [ ] Idempotency: transactions insert başarısız olursa double-charge riski var (gri alan, DB constraint önerisi).

---

## 6) Stripe / Pricing Checklist

### 6.1 Stripe ile kredi satın alma

- [x] `create-payment-intent` ve `stripe-webhook` ile credit purchase işleniyor.

### 6.2 Call bazlı pricing

- [x] Call pricing **credits** ile yapılıyor (Stripe doğrudan “per call charge” değil).
- [ ] Call invoice üretimi (calls → invoices) eksik/dağınık görünüyor (gri alan).

---

## 7) Uygulanan Fix’ler (Kod değişiklikleri)

- **Callee accept sonrası stuck bug fix**: `app/call/[id].tsx`

  - Incoming call artık accept sonrası in-call UI’ye geçiyor.

- **Call costPerSecond = 0 bug fix**: `app/call/[id].tsx`

  - Rate param + memo ile cost hesapları artık professional fetch gecikmesine takılmıyor.

- **Caller balance guardrail**: `app/call/[id].tsx`

  - Bakiyeye göre best-effort auto-end eklendi.

- **Rate uyumu (UI → backend)**: `app/professional/[id].tsx` + `services/calls.service.ts`

  - UI rate’i param olarak gönderiyor; backend scheduled/urgent availability’yi rate kaynağı yapıyor.

- **Twilio call listener cleanup**: `services/twilioVoice.service.ts`

  - Duplicate Reconnecting handler kaldırıldı.

- **Logout cleanup stale closure fix**: `app/_layout.tsx`

  - Cleanup artık ref ile güvenilir.

- **Webhook billing professional_id bug fix**: `supabase/functions/twilio-webhook/index.ts`

  - Professional earning artık professional.user_id’ye yazılıyor.

- **Webhook billing/transactions**: `supabase/functions/twilio-webhook/index.ts`

  - `duration_minutes` + `total_cost` hesaplanıp kaydediliyor, `transactions` insert ediliyor.

- **Twilio webhook signature verify**: `supabase/functions/twilio-webhook/index.ts`

  - `TWILIO_AUTH_TOKEN` varsa signature doğrulanıyor.

- **Per-minute billing (prepaid-style)**: `app/call/[id].tsx` + `supabase/functions/charge-call-minute/index.ts`

  - Her dakika başında (00:01, 01:00, 02:00, ...) o dakikanın parası kesilir.
  - Bir sonraki dakika için bakiye kontrol edilir; yoksa push gönderilir.
  - Eğer hala yüklenmezse ve bir sonraki dakikaya girildiğinde bakiye yoksa → call kapatılır.

- **Availability reminder push**: `supabase/functions/send-availability-reminder/index.ts`
  - Professional'a planlı availability'den 15 dakika önce push gönderilir.
  - External cron service ile çağrılmalı (örn: cron-job.org, her 5 dakikada bir).

---

## 8) Gri Noktalar / Eksikler (Önerilen aksiyonlar)

### 8.1 DB Şema Uyumsuzlukları

- `call_sid` kodda kullanılıyor ama repo SQL şemasında görünmüyor.
  - Öneri: `calls.call_sid` alanı + index ekle (webhook korelasyonu için).

### 8.2 Idempotency

- Billing’de double-run riskini kesin kapatmak için:
  - Öneri: `calls.billing_processed_at` alanı + unique/constraint veya transaction unique index.

### 8.3 Server-side Call Duration Limit

- Caller’ın bakiyesi bitmeden call’ı kesmek **server-side** garanti değil.
  - Öneri: Twilio tarafında max duration / status callback bazlı hard-stop veya uygulama-DB “balance hold” mekanizması.

### 8.4 iOS VoIP Push

- iOS killed/background senaryolarında incoming call kesin test edilmeli.
  - Öneri: Twilio Voice RN SDK’nın VoIP push/CallKit entegrasyonunun cihazda doğrulanması.

---

## 9) Minimum Test Planı (Manuel)

### Caller

- Outgoing voice call → connect → 1-2 dk konuş → hangup → call history / wallet transactions kontrol.
- Outgoing call → karşı taraf reject → caller UI çıkıyor mu?
- Outgoing call → low balance (az kredi) → 60sn uyarı + auto-end.
- **Per-minute billing test**:
  - Call başlat → 1. dakika başında (00:01) charge yapıldığını kontrol et.
  - 2. dakika başında (01:00) charge yapıldığını kontrol et.
  - Bakiye az olduğunda → bir sonraki dakika için push geldiğini kontrol et.
  - Bakiye yetersiz olduğunda → bir sonraki dakikaya girildiğinde call kapandığını kontrol et.

### Callee

- Push ile incoming modal → accept → in-call UI → hangup.
- Push ile incoming modal → caller iptal → modal/ekran kapanıyor mu?

### Webhook

- Twilio status callbacks → call row güncelleniyor mu? duration/total_cost doluyor mu?
- `transactions` tablosunda call_expense/call_earning oluşuyor mu?

---

## 10) Env/Config Notları

- Twilio

  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_API_KEY`
  - `TWILIO_API_SECRET`
  - `TWILIO_TWIML_APP_SID`
  - `TWILIO_AUTH_TOKEN` (webhook signature verify için)
  - `TWILIO_WEBHOOK_URL` (signature verify URL canonicalizasyonu için)

- Supabase

  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

- Stripe
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
