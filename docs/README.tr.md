# Talkee

**Profesyonel Danışmanlık Pazaryeri**

[![React Native](https://img.shields.io/badge/React%20Native-0.79.6-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.0-blue.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Dil:** Türkçe | [English](./README.md)

---

## Hakkında

Talkee, kullanıcıları ücretli sesli ve görüntülü danışmanlıklar için doğrulanmış profesyonellerle buluşturan platformlar arası bir mobil uygulamadır. React Native ve Expo ile geliştirilen Talkee, 12+ profesyonel kategori genelinde uzman tavsiyelerine sorunsuz erişim sağlar.

### Ana Özellikler

- 🔐 **Güvenli Kimlik Doğrulama** - E-posta, telefon ve OAuth girişi
- 👥 **Profesyonel Pazaryeri** - Doğrulanmış uzmanları arayın ve inceleyin
- 💬 **Gerçek Zamanlı Arama** - Twilio üzerinden sesli ve görüntülü danışmanlık
- 💳 **Kredi Sistemi** - Esnek dakika başı ücretlendirme
- 🌍 **Çoklu Dil** - 5 dil desteği (EN, TR, ES, FR, DE)
- 🎨 **4 Tema** - Açık, Koyu, Doğa Yeşili, Okyanus Mavisi
- 📅 **Randevu Planlama** - Danışmanlıkları rezerve edin ve yönetin
- ⭐ **Derecelendirme & İncelemeler** - Her aramadan sonra profesyonelleri değerlendirin
- 🔔 **Push Bildirimleri** - Firebase Cloud Messaging ile güncel kalın
- 📊 **Analitik Panosu** - Profesyonellerin kazançlarını takip etmesi için

---

## Teknoloji Yığını

### Frontend
- **React Native** 0.79.6
- **Expo** SDK 53
- **TypeScript** 5.8.3
- **NativeWind** 4.1.23 (React Native için Tailwind CSS)
- **expo-router** 5.1.7 (Dosya tabanlı yönlendirme)

### Backend & Servisler
- **Firebase** (Authentication, Firestore, Storage, Cloud Messaging)
- **Twilio** (Sesli & Görüntülü arama)
- **Stripe** (Ödeme işleme - planlandı)

### UI & Stillendirme
- **Lucide React Native** (İkonlar)
- **React Native Reanimated** (Animasyonlar)
- **i18next** (Uluslararasılaşma)

---

## Başlangıç

### Gereksinimler

- **Node.js** 18+
- **npm** veya **yarn**
- **Expo CLI** (global olarak kurulu)
- **iOS Simulator** (sadece macOS) veya **Android Studio**

### Kurulum

1. **Repository'yi klonlayın**
   ```bash
   git clone https://github.com/Nedovich/TalkeeNedovich.git
   cd TalkeeNedovich
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Firebase'i kurun**
   - [Firebase Kurulum Kılavuzunu](./readme/FIREBASE_SETUP.md) takip edin
   - `/firebase/android/` dizinine `google-services.json` (Android) ekleyin
   - `/firebase/ios/` dizinine `GoogleService-Info.plist` (iOS) ekleyin

4. **Twilio'yu kurun** (Geliştirme için opsiyonel)
   - [Twilio Voice Kurulum Kılavuzunu](./readme/TWILIO_VOICE_SETUP.md) takip edin

5. **Geliştirme sunucusunu başlatın**
   ```bash
   npm start
   ```

6. **Platformlarda çalıştırın**
   ```bash
   # iOS (sadece macOS)
   npm run ios

   # Android
   npm run android
   ```

---

## Dokümantasyon

### Proje Dokümantasyonu
- [📘 BLUEPRINT](./docs/BLUEPRINT.tr.md) - Proje mimarisi ve yol haritası
- [🎨 TASARIM SİSTEMİ](./docs/DESIGN.tr.md) - UI/UX kılavuzları ve tasarım token'ları
- [🤖 CLAUDE.md](./CLAUDE.tr.md) - AI asistan geliştirme kılavuzları
- [✅ TODO LİSTESİ](./tasks/todo.tr.md) - Aktif görevler ve öncelikler
- [📝 OTURUM NOTLARI](./docs/session-notes/) - Geliştirme oturum günlükleri

### Kurulum Kılavuzları
- [EAS Kurulumu](./readme/EAS_SETUP.md) - Expo Application Services
- [Firebase Kurulumu](./readme/FIREBASE_SETUP.md) - Firebase yapılandırma
- [iOS Dağıtım](./readme/IOS_DISTRIBUTION.md) - iOS build & deploy
- [Android APK](./readme/ANDROID_APK.md) - Android build süreci
- [Twilio Voice Kurulumu](./readme/TWILIO_VOICE_SETUP.md) - Arama entegrasyonu
- [i18n Kurulumu](./readme/I18N_SETUP.md) - Uluslararasılaşma kılavuzu

---

## Proje Yapısı

```
/
├── app/                    # Expo Router sayfaları
│   ├── (tabs)/            # Alt sekme navigasyonu
│   ├── auth/              # Kimlik doğrulama ekranları
│   ├── settings/          # Ayarlar ekranları
│   └── ...
├── components/            # React bileşenleri
│   ├── ui/               # UI temel öğeleri
│   ├── listings/         # Profesyonel listeler
│   └── ...
├── docs/                 # Dokümantasyon
│   ├── BLUEPRINT.md      # Proje mimarisi
│   ├── DESIGN.md         # Tasarım sistemi
│   └── session-notes/    # Geliştirme günlükleri
├── tasks/                # Görev yönetimi
│   └── todo.md           # Aktif görevler
├── lib/                  # Servisler & yardımcılar
├── locales/              # i18n çevirileri
├── themes/               # Tema yapılandırmaları
├── mockData/             # Geliştirme mock verileri
└── CLAUDE.md             # AI asistan kılavuzları
```

---

## Geliştirme

### Kod Stili

- **TypeScript strict modu** etkin
- Stillendirme için **NativeWind** (Tailwind CSS)
- Tüm kullanıcıya yönelik metinler için **zorunlu i18n**
- İmportlar için **yol alias'ları** (@/)
- Default export'lar yerine **named export'lar** tercih edilir

### Kodlama Kılavuzları

Kapsamlı geliştirme kılavuzları için [CLAUDE.md](./CLAUDE.tr.md) dosyasına bakın:
- Güvenli düzenleme alanları
- Yasak alanlar
- Kodlama kuralları
- Test gereksinimleri
- Git iş akışı

### Testleri Çalıştırma

```bash
# Lint
npm run lint

# TypeScript kontrolü
npx tsc --noEmit

# Her iki platformda çalıştır
npm run ios
npm run android
```

---

## Build & Dağıtım

### Geliştirme Build'i

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Production Build'i (EAS)

```bash
# EAS'i yapılandır
eas build:configure

# iOS için build
eas build --platform ios --profile production

# Android için build
eas build --platform android --profile production
```

Detaylı talimatlar için [EAS Kurulum Kılavuzu](./readme/EAS_SETUP.md)'na bakın.

---

## Katkıda Bulunma

### Geliştirme İş Akışı

1. Feature branch oluşturun: `git checkout -b feature/your-feature`
2. [CLAUDE.md](./CLAUDE.tr.md) kılavuzlarını takip ederek değişikliklerinizi yapın
3. Hem iOS hem de Android'de test edin
4. Linter çalıştırın: `npm run lint`
5. [Conventional Commits](https://www.conventionalcommits.org/) kullanarak commit edin
6. Push edin ve pull request oluşturun

### Commit Mesajı Formatı

```
tip(kapsam): konu

feat(auth): şifremi unuttum işlevselliğini ekle
fix(payment): Android'de kredi satın alma çökmesini çöz
docs(readme): Firebase kurulum talimatlarını güncelle
```

---

## Yol Haritası

### Faz 1: Temel (✅ Tamamlandı)
- [x] Proje kurulumu ve dokümantasyon
- [x] UI/UX tasarım sistemi
- [x] Kimlik doğrulama akış UI'ı
- [x] Profesyonel tarama
- [x] Çoklu dil desteği

### Faz 2: Temel Özellikler (🚧 Devam Ediyor)
- [ ] Firebase entegrasyonu (Auth, Firestore, Storage)
- [ ] Twilio Voice/Video arama
- [ ] Stripe ödeme ağ geçidi
- [ ] Push bildirimleri (FCM)
- [ ] Randevu planlama

### Faz 3: İyileştirme (📋 Planlandı)
- [ ] Uygulama içi mesajlaşma
- [ ] Gelişmiş arama filtreleri
- [ ] Profesyonel doğrulama iş akışı
- [ ] İnceleme & derecelendirme sistemi
- [ ] Analitik panosu

Detaylı görev listesi için [TODO.md](./tasks/todo.tr.md) dosyasına bakın.

---

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## Destek

- **Dokümantasyon:** [/docs](./docs/)
- **Sorunlar:** [GitHub Issues](https://github.com/Nedovich/TalkeeNedovich/issues)
- **Expo Dökümanları:** [docs.expo.dev](https://docs.expo.dev/)
- **React Native Dökümanları:** [reactnative.dev](https://reactnative.dev/)

---

## Teşekkürler

- [Expo](https://expo.dev/) ile geliştirildi
- [NativeWind](https://www.nativewind.dev/) ile stillendirildi
- [Lucide](https://lucide.dev/)'den ikonlar
- [Google](https://firebase.google.com/)'dan Firebase
- [Twilio](https://www.twilio.com/) tarafından desteklenen aramalar

---

**Talkee Ekibi tarafından ❤️ ile yapıldı**
