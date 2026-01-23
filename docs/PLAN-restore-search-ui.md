# Plan: Search Sayfası Eski Tasarıma Dönüş (PLAN-restore-search-ui)

## Hedef

Search sayfasını (`app/(tabs)/search.tsx`), kullanıcı tarafından sağlanan backup dosyası (`backup/talkee/app/(tabs)/search.tsx`) ve ekran görüntülerindeki tasarıma göre yeniden yapılandırmak.

## Mevcut Durum vs Hedef Tasarım

| Özellik         | Mevcut Search Sayfası             | Hedef Tasarım (Backup/Görseller)                    |
| :-------------- | :-------------------------------- | :-------------------------------------------------- |
| **Header**      | SearchBar header'ın altında       | SearchBar header'ın **içinde** (entegre)            |
| **Navigasyon**  | Sadece filtre çipleri             | **Tab Yapısı**: Categories, Interests, Trending     |
| **Layout**      | Dikey Infinite Scroll Listesi     | **Yatay Kaydırılabilir Bölümler** (Top Experts vb.) |
| **Kart Yapısı** | Büyük, detaylı `ProfessionalCard` | Kompakt, 3'lü ızgara/yatay kart yapısı              |
| **Filtreleme**  | Modal ve aktif filtre çipleri     | Kategori çipleri (Yatay Scroll)                     |

## Yapılacaklar Listesi

### 1. Header ve Search Bar Entegrasyonu

- [ ] `Header` component'i içine `TextInput` (Search) eklenecek.
- [ ] Sağ taraftaki filtre butonu ikonu `SlidersHorizontal` olarak güncellenecek.
- [ ] Mevcut `SearchBar` component'i sayfadan kaldırılacak.

### 2. Tab Navigasyon Sistemi

- [ ] "Categories", "Interests", "Trending" tabları için state ve UI oluşturulacak.
- [ ] Aktif tab için alt çizgi ve renk değişimleri (Tema uyumlu).

### 3. Kategori ve Filtre Çipleri

- [ ] `useCategories` hook'undan gelen gerçek verilerle yatay kaydırılabilir kategori listesi oluşturulacak.
- [ ] Seçili kategori mantığı "Single Select" (Tek seçim) olarak güncellenecek (Backup'taki gibi).

### 4. İçerik Alanları (Tabs)

#### A. Categories Tab

- [ ] Kategori bazlı bölümler oluşturulacak (`ProfessionalSection` yapısı).
- [ ] Her bölüm için "Top [Category] Experts" başlığı ve "See All" butonu.
- [ ] **Data:** Mevcut `useInfiniteProfessionals` yerine veya yanına, kategori bazlı filtreleme mantığı eklenecek.

#### B. Interests Tab

- [ ] Kullanıcı ilgi alanlarına göre filtrelenmiş bölümler.

#### C. Trending Tab

- [ ] Kompakt kartlardan oluşan Grid (Izgara) görünümü.
- [ ] En çok etkileşim alan profesyoneller gösterilecek.

### 5. Kompakt Kart Tasarımı

- [ ] Backup dosyasındaki inline kart tasarımı (`styles.professionalCard`, `styles.cardAvatar` vb.) koda eklenecek.
- [ ] Online indicator eklenecek.

### 6. Stil ve Tema Uyumluluğu

- [ ] Backup'taki `styles` objesi mevcut dosyaya taşınacak.
- [ ] Renkler `theme` context'inden çekilerek Dark/Light mod uyumu sağlanacak.
