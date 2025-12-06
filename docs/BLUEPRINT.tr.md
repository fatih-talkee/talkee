# Talkee Proje Planı

**Versiyon:** 1.0.0
**Son Güncelleme:** 2025-11-15
**Dil:** Türkçe | [English](./BLUEPRINT.md)

---

## İçindekiler

1. [Projeye Genel Bakış](#1-projeye-genel-bakış)
2. [Üst Düzey Mimari](#2-üst-düzey-mimari)
3. [İlk Özellik Seti](#3-ilk-özellik-seti)
4. [Dizin Yapısı](#4-dizin-yapısı)
5. [Teknoloji Yığını](#5-teknoloji-yığını)
6. [Veri Modelleri](#6-veri-modelleri)
7. [Geliştirme Yol Haritası](#7-geliştirme-yol-haritası)
8. [İlgili Dokümantasyon](#8-ilgili-dokümantasyon)

---

## 1. Projeye Genel Bakış

**Talkee**, React Native ve Expo ile geliştirilmiş, platformlar arası (iOS/Android) bir profesyonel danışmanlık pazaryeridir. Uygulama, kullanıcıları 12 kategoride doğrulanmış profesyonellerle ücretli sesli/görüntülü görüşmeler için bir araya getirir.

### Temel Değer Önerisi

#### Kullanıcılar İçin
- **Anında Erişim**: Uzmanlarla anlık bağlantı
- **Şeffaf Fiyatlandırma**: Dakika başı ücretler açıkça gösterilir
- **Kalite Güvencesi**: Derecelendirmeli doğrulanmış profesyoneller
- **Çok Kategorili**: 12+ profesyonel kategori
- **Esnek İletişim**: Sesli ve görüntülü aramalar

#### Profesyoneller İçin
- **Gelir Elde Etme**: Uzmanlıktan danışmanlık yoluyla kazanç
- **Esnek Program**: Müsaitlik ve ücretleri belirleme
- **Küresel Erişim**: Dünya çapında müşterilerle bağlantı
- **Profesyonel Araçlar**: Takvim, analitik, kazanç takibi

### Proje Hedefleri
- Sorunsuz profesyonel danışmanlık deneyimleri sunmak
- Doğrulama ve derecelendirme sistemleri aracılığıyla güven oluşturmak
- Küresel bilgi alışverişini sağlamak
- Profesyoneller için sürdürülebilir gelir yaratmak

---

## 2. Üst Düzey Mimari

### Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobil Uygulama                           │
│                  (React Native + Expo)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Kimlik     │  │    Arama     │  │    Ödeme     │      │
│  │   Doğrulama  │  │    Modülü    │  │    Modülü    │      │
│  │   Modülü     │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Keşfet     │  │    Profil    │  │  Randevu     │      │
│  │   Modülü     │  │    Modülü    │  │  Modülü      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Arka Uç Servisleri                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │    Twilio    │  │    Ödeme     │      │
│  │     Auth     │  │     Voice    │  │    Ağ Geçidi │      │
│  │  Firestore   │  │    Video     │  │(Stripe/vb.)  │      │
│  │   Storage    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Modül Dağılımı

#### A. Kimlik Doğrulama Modülü
**Konum:** `/app/auth/`

**Bileşenler:**
- Giriş ekranı
- Kayıt akışı
- OTP doğrulama
- Şifre kurtarma
- Hesap kurulumu

**Servisler:**
- Firebase Authentication
- Kullanıcı profili oluşturma
- Oturum yönetimi

#### B. Keşfetme & Arama Modülü
**Konum:** `/app/(tabs)/`, `/components/listings/`

**Özellikler:**
- Promosyonlu ana akış
- Filtreli profesyonel arama
- Kategori tarama (12 kategori)
- Öne çıkan profesyoneller
- Favoriler yönetimi

**Bileşenler:**
- `CategoryGrid.tsx`
- `ProfessionalCard.tsx`
- `SearchBar.tsx`
- `FilterModal.tsx`
- `PromotionCarousel.tsx`

#### C. Arama Sistemi
**Konum:** `/app/call/[id].tsx`, `/components/recordings/`

**Özellikler:**
- Gerçek zamanlı sesli aramalar
- Görüntülü arama
- Arama kontrolleri (sustur, hoparlör, video değiştir)
- Süre takibi
- Kayıt oynatma

**Entegrasyon:**
- Twilio Voice SDK
- Eşler arası için WebRTC
- Arama meta verileri için Firebase

#### D. Ödeme & Kredi Modülü
**Konum:** `/app/(tabs)/wallet.tsx`, `/components/payment/`

**Özellikler:**
- Kredi satın alma akışı
- Cüzdan bakiyesi gösterimi
- İşlem geçmişi
- Kazanç takibi (profesyoneller için)
- Ödeme yöntemi yönetimi

**Bileşenler:**
- `AddCardModal.tsx`
- Cüzdan işlem listesi
- Kredi seçim arayüzü

#### E. Profesyonel Profil Modülü
**Konum:** `/app/professional/[id].tsx`

**Özellikler:**
- Detaylı profesyonel profilleri
- Derecelendirmeler ve yorumlar
- Uzmanlık alanları ve diller
- Müsaitlik durumu
- Yanıt süresi göstergeleri
- Rozetler ve doğrulamalar

#### F. Kullanıcı Profili & Ayarlar
**Konum:** `/app/(tabs)/profile.tsx`, `/app/settings/*`

**Ekranlar:**
- Profil genel bakış
- Dil ayarları
- Tema tercihleri
- Bildirim ayarları
- Şifre yönetimi
- Müsaitlik ayarları (profesyoneller için)
- Hesap yönetimi

#### G. Randevular & Geçmiş
**Konum:** `/app/appointments-calendar.tsx`, `/app/call-history/`

**Özellikler:**
- Randevular için takvim görünümü
- Filtreli arama geçmişi
- Engellenmiş kullanıcı yönetimi
- Favoriler listesi
- Randevu hatırlatıcıları

#### H. UI Bileşen Kütüphanesi
**Konum:** `/components/ui/`

**Bileşenler:**
- `Button.tsx` - Birincil/ikincil butonlar
- `Input.tsx` - Form girdileri
- `Card.tsx` - İçerik kartları
- `Header.tsx` - Ekran başlıkları
- `PrimaryHeader.tsx` - Navigasyon başlığı
- `SearchBar.tsx` - Arama arayüzü
- `TabButtons.tsx` - Sekme navigasyonu
- `ToastStack.tsx` - Toast bildirimleri

#### I. Çapraz Kesim Konuları

**Uluslararasılaşma:**
- **Konum:** `/lib/i18n.ts`, `/locales/`
- **Diller:** İngilizce, Türkçe, İspanyolca, Fransızca, Almanca
- **Uygulama:** React Native ile i18next

**Temalama:**
- **Konum:** `/contexts/ThemeContext.tsx`, `/themes/`
- **Özellikler:** Açık/Koyu mod, sistem tercihi algılama
- **Uygulama:** NativeWind (Tailwind CSS)

**Depolama:**
- **Konum:** `/lib/storage.ts`
- **Uygulama:** AsyncStorage sarmalayıcı
- **Kullanım Durumları:** Kullanıcı tercihleri, önbellek, çevrimdışı veri

**Bildirimler:**
- **Konum:** `/lib/toastService.ts`
- **Türler:** Başarı, hata, bilgi, uyarı
- **Uygulama:** react-native-toast-message

### Veri Akışı

```
Kullanıcı Eylemi
    │
    ▼
Uygulama Arayüzü (React Native)
    │
    ▼
Context/Durum Yönetimi
    │
    ├─────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
Firebase Servisleri                  Twilio Servisleri
│                                          │
├─ Kimlik Doğrulama                        ├─ Sesli Aramalar
├─ Firestore (Kullanıcı/Profesyonel veri) ├─ Görüntülü Aramalar
├─ Storage (Kayıtlar, Fotoğraflar)         └─ Arama Yönlendirme
└─ Cloud Functions (Gelecek)
    │
    ▼
Ödeme Ağ Geçidi
│
└─ Kredi İşlemleri
    │
    ▼
UI Güncelleme
```

---

## 3. İlk Özellik Seti

### P0 - MVP Özellikleri (✅ Uygulandı)
- Kullanıcı kimlik doğrulama (Giriş, Kayıt, OTP)
- Profesyonel tarama (Arama, Kategoriler, Profiller)
- Kredi sistemi (Cüzdan, Satın alma akışı)
- Arama geçmişi ve favoriler
- Çoklu dil desteği (i18n)
- Tema sistemi (Açık/Koyu mod)
- Profil yönetimi ve ayarlar
- Kategori tabanlı navigasyon
- Profesyonel profil görünümleri
- Kullanıcı engelleme işlevi

### P1 - Temel Özellikler (🟡 Devam Ediyor/Doğrulama Gerekli)
- Gerçek zamanlı arama (Twilio entegrasyonu)
- Kayıt oynatma
- Takvim/Randevu planlama
- Ödeme işleme (Stripe/Ödeme ağ geçidi)
- Push bildirimleri (Firebase Cloud Messaging)
- Uygulama içi bildirimler

### P2 - Geliştirme Özellikleri (🔴 Planlandı)
- Uygulama içi mesajlaşma sistemi
- Gelişmiş arama filtreleri (fiyat aralığı, müsaitlik, derecelendirmeler)
- Profesyonel doğrulama iş akışı
- Tavsiye ve ödül sistemi
- Analitik panosu (profesyoneller için)
- İnceleme ve derecelendirme sistemi
- Akıllı rezervasyon/planlama sistemi
- Platform ücretleri ve ödeme yönetimi
- Profesyonel işe alım akışı
- Profesyoneller için KYC/doğrulama

### P3 - Cilalanma & Optimizasyon (🔴 Gelecek)
- Çevrimdışı mod desteği
- Performans optimizasyonu (tembel yükleme, önbellekleme)
- Erişilebilirlik iyileştirmeleri (WCAG 2.1)
- Gelişmiş analitik ve içgörüler
- A/B test çerçevesi
- Video kayıt desteği
- Aramalar sırasında ekran paylaşımı
- AI destekli profesyonel önerileri
- Sohbet transkripsiyon ve özetleri

---

## 4. Dizin Yapısı

### Mevcut Yapı

```
/
├── app/                          # Expo Router sayfaları
│   ├── (tabs)/                   # Alt sekme navigasyonu
│   │   ├── index.tsx             # Ana akış
│   │   ├── search.tsx            # Arama ekranı
│   │   ├── people.tsx            # İnsanlar/bağlantılar
│   │   ├── categories.tsx        # Kategori tarayıcı
│   │   ├── wallet.tsx            # Cüzdan & işlemler
│   │   ├── profile.tsx           # Kullanıcı profili
│   │   └── _layout.tsx           # Sekme düzeni
│   ├── auth/                     # Kimlik doğrulama ekranları
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── otp.tsx
│   │   ├── forgot-password.tsx
│   │   ├── setup-account.tsx
│   │   └── _layout.tsx
│   ├── settings/                 # Ayarlar ekranları
│   │   ├── language.tsx
│   │   ├── theme.tsx
│   │   ├── notifications.tsx
│   │   ├── change-password.tsx
│   │   ├── availability.tsx
│   │   └── account.tsx
│   ├── call/
│   │   └── [id].tsx              # Dinamik arama ekranı
│   ├── professional/
│   │   └── [id].tsx              # Profesyonel profili
│   ├── call-history/
│   │   └── index.tsx             # Arama geçmişi
│   ├── favorites/
│   │   └── index.tsx             # Favoriler listesi
│   ├── index.tsx                 # Kök yönlendirme
│   ├── credit-selection.tsx      # Kredi paketleri
│   ├── purchase.tsx              # Satın alma akışı
│   ├── appointments-calendar.tsx # Takvim görünümü
│   ├── become-professional.tsx   # Profesyonel kayıt
│   ├── how-it-works.tsx         # Başlangıç/bilgi
│   └── +not-found.tsx           # 404 sayfası
│
├── components/                   # React bileşenleri
│   ├── ui/                       # UI temel öğeleri
│   │   ├── headers/
│   │   │   └── PrimaryHeader.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── TabButtons.tsx
│   │   └── ToastStack.tsx
│   ├── listings/                 # Profesyonel listeler
│   │   ├── CategoryGrid.tsx
│   │   └── ProfessionalCard.tsx
│   ├── payment/
│   │   └── AddCardModal.tsx
│   ├── filters/
│   │   └── FilterModal.tsx
│   ├── campaigns/
│   │   └── CampaignBanner.tsx
│   ├── recordings/
│   │   └── RecordingPlaybackModal.tsx
│   ├── carousel/
│   │   └── PromotionCarousel.tsx
│   └── profile/
│       └── ShareProfileModal.tsx
│
├── contexts/                     # React context'leri
│   └── ThemeContext.tsx          # Tema durum yönetimi
│
├── hooks/                        # Özel React hook'ları
│   ├── useFrameworkReady.ts
│   └── useIsMounted.ts
│
├── lib/                          # Servisler & yardımcılar
│   ├── firebase.ts               # Firebase başlatma
│   ├── i18n.ts                   # i18n yapılandırma
│   ├── storage.ts                # AsyncStorage sarmalayıcı
│   └── toastService.ts           # Toast bildirimleri
│
├── locales/                      # i18n çevirileri
│   ├── en.json                   # İngilizce
│   ├── tr.json                   # Türkçe
│   ├── es.json                   # İspanyolca
│   ├── fr.json                   # Fransızca
│   └── de.json                   # Almanca
│
├── mockData/                     # Geliştirme mock verileri
│   ├── professionals.ts          # Profesyonel veri & tipler
│   └── user.ts                   # Kullanıcı mock verisi
│
├── themes/                       # Tema yapılandırması
│   └── index.ts                  # Tema tanımları
│
├── assets/                       # Statik varlıklar
│   └── images/                   # Uygulama görselleri & ikonlar
│
├── firebase/                     # Firebase yapılandırma dosyaları
│   ├── android/
│   │   └── google-services.json
│   └── ios/
│       └── GoogleService-Info.plist
│
├── android/                      # Android native kod
├── ios/                          # iOS native kod
│
├── docs/                         # 📁 Dokümantasyon
│   ├── BLUEPRINT.md              # Bu dosya (EN)
│   ├── BLUEPRINT.tr.md           # Bu dosya (TR)
│   ├── DESIGN.md                 # Tasarım sistemi (EN)
│   ├── DESIGN.tr.md              # Tasarım sistemi (TR)
│   ├── session-notes/            # Geliştirme oturum günlükleri
│   │   ├── 2025-11-15-init.md    # İlk oturum (EN)
│   │   └── 2025-11-15-init.tr.md # İlk oturum (TR)
│   └── architecture/             # (Gelecek) Mimari dokümanlar
│
├── tasks/                        # 📁 Görev yönetimi
│   ├── todo.md                   # Aktif görevler (EN)
│   └── todo.tr.md                # Aktif görevler (TR)
│
├── CLAUDE.md                     # AI asistan kuralları (EN)
├── CLAUDE.tr.md                  # AI asistan kuralları (TR)
│
├── readme/                       # Kurulum kılavuzları
│   ├── README.md
│   ├── EAS_SETUP.md
│   ├── FIREBASE_SETUP.md
│   ├── IOS_DISTRIBUTION.md
│   ├── TWILIO_VOICE_SETUP.md
│   ├── I18N_SETUP.md
│   └── ANDROID_APK.md
│
├── .vscode/                      # VS Code ayarları
├── .bolt/                        # Bolt.new yapılandırma
│
├── package.json                  # Bağımlılıklar
├── tsconfig.json                 # TypeScript yapılandırma
├── tailwind.config.js            # Tailwind yapılandırma
├── babel.config.js               # Babel yapılandırma
├── metro.config.js               # Metro bundler yapılandırma
├── eas.json                      # EAS build yapılandırma
└── app.json                      # Expo yapılandırma
```

### Önerilen Gelecek Eklemeler

```
├── types/                        # 📁 TypeScript tip tanımları
│   ├── api.ts                    # API yanıt tipleri
│   ├── models.ts                 # Veri modelleri
│   ├── navigation.ts             # Navigasyon tipleri
│   └── index.ts                  # Tip dışa aktarımları
│
├── services/                     # 📁 Servis katmanı (/lib'den çıkarıldı)
│   ├── api/                      # API istemcileri
│   │   ├── professionals.ts
│   │   ├── calls.ts
│   │   └── payments.ts
│   ├── twilio/                   # Twilio entegrasyonu
│   │   ├── voice.ts
│   │   └── video.ts
│   └── firebase/                 # Firebase servisleri
│       ├── auth.ts
│       ├── firestore.ts
│       └── storage.ts
│
├── constants/                    # 📁 Uygulama geneli sabitler
│   ├── categories.ts             # Kategori tanımları
│   ├── routes.ts                 # Rota sabitleri
│   ├── config.ts                 # Uygulama yapılandırması
│   └── colors.ts                 # Renk paleti
│
└── utils/                        # 📁 Yardımcı fonksiyonlar
    ├── validation.ts             # Form doğrulama
    ├── formatting.ts             # Tarih, para birimi formatı
    └── helpers.ts                # Genel yardımcılar
```

---

## 5. Teknoloji Yığını

### Frontend

| Teknoloji | Versiyon | Amaç |
|-----------|----------|------|
| **React Native** | 0.79.6 | Mobil uygulama çerçevesi |
| **React** | 19.0.0 | UI kütüphanesi |
| **Expo** | 53.0.0 | Geliştirme platformu |
| **expo-router** | 5.1.7 | Dosya tabanlı yönlendirme |
| **TypeScript** | 5.8.3 | Tip güvenliği |
| **NativeWind** | 4.1.23 | RN için Tailwind CSS |
| **Tailwind CSS** | 3.3.2 | Yardımcı öncelikli CSS |

### Durum Yönetimi & Hook'lar

| Teknoloji | Amaç |
|-----------|------|
| **React Context API** | Global durum (tema, kullanıcı) |
| **React Hooks** | Bileşen durumu & yan etkiler |
| **AsyncStorage** | Yerel kalıcılık |

### UI & Stillendirme

| Teknoloji | Amaç |
|-----------|------|
| **Lucide React Native** | İkon kütüphanesi |
| **Expo Vector Icons** | Ek ikonlar |
| **React Native Gesture Handler** | Dokunma jestleri |
| **React Native Reanimated** | Akıcı animasyonlar |
| **React Native SVG** | SVG render |
| **Expo Linear Gradient** | Degrade arka planlar |
| **Expo Blur** | Bulanıklık efektleri |

### Backend & Servisler

| Servis | Amaç |
|--------|------|
| **Firebase Authentication** | Kullanıcı kimlik doğrulama (e-posta, telefon, OAuth) |
| **Firestore** | Gerçek zamanlı veritabanı |
| **Firebase Storage** | Dosya depolama (kayıtlar, fotoğraflar) |
| **Firebase Cloud Messaging** | Push bildirimleri (planlandı) |
| **Twilio Voice/Video** | WebRTC arama |

### Uluslararasılaşma

| Teknoloji | Amaç |
|-----------|------|
| **i18next** | Çeviri çerçevesi |
| **react-i18next** | React entegrasyonu |
| **expo-localization** | Cihaz dil algılama |

### Geliştirme & Build Araçları

| Araç | Amaç |
|------|------|
| **Metro** | JavaScript paketleyici |
| **Babel** | JavaScript transpiler |
| **EAS (Expo Application Services)** | Bulut derlemeleri |
| **TypeScript Compiler** | Tip kontrolü |
| **ESLint** | Kod linting |
| **Prettier** | Kod formatlama |

### Native Özellikler

| Özellik | Kütüphane |
|---------|-----------|
| **Kamera** | expo-camera |
| **Takvim** | react-native-calendars |
| **QR Kodlar** | react-native-qrcode-svg |
| **Tarih/Saat Seçici** | @react-native-community/datetimepicker |
| **Haptik** | expo-haptics |
| **Web Tarayıcı** | expo-web-browser |
| **Splash Ekranı** | expo-splash-screen |
| **Durum Çubuğu** | expo-status-bar |

### Platform Desteği

- **iOS:** 13.0+
- **Android:** API 24+ (Android 7.0)
- **Node.js:** 18+

---

## 6. Veri Modelleri

### Professional (Profesyonel)

```typescript
interface Professional {
  id: string;
  name: string;
  title: string;
  category: string;
  ratePerMinute: number;
  avatar: string;
  bio: string;
  rating: number;
  totalCalls: number;
  isOnline: boolean;
  isVerified: boolean;
  specialties: string[];
  languages: string[];
  responseTime: string;
  badges: string[];
  isBlocked?: boolean;
}
```

### Category (Kategori)

```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  professionalCount: number;
}
```

**Mevcut Kategoriler:**
1. İş Dünyası (Business)
2. Teknoloji (Technology)
3. Sağlık (Health)
4. Finans (Finance)
5. Yaşam Tarzı (Lifestyle)
6. Eğitim (Education)
7. Tasarım (Design)
8. Eğlence (Entertainment)
9. Spor (Sports)
10. Otomotiv (Automotive)
11. Fotoğrafçılık (Photography)
12. Oyun (Gaming)

### CallHistory (Arama Geçmişi)

```typescript
interface CallHistory {
  id: string;
  professionalId: string;
  professional: Professional;
  duration: number; // saniye
  cost: number;
  date: string; // ISO 8601
  type: 'voice' | 'video';
  status: 'completed' | 'missed' | 'cancelled';
  direction?: 'incoming' | 'outgoing';
  isBlocked?: boolean;
}
```

### WalletTransaction (Cüzdan İşlemi)

```typescript
interface WalletTransaction {
  id: string;
  type: 'income' | 'expenses';
  amount: number;
  description: string;
  timestamp: string; // ISO 8601
  professionalId?: string;
  professional?: Professional;
  callerId?: string;
  caller?: Professional;
  status?: 'completed' | 'pending' | 'failed';
  duration?: number; // saniye
}
```

### Notification (Bildirim)

```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'call' | 'message' | 'appointment' | 'promotion' | 'payment' | 'system';
  timestamp: string; // ISO 8601
  isRead: boolean;
  professionalId?: string;
  professional?: Professional;
  actionUrl?: string;
}
```

### BlockedUser (Engellenen Kullanıcı)

```typescript
interface BlockedUser {
  id: string;
  userId: string;
  user: Professional;
  blockedAt: string; // ISO 8601
  lastCallDate?: string;
  lastCallDuration?: number; // saniye
}
```

### Promotion (Promosyon)

```typescript
interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string; // URL
  ctaText: string;
  gradient: string[]; // RGBA renkler
}
```

---

## 7. Geliştirme Yol Haritası

### Faz 1: Temel & Denetim (Hafta 1-2)
**Durum:** 🟡 Devam Ediyor

- [x] Proje dokümantasyon yapısını oluştur
- [x] Claude Code iskeletini kur
- [ ] Firebase entegrasyonunu denetle
- [ ] Twilio Voice SDK durumunu doğrula
- [ ] Tüm API uç noktalarını belgele
- [ ] Kapsamlı TypeScript tipleri oluştur
- [ ] Mock vs. gerçek veri kullanımını belirle

### Faz 2: Temel Özellikler (Hafta 3-6)
**Durum:** 🔴 Planlandı

- [ ] Twilio arama uygulamasını tamamla
- [ ] Ödeme ağ geçidini entegre et (Stripe)
- [ ] Push bildirimlerini uygula (FCM)
- [ ] Kayıt yükleme/indirme sistemini kur
- [ ] Randevu planlama oluştur
- [ ] Profesyonel işe alım iş akışı
- [ ] İnceleme ve derecelendirme sistemi

### Faz 3: Yerelleştirme & UX (Hafta 7-8)
**Durum:** 🔴 Planlandı

- [ ] Tüm çevirileri tamamla (ES, FR, DE)
- [ ] Gelişmiş arama filtrelerini ekle
- [ ] Yükleme durumları & iskeletlerini uygula
- [ ] Hata sınırları & yeniden deneme mekanizmaları
- [ ] Çevrimdışı mod desteği
- [ ] Görsel optimizasyonu (tembel yükleme)
- [ ] Erişilebilirlik iyileştirmeleri

### Faz 4: Test & Kalite (Hafta 9-10)
**Durum:** 🔴 Planlandı

- [ ] Yardımcılar için birim testleri
- [ ] Kritik akışlar için entegrasyon testleri
- [ ] Erişilebilirlik denetimi (WCAG 2.1)
- [ ] Performans testi
- [ ] Güvenlik denetimi
- [ ] Yük testi (Firestore)

### Faz 5: Dağıtım (Hafta 11-12)
**Durum:** 🔴 Planlandı

- [ ] EAS build profillerini yapılandır
- [ ] iOS App Store kurulumu
- [ ] Google Play Store kurulumu
- [ ] Gizlilik politikası & şartlar
- [ ] App store varlıkları (ekran görüntüleri, açıklamalar)
- [ ] Gerçek cihazlarda üretim testi
- [ ] Yumuşak lansman
- [ ] Tam genel yayın

### Faz 6: Lansman Sonrası (Devam Eden)
**Durum:** 🔴 Planlandı

- [ ] Çökme raporlarını izle
- [ ] Kullanıcı geri bildirim toplama
- [ ] Analitik uygulama
- [ ] Performans optimizasyonu
- [ ] Kullanıma dayalı özellik iterasyonu
- [ ] A/B test çerçevesi

---

## 8. İlgili Dokümantasyon

### Proje Dokümantasyonu
- [Tasarım Sistemi](./DESIGN.tr.md) - UI/UX kılavuzları ve tasarım token'ları
- [Oturum Notları](./session-notes/) - Geliştirme oturum günlükleri
- [TODO Listesi](../tasks/todo.tr.md) - Aktif görev takibi

### AI Asistan Kılavuzları
- [CLAUDE.md](../CLAUDE.tr.md) - Claude Code için kurallar ve gelenekler

### Kurulum Kılavuzları (`/readme/` içinde)
- [README.md](../readme/README.md) - Dokümantasyon dizini
- [EAS Kurulumu](../readme/EAS_SETUP.md) - Expo Application Services
- [Firebase Kurulumu](../readme/FIREBASE_SETUP.md) - Firebase yapılandırma
- [iOS Dağıtım](../readme/IOS_DISTRIBUTION.md) - iOS build & deploy
- [Android APK](../readme/ANDROID_APK.md) - Android build süreci
- [Twilio Voice Kurulumu](../readme/TWILIO_VOICE_SETUP.md) - Arama entegrasyonu
- [i18n Kurulumu](../readme/I18N_SETUP.md) - Uluslararasılaşma kılavuzu

### Dış Kaynaklar
- [Expo Dokümantasyonu](https://docs.expo.dev/)
- [React Native Dokümantasyonu](https://reactnative.dev/)
- [Firebase Dokümantasyonu](https://firebase.google.com/docs)
- [Twilio Dokümantasyonu](https://www.twilio.com/docs)
- [NativeWind Dokümantasyonu](https://www.nativewind.dev/)

---

**Dokümanı Yöneten:** Claude Code
**İnceleme Döngüsü:** İki haftada bir veya büyük değişikliklerden sonra
**Geri Bildirim:** Proje geliştikçe bu dokümanı güncelleyin
