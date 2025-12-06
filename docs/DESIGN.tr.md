# Talkee Tasarım Sistemi

**Versiyon:** 1.0.0
**Son Güncelleme:** 2025-11-15
**Dil:** Türkçe | [English](./DESIGN.md)

---

## İçindekiler

1. [Tasarım İlkeleri](#1-tasarım-ilkeleri)
2. [Renk Sistemi](#2-renk-sistemi)
3. [Tipografi](#3-tipografi)
4. [Boşluk & Düzen](#4-boşluk--düzen)
5. [Bileşenler](#5-bileşenler)
6. [İkonlar & Görseller](#6-i̇konlar--görseller)
7. [Animasyonlar & Geçişler](#7-animasyonlar--geçişler)
8. [Erişilebilirlik](#8-erişilebilirlik)
9. [Platforma Özel Kılavuzlar](#9-platforma-özel-kılavuzlar)

---

## 1. Tasarım İlkeleri

### Temel İlkeler

#### **Netlik**
- Açık görsel hiyerarşi
- Sezgisel navigasyon desenleri
- Belirsiz olmayan eylem butonları
- Şeffaf fiyatlandırma ve bilgilendirme

#### **Tutarlılık**
- Tüm ekranlarda birleşik tasarım dili
- Öngörülebilir etkileşim desenleri
- Tutarlı boşluk ve hizalama
- Standartlaştırılmış renk kullanımı

#### **Erişilebilirlik**
- WCAG 2.1 Seviye AA uyumluluğu
- Metin için minimum 4.5:1 kontrast oranı
- Minimum 44x44 pt dokunma hedefleri
- Ekran okuyucu desteği

#### **Performans**
- Hızlı yüklenme süreleri
- Akıcı 60fps animasyonlar
- Optimize edilmiş görseller ve varlıklar
- Minimum yeniden render

#### **Güven**
- Profesyonel görünüm
- Doğrulanmış rozetler açıkça görünür
- Güvenli ödeme göstergeleri
- Gizlilik bilincine sahip tasarım

---

## 2. Renk Sistemi

### Tema Desteği

Talkee **4 tema** destekler:
1. **Açık** (Varsayılan)
2. **Koyu**
3. **Doğa Yeşili**
4. **Okyanus Mavisi**

Tüm temalar tutarlılık için aynı renk token yapısını takip eder.

### Açık Tema (Varsayılan)

#### Birincil Renkler
```typescript
background:      #ffffff  // Ana arka plan
surface:         #f8fafc  // Kart yüzeyleri
card:            #ffffff  // Kart arka planları

primary:         #007AFF  // Birincil eylemler
primaryLight:    #3b82f6  // Hover durumları
primaryDark:     #1d4ed8  // Aktif durumlar
```

#### Marka Renkleri
```typescript
brandPink:       #682d6e  // Marka kimliği
pink:            #2d2561  // İkincil marka
pinkTwo:         #682d6e  // Vurgu marka
```

#### Metin Renkleri
```typescript
text:            #2d2561  // Birincil metin
textSecondary:   #374151  // İkincil metin
textMuted:       #64748b  // Sönük metin
```

#### Durum Renkleri
```typescript
success:         #10b981  // Başarı durumları
warning:         #f59e0b  // Uyarı durumları
error:           #ef4444  // Hata durumları
info:            #3b82f6  // Bilgi durumları
```

#### Yardımcı Renkler
```typescript
border:          #e6c3ea  // Kenarlıklar
divider:         #e6c3ea  // Ayırıcılar
overlay:         rgba(0, 0, 0, 0.0)  // Modal yer paylaşımları
disabled:        #9ca3af  // Devre dışı öğeler
```

#### Sekme Çubuğu Renkleri
```typescript
tabBarBackground: #ffffff
tabBarBorder:     #e5e7eb
tabBarActive:     #682d6e  // Aktif sekme
tabBarInactive:   #64748b  // Aktif olmayan sekme
```

### Koyu Tema

#### Birincil Renkler
```typescript
background:      #1C1C1E  // iOS koyu gri
surface:         #2C2C2E  // Yükseltilmiş yüzey
card:            #2C2C2E  // Kart arka planları

primary:         #007AFF  // iOS mavi
primaryLight:    #409CFF
primaryDark:     #0051D5
```

#### Metin Renkleri
```typescript
text:            #FFFFFF  // Birincil metin
textSecondary:   #E5E5E7  // İkincil metin
textMuted:       #9E9E9E  // Sönük metin
creditColor:     #ffffff  // Kredi gösterimi
```

#### Durum Renkleri
```typescript
success:         #30D158  // iOS yeşil
warning:         #FFD60A  // iOS sarı
error:           #FF453A  // iOS kırmızı
info:            #64D2FF  // iOS mavi
```

#### Yardımcı Renkler
```typescript
border:          rgba(255, 255, 255, 0.1)
divider:         rgba(255, 255, 255, 0.05)
overlay:         rgba(0, 0, 0, 0.7)
disabled:        #8E8E93
```

### Renk Kullanım Kılavuzları

#### Yapılması Gerekenler ✅
- Ana CTA'lar için `primary` kullanın (Şimdi Ara, Kredi Satın Al)
- Marka öğeleri için `brandPink` kullanın (logolar, aktif sekmeler)
- Durum renklerini (başarı, hata, uyarı) tutarlı kullanın
- Metin okunabilirliği için yeterli kontrast sağlayın
- Yükseltilmiş kartlar için `surface` kullanın

#### Yapılmaması Gerekenler ❌
- Hata/başarı durumları için marka renklerini kullanmayın
- Tema renklerini rastgele karıştırmayın
- Düşük kontrastlı renk kombinasyonları kullanmayın
- Hex değerleri sabit kodlamayın (tema token'larını kullanın)

---

## 3. Tipografi

### Font Ailesi

**Birincil Font:** Inter

```typescript
fontFamily: {
  regular: 'Inter-Regular',
  medium:  'Inter-Medium',
  bold:    'Inter-Bold',
}
```

### Tip Ölçeği

| Stil | Boyut | Ağırlık | Satır Yüksekliği | Kullanım |
|------|-------|---------|------------------|----------|
| **Display** | 32px | Bold | 40px | Sayfa başlıkları |
| **H1** | 28px | Bold | 36px | Bölüm başlıkları |
| **H2** | 24px | Bold | 32px | Kart başlıkları |
| **H3** | 20px | Bold | 28px | Alt başlıklar |
| **H4** | 18px | Medium | 24px | Liste başlıkları |
| **Body Large** | 17px | Regular | 24px | Öne çıkan gövde metni |
| **Body** | 15px | Regular | 22px | Varsayılan gövde metni |
| **Body Small** | 13px | Regular | 18px | İkincil bilgi |
| **Caption** | 12px | Regular | 16px | Etiketler, zaman damgaları |
| **Button** | 16px | Medium | 24px | Buton etiketleri |

### Tipografi Örnekleri

#### Profesyonel Adı
```
Font: Inter-Bold
Boyut: 20px
Renk: theme.colors.text
```

#### Profesyonel Ünvanı
```
Font: Inter-Regular
Boyut: 15px
Renk: theme.colors.textSecondary
```

#### Ücret Gösterimi
```
Font: Inter-Bold
Boyut: 18px
Renk: theme.colors.primary
```

#### Kategori Etiketleri
```
Font: Inter-Medium
Boyut: 14px
Renk: theme.colors.text
```

### Metin Hiyerarşisi En İyi Uygulamaları

1. Ekran başına **maksimum 3 seviye** hiyerarşi
2. **Boyut ve ağırlık yoluyla kontrast**, sadece renk değil
3. Metin öğeleri arasında **tutarlı boşluk**
4. LTR diller için **sola hizala** (İngilizce, Fransızca, Almanca)
5. RTL diller için **sağa hizala** (gelecek düşüncesi)

---

## 4. Boşluk & Düzen

### Boşluk Ölçeği

**4px** temel birime dayalı:

| Token | Değer | Kullanım |
|-------|-------|----------|
| `xs` | 4px | Minimum boşluk, ikon dolgusu |
| `sm` | 8px | Kompakt öğe boşluğu |
| `md` | 16px | Varsayılan öğe boşluğu |
| `lg` | 24px | Bölüm boşluğu |
| `xl` | 32px | Büyük bölüm boşluğu |
| `2xl` | 48px | Sayfa bölüm boşluğu |
| `3xl` | 64px | Büyük bölüm boşluğu |

### Düzen Izgarası

- **Mobil (< 768px):** 16px yan kenar boşlukları
- **Tablet (≥ 768px):** 24px yan kenar boşlukları
- **Sütun aralığı:** 16px
- **Satır aralığı:** 16px

### Konteyner Genişlikleri

```typescript
maxWidth: {
  sm:  640px,  // Küçük cihazlar
  md:  768px,  // Tabletler
  lg:  1024px, // Masaüstleri (gelecek web)
  xl:  1280px, // Büyük masaüstleri
}
```

### Kenarlık Yarıçapı

| Token | Değer | Kullanım |
|-------|-------|----------|
| `none` | 0px | Keskin köşeler |
| `sm` | 4px | Butonlar, girdiler |
| `md` | 8px | Kartlar, modaller |
| `lg` | 12px | Büyük kartlar |
| `xl` | 16px | Öne çıkan kartlar |
| `2xl` | 24px | Kahramanlık öğeleri |
| `full` | 9999px | Dairesel öğeler (avatarlar, rozetler) |

### Güvenli Alanlar

- **iOS:** Çentiği ve ana göstergeyi saygı göster
- **Android:** Durum çubuğunu ve navigasyon çubuğunu saygı göster
- `react-native-safe-area-context`'ten `SafeAreaView` kullan

---

## 5. Bileşenler

### Buton Bileşeni

#### Birincil Buton
```typescript
Arka Plan: theme.colors.primary
Metin: #FFFFFF
Yükseklik: 48px
Dolgu: 12px 24px
Kenarlık Yarıçapı: 8px
Font: Inter-Medium, 16px
```

**Kullanım:** Ana CTA'lar (Şimdi Ara, Satın Al, Gönder)

#### İkincil Buton
```typescript
Arka Plan: şeffaf
Kenarlık: 1px solid theme.colors.border
Metin: theme.colors.text
Yükseklik: 48px
Dolgu: 12px 24px
Kenarlık Yarıçapı: 8px
```

**Kullanım:** İptal, Geri Dön, Alternatif eylemler

#### Küçük Buton
```typescript
Yükseklik: 36px
Dolgu: 8px 16px
Font Boyutu: 14px
```

**Kullanım:** Satır içi eylemler, filtre çipleri

#### Devre Dışı Durumu
```typescript
Arka Plan: theme.colors.disabled
Metin: rgba(255, 255, 255, 0.5)
Opaklık: 0.5
```

### Kart Bileşeni

```typescript
Arka Plan: theme.colors.card
Kenarlık Yarıçapı: 12px
Dolgu: 16px
Gölge: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3, // Android
}
```

**Varyantlar:**
- **Profesyonel Kart:** Avatar, ad, derecelendirme, ücret içerir
- **Kategori Kartı:** İkon, ad, sayı
- **İşlem Kartı:** İkon, açıklama, tutar

### Girdi Bileşeni

```typescript
Arka Plan: theme.colors.surface (açık) / theme.colors.card (koyu)
Kenarlık: 1px solid theme.colors.border
Kenarlık Yarıçapı: 8px
Yükseklik: 48px
Dolgu: 12px 16px
Font: Inter-Regular, 15px
Yer Tutucu Rengi: theme.colors.textMuted
```

**Durumlar:**
- **Odak:** Kenarlık rengi `theme.colors.primary` olarak değişir
- **Hata:** Kenarlık rengi `theme.colors.error` olarak değişir
- **Devre Dışı:** Arka plan opaklığı 0.5

### Avatar Bileşeni

```typescript
Boyut: {
  sm: 32px,
  md: 48px,
  lg: 64px,
  xl: 96px,
}
Kenarlık Yarıçapı: full (dairesel)
Kenarlık: 2px solid theme.colors.border (opsiyonel)
```

**Çevrimiçi Göstergesi:**
- Pozisyon: Sağ alt
- Boyut: 12px
- Renk: `#30D158` (yeşil)
- Kenarlık: 2px solid arka plan

### Rozet Bileşeni

```typescript
Arka Plan: theme.colors.primary / theme.colors.success
Dolgu: 4px 8px
Kenarlık Yarıçapı: 12px (hap şekli)
Font: Inter-Medium, 11px
Metin Rengi: #FFFFFF
```

**Varyantlar:**
- **Doğrulanmış:** Mavi onay işareti ikonu
- **En Yüksek Puan:** Yıldız ikonu
- **Hızlı Yanıt:** Şimşek ikonu

### Sekme Çubuğu

```typescript
Yükseklik: 60px
Arka Plan: theme.colors.tabBarBackground
Üst Kenarlık: 1px solid theme.colors.tabBarBorder
Dolgu: 8px 0
```

**Sekme Öğesi:**
```typescript
İkon Boyutu: 24px
Etiket Fontu: Inter-Regular, 11px
Aktif Renk: theme.colors.tabBarActive
Aktif Olmayan Renk: theme.colors.tabBarInactive
```

### Modal Bileşeni

```typescript
Arka Plan: theme.colors.card
Kenarlık Yarıçapı: 16px 16px 0 0 (alt sayfa)
Dolgu: 24px
Maksimum Yükseklik: Ekran yüksekliğinin %80'i
```

**Arka Fon:**
```typescript
Arka Plan: theme.colors.overlay
Opaklık: 0.7
Bulanıklık: 10px (sadece iOS)
```

### Toast Bildirimi

```typescript
Pozisyon: Üst (güvenli alan)
Arka Plan: {
  success: theme.colors.success,
  error: theme.colors.error,
  info: theme.colors.info,
  warning: theme.colors.warning,
}
Metin Rengi: #FFFFFF
Dolgu: 16px
Kenarlık Yarıçapı: 12px
Gölge: elevation 5
Süre: 3000ms (otomatik kapatma)
```

---

## 6. İkonlar & Görseller

### İkon Sistemi

**Birincil İkon Kütüphanesi:** Lucide React Native

**İkon Boyutları:**
- `xs`: 16px
- `sm`: 20px
- `md`: 24px
- `lg`: 32px
- `xl`: 48px

**İkon Renkleri:**
- Varsayılan ikonlar için `theme.colors.text` kullanın
- İkincil ikonlar için `theme.colors.textMuted` kullanın
- Durum ikonları için anlamsal renkleri kullanın

### Kategori İkonları

| Kategori | İkon | Renk |
|----------|------|------|
| İş Dünyası | `briefcase` | #007AFF |
| Teknoloji | `smartphone` | #5856D6 |
| Sağlık | `heart` | #30D158 |
| Finans | `dollar-sign` | #FFD60A |
| Yaşam Tarzı | `star` | #FF9F0A |
| Eğitim | `book` | #64D2FF |
| Tasarım | `palette` | #BF5AF2 |
| Eğlence | `music` | #FF375F |
| Spor | `dumbbell` | #32D74B |
| Otomotiv | `car` | #8E8E93 |
| Fotoğrafçılık | `camera` | #FF6B35 |
| Oyun | `gamepad` | #5AC8FA |

### Avatar Görselleri

**Gereksinimler:**
- Minimum çözünürlük: 256x256px
- En-boy oranı: 1:1 (kare)
- Format: JPEG veya PNG
- Maksimum dosya boyutu: 500KB
- Kalite: %85

**Yer Tutucu:**
- Baş harfleri kullan (ad ve soyadın ilk harfi)
- Arka Plan: `theme.colors.primary`
- Metin: `#FFFFFF`

### Profesyonel Görseller

**Profil Fotoğrafları:**
- Minimum çözünürlük: 512x512px
- Profesyonel görünüm
- Net yüz görünürlüğü
- Nötr arka plan tercih edilir

**Promosyon Afişleri:**
- En-boy oranı: 16:9
- Minimum çözünürlük: 800x450px
- Metin okunabilirliği için yer paylaşımı gradyanı

---

## 7. Animasyonlar & Geçişler

### Animasyon İlkeleri

1. **Amaçlı:** Her animasyonun bir nedeni vardır
2. **Hızlı:** Geçişler hızlı olmalıdır (200-300ms)
3. **Doğal:** Organik his için kolaylaştırma fonksiyonları kullanın
4. **Tutarlı:** Aynı öğeler aynı şekilde animasyonlanır

### Standart Süreler

| Süre | Kullanım |
|------|----------|
| **100ms** | Mikro etkileşimler (buton basma) |
| **200ms** | Standart geçişler (sayfa kaydırma) |
| **300ms** | Orta animasyonlar (modal görünme) |
| **500ms** | Karmaşık animasyonlar (carousel kaydırma) |

### Kolaylaştırma Fonksiyonları

```typescript
easing: {
  easeOut:    'cubic-bezier(0.0, 0.0, 0.2, 1)',  // Yavaşlama
  easeIn:     'cubic-bezier(0.4, 0.0, 1, 1)',    // Hızlanma
  easeInOut:  'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Standart
  spring:     { damping: 20, stiffness: 300 },   // Yay fiziği
}
```

### Yaygın Animasyonlar

#### Sayfa Geçişi
```typescript
Tip: Kaydırma
Yön: Sağdan sola (ileri), soldan sağa (geri)
Süre: 200ms
Kolaylaştırma: easeInOut
```

#### Modal Görünme
```typescript
Tip: Solma + Ölçekleme
Başlangıç: opacity 0, scale 0.95
Son: opacity 1, scale 1
Süre: 300ms
Kolaylaştırma: easeOut
```

#### Buton Basma
```typescript
Tip: Ölçekleme
Basma: scale 0.95
Bırakma: scale 1
Süre: 100ms
```

#### Toast Bildirimi
```typescript
Giriş: slideInDown (üstten)
Çıkış: fadeOut
Süre: 300ms
```

#### Yükleme Döndürücü
```typescript
Tip: Döndürme
Süre: 1000ms (sürekli)
Kolaylaştırma: linear
```

### Haptik Geri Bildirim

Dokunsal geri bildirim için `expo-haptics` kullanın:

```typescript
import * as Haptics from 'expo-haptics';

// Hafif dokunma
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Orta dokunma
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Başarı
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Hata
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

**Kullanım:**
- Buton basma: Hafif etki
- Anahtar değiştirme: Orta etki
- Satın alma başarısı: Başarı bildirimi
- Hata durumu: Hata bildirimi

---

## 8. Erişilebilirlik

### WCAG 2.1 Seviye AA Uyumluluğu

#### Renk Kontrastı

**Minimum Oranlar:**
- Normal metin (< 18px): 4.5:1
- Büyük metin (≥ 18px): 3:1
- UI bileşenleri: 3:1

**Araçlar:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) kullanın
- Tüm metin/arka plan kombinasyonlarını test edin

#### Dokunma Hedefleri

**Minimum Boyut:** 44x44 nokta (iOS HIG)

**En İyi Uygulamalar:**
- Dokunulabilir öğeler arasında yeterli boşluk sağlayın
- Küçük butonları kümelemeyin
- Dokunma alanını artırmak için dolgu kullanın

#### Ekran Okuyucu Desteği

**Erişilebilirlik Etiketleri:**
```typescript
<Button
  accessibilityLabel="Dr. Sarah Chen'i Ara"
  accessibilityHint="Dr. Sarah Chen ile sesli arama başlatır"
  accessibilityRole="button"
>
  Şimdi Ara
</Button>
```

**Görsel Açıklamaları:**
```typescript
<Image
  source={{ uri: professional.avatar }}
  accessibilityLabel={`${professional.name}'in profil fotoğrafı`}
/>
```

**Dinamik İçerik:**
```typescript
<Text accessibilityLiveRegion="polite">
  {`Bakiye: $${balance}`}
</Text>
```

#### Odak Yönetimi

- Mantıksal sekme sırasını sağlayın
- Görünür odak göstergelerini sağlayın
- Modal kapatıldıktan sonra odağı geri döndürün

#### Azaltılmış Hareket

`prefers-reduced-motion`'a saygı gösterin:

```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

// Animasyonları koşullu olarak devre dışı bırakın
{!reduceMotion && <AnimatedComponent />}
```

---

## 9. Platforma Özel Kılavuzlar

### iOS Kılavuzları

#### Navigasyon
- Native navigasyon desenlerini kullanın (geri gitmek için kaydırın)
- Birincil eylemleri sağ üst köşeye yerleştirin
- Uygun olduğunda SF Symbols kullanın

#### Sekme Çubuğu
- Alt sekme çubuğu (iOS standardı)
- Her sekme için ikon + etiket
- Aktif durum marka rengini kullanır

#### Modaller
- Çoğu modal için alt sayfa stili
- Kritik akışlar için tam ekran (başlangıç)
- Aşağı kaydırarak veya kapat butonuyla kapatın

#### Durum Çubuğu
- Koyu arka planlarda açık içerik
- Açık arka planlarda koyu içerik
- Aramalar sırasında otomatik gizle

### Android Kılavuzları

#### Navigasyon
- Material Design desenlerini kullanın
- Başlıkta geri butonu sağlayın
- Sistem geri butonunu destekleyin

#### Sekme Çubuğu
- Alt navigasyon (Material Design)
- İkon + etiket (tutarlılık için iOS ile aynı)
- Basıldığında dalga efekti

#### Modaller
- Ortaya hizalanmış modaller
- Arka plan kapatma
- Scrim yer paylaşımı (%50 opaklık)

#### Durum Çubuğu
- Yarı saydam durum çubuğu
- Sistem navigasyon çubuğuna saygı göster
- Farklı ekran boyutlarına göre ayarlayın

### Platformlar Arası Tutarlılık

**Tutarlı Tutun:**
- Renk şemaları
- Tipografi ölçeği
- Bileşen davranışı
- İkonografi
- Boşluk sistemi

**Platforma Özel:**
- Navigasyon geçişleri
- Modal sunumları
- Sistem UI (durum çubuğu, navigasyon çubuğu)
- Native kontroller (tarih seçici, eylem sayfası)

---

## Tasarım Kaynakları

### Figma Dosyaları
- [Oluşturulacak] Ana tasarım dosyası
- [Oluşturulacak] Bileşen kütüphanesi
- [Oluşturulacak] İkon seti

### Renk Paletleri
- `/themes/index.ts`'den dışa aktar
- Figma ve kodda mevcut

### Tipografi
- Inter font ailesi ([Google Fonts](https://fonts.google.com/specimen/Inter))
- Ağırlıklar: Regular (400), Medium (500), Bold (700)

### İkonlar
- Lucide React Native ([Dokümantasyon](https://lucide.dev/))
- Expo Vector Icons ([Dokümantasyon](https://icons.expo.fyi/))

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 1.0.0 | 2025-11-15 | İlk tasarım sistemi dokümantasyonu |

---

**Yöneten:** Tasarım & Geliştirme Ekibi
**İnceleme Döngüsü:** Aylık veya büyük UI değişikliklerinden sonra
**Geri Bildirim:** GitHub issues üzerinden tasarım iyileştirme önerilerini gönderin
