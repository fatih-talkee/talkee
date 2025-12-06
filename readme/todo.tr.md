# Talkee Proje YAPILACAKLAR Listesi

**Son Güncelleme:** 2025-11-15
**Dil:** Türkçe | [English](./todo.md)

---

## Öncelik Göstergeleri

- 🔴 **P0 - Kritik:** Hemen yapılmalı
- 🟠 **P1 - Yüksek:** Yakında yapılmalı
- 🟡 **P2 - Orta:** Önemli ama acil değil
- 🟢 **P3 - Düşük:** Olsa güzel olur
- ✅ **Tamamlandı**
- 🚧 **Devam Ediyor**
- ⏸️ **Engellendi**

---

## Faz 1: Proje Kurulumu & Dokümantasyon

### Dokümantasyon
- [x] ✅ Proje dokümantasyon yapısını oluştur
- [x] ✅ BLUEPRINT.md oluştur (EN & TR)
- [x] ✅ DESIGN.md oluştur (EN & TR)
- [x] ✅ CLAUDE.md oluştur (EN & TR) - Devam ediyor
- [x] ✅ İlk TODO listesini oluştur (EN & TR)
- [x] ✅ Oturum notları yapısını oluştur
- [ ] 🟡 **P2** Tüm API uç noktalarını belgele
- [ ] 🟡 **P2** Mimari diyagramları oluştur
- [ ] 🟢 **P3** Dokümantasyona kod örnekleri ekle

### Proje Denetimi
- [ ] 🟠 **P1** Firebase entegrasyon durumunu denetle
  - [ ] Firebase Authentication
  - [ ] Firestore veritabanı
  - [ ] Firebase Storage
  - [ ] Cloud Messaging (FCM)
- [ ] 🟠 **P1** Twilio Voice SDK entegrasyonunu doğrula
  - [ ] Sesli arama işlevi
  - [ ] Görüntülü arama işlevi
  - [ ] Arama kaydı
  - [ ] Arama meta veri depolama
- [ ] 🟡 **P2** Mock vs. gerçek veri kullanımını belirle
  - [ ] Mock veriyi Firebase verisi ile değiştir
  - [ ] Kullanılmayan mock veriyi kaldır
  - [ ] Veri geçiş yolunu belgele

### TypeScript İyileştirmeleri
- [ ] 🟠 **P1** Merkezi tip tanımlarını oluştur
  - [ ] `/types/api.ts` - API yanıt tipleri
  - [ ] `/types/models.ts` - Veri modelleri
  - [ ] `/types/navigation.ts` - Navigasyon tipleri
- [ ] 🟡 **P2** Strict null kontrolleri ekle
- [ ] 🟡 **P2** İmplicit 'any' tiplerini kaldır
- [ ] 🟢 **P3** Karmaşık fonksiyonlara JSDoc yorumları ekle

---

## Faz 2: Temel Özelliklerin Uygulanması

### Gerçek Zamanlı Arama (Twilio)
- [ ] 🔴 **P0** Twilio Voice SDK entegrasyonunu tamamla
  - [ ] Sesli aramayı uygula
  - [ ] Görüntülü aramayı uygula
  - [ ] Arama kontrollerini ekle (sustur, hoparlör, video değiştir)
  - [ ] Arama süresi takibini uygula
  - [ ] Arama kalite göstergelerini ekle
- [ ] 🟠 **P1** Arama kaydını uygula
  - [ ] Ses/video aramaları kaydet
  - [ ] Kayıtları Firebase Storage'a yükle
  - [ ] Oynatma işlevselliği
- [ ] 🟠 **P1** Arama bildirimlerini ekle
  - [ ] Gelen arama bildirimleri
  - [ ] Cevapsız arama bildirimleri
  - [ ] Arama sonlandı bildirimleri

### Ödeme Entegrasyonu
- [ ] 🔴 **P0** Stripe ödeme ağ geçidini entegre et
  - [ ] Stripe hesabı kur
  - [ ] Kredi satın alma akışını uygula
  - [ ] Ödeme yöntemi yönetimini ekle
  - [ ] Güvenli ödeme işlemeyi uygula
- [ ] 🟠 **P1** İşlem geçmişi ekle
  - [ ] Tüm işlemleri göster
  - [ ] Türe göre filtrele (gelir/gider)
  - [ ] İşlem verilerini dışa aktar
- [ ] 🟡 **P2** İade sistemini uygula
- [ ] 🟡 **P2** Ödeme makbuzlarını ekle (e-posta/indirme)

### Push Bildirimleri
- [ ] 🟠 **P1** Firebase Cloud Messaging'i kur
  - [ ] iOS için FCM yapılandır
  - [ ] Android için FCM yapılandır
  - [ ] Bildirim izinleri iste
- [ ] 🟠 **P1** Bildirim türlerini uygula
  - [ ] Gelen arama bildirimleri
  - [ ] Mesaj bildirimleri
  - [ ] Randevu hatırlatıcıları
  - [ ] Ödeme onayları
  - [ ] Promosyon bildirimleri
- [ ] 🟡 **P2** Bildirim tercihlerini ekle
  - [ ] Türe göre etkinleştir/devre dışı bırak
  - [ ] Sessiz saatler
  - [ ] Ses/titreşim ayarları

### Randevu Sistemi
- [ ] 🟠 **P1** Planlama sistemini kur
  - [ ] Takvim görünümü
  - [ ] Randevu rezervasyonu
  - [ ] Randevuları düzenle
  - [ ] Randevuları iptal et
- [ ] 🟠 **P1** Randevu hatırlatıcıları ekle
  - [ ] Push bildirimleri
  - [ ] E-posta hatırlatıcıları (opsiyonel)
- [ ] 🟡 **P2** Yinelenen randevuları uygula
- [ ] 🟡 **P2** Zaman dilimi desteği ekle

### Profesyonel İşe Alım
- [ ] 🟠 **P1** Profesyonel kayıt akışını oluştur
  - [ ] Profesyonel bilgi formu
  - [ ] Ücret belirleme
  - [ ] Müsaitlik yapılandırması
  - [ ] Kategori seçimi
- [ ] 🟠 **P1** Doğrulama iş akışını uygula
  - [ ] Belge yükleme
  - [ ] Manuel inceleme süreci
  - [ ] Doğrulama rozeti ataması
- [ ] 🟡 **P2** KYC/kimlik doğrulaması ekle
- [ ] 🟡 **P2** Profesyoneller için analitik panosu oluştur
  - [ ] Kazanç genel bakışı
  - [ ] Arama istatistikleri
  - [ ] Derecelendirme trendleri

### İnceleme & Derecelendirme Sistemi
- [ ] 🟠 **P1** Derecelendirme sistemini uygula
  - [ ] Aramalardan sonra profesyonelleri değerlendir
  - [ ] 5 yıldızlı derecelendirme ölçeği
  - [ ] Ortalama derecelendirme hesaplama
- [ ] 🟠 **P1** İnceleme işlevselliği ekle
  - [ ] Metin incelemeleri yaz
  - [ ] İncelemeleri düzenle/sil
  - [ ] Moderasyon sistemi
- [ ] 🟡 **P2** Profillerde derecelendirmeleri göster
- [ ] 🟡 **P2** İnceleme sıralama/filtreleme ekle

---

## Faz 3: Yerelleştirme & UX

### Uluslararasılaşma
- [ ] 🟠 **P1** Tüm çevirileri tamamla
  - [ ] İspanyolca (es.json) - şu anda boş
  - [ ] Fransızca (fr.json) - şu anda boş
  - [ ] Almanca (de.json) - şu anda boş
- [ ] 🟡 **P2** Dil seçim UI'ı ekle
- [ ] 🟡 **P2** RTL dilleri test et (gelecek)
- [ ] 🟢 **P3** Daha fazla dil ekle (İtalyanca, Portekizce, vb.)

### Gelişmiş Arama & Filtreler
- [ ] 🟠 **P1** Arama filtrelerini uygula
  - [ ] Fiyat aralığı filtresi
  - [ ] Derecelendirme filtresi
  - [ ] Müsaitlik filtresi (çevrimiçi/çevrimdışı)
  - [ ] Kategori filtresi
  - [ ] Dil filtresi
  - [ ] Uzmanlık filtresi
- [ ] 🟡 **P2** Arama önerileri ekle
- [ ] 🟡 **P2** Arama geçmişini uygula
- [ ] 🟢 **P3** Sesli arama ekle

### Yükleme Durumları & İskeletler
- [ ] 🟡 **P2** İskelet yükleyiciler ekle
  - [ ] Profesyonel kartları
  - [ ] Kategori ızgarası
  - [ ] Profil ekranları
  - [ ] İşlem listesi
- [ ] 🟡 **P2** Shimmer efekti uygula
- [ ] 🟡 **P2** Yenilemek için çek ekle
- [ ] 🟡 **P2** Yükleme göstergeleriyle sonsuz kaydırma ekle

### Hata İşleme
- [ ] 🟠 **P1** Hata sınırlarını uygula
  - [ ] Ekran seviyesi hata sınırları
  - [ ] Bileşen seviyesi hata sınırları
  - [ ] Analitiğe hata raporlama
- [ ] 🟠 **P1** Yeniden deneme mekanizmaları ekle
  - [ ] Ağ isteği yeniden denemeleri
  - [ ] Başarısız API çağrısı yeniden denemeleri
  - [ ] Üstel geri çekilme
- [ ] 🟡 **P2** Kullanıcı dostu hata mesajları oluştur
- [ ] 🟡 **P2** Çevrimdışı mod algılama ekle

### Performans Optimizasyonu
- [ ] 🟡 **P2** Görsel optimizasyonu uygula
  - [ ] Tembel yükleme görselleri
  - [ ] Görsel sıkıştırma
  - [ ] Responsive görsel boyutları
  - [ ] WebP format desteği
- [ ] 🟡 **P2** Liste render'ını optimize et
  - [ ] FlatList optimizasyon props'ları kullan
  - [ ] Windowing uygula
  - [ ] Pahalı bileşenleri memoize et
- [ ] 🟡 **P2** Önbellekleme ekle
  - [ ] API yanıtlarını önbelleğe al
  - [ ] Görselleri önbelleğe al
  - [ ] Çevrimdışı veri kalıcılığı uygula
- [ ] 🟢 **P3** Paket boyutunu analiz et
- [ ] 🟢 **P3** Kod bölme uygula

---

## Faz 4: Test & Kalite

### Birim Testi
- [ ] 🟡 **P2** Test çerçevesini kur (Jest)
- [ ] 🟡 **P2** Yardımcı fonksiyonlar için testler yaz
  - [ ] `/lib/storage.ts`
  - [ ] `/lib/i18n.ts`
  - [ ] `/lib/toastService.ts`
- [ ] 🟡 **P2** Hook'lar için testler yaz
  - [ ] `useFrameworkReady.ts`
  - [ ] `useIsMounted.ts`
- [ ] 🟢 **P3** %70+ kod kapsamı elde et

### Entegrasyon Testi
- [ ] 🟡 **P2** Entegrasyon test çerçevesini kur
- [ ] 🟡 **P2** Kritik akışları test et
  - [ ] Kimlik doğrulama akışı
  - [ ] Profesyonel arama akışı
  - [ ] Kredi satın alma akışı
  - [ ] Arama başlatma akışı
- [ ] 🟢 **P3** E2E testleri ekle (Detox)

### Erişilebilirlik Testi
- [ ] 🟡 **P2** Erişilebilirlik denetimi yap
  - [ ] VoiceOver ile test et (iOS)
  - [ ] TalkBack ile test et (Android)
  - [ ] Renk kontrastını kontrol et
  - [ ] Dokunma hedef boyutlarını doğrula
- [ ] 🟡 **P2** Erişilebilirlik sorunlarını düzelt
- [ ] 🟡 **P2** Erişilebilirlik etiketleri ekle
- [ ] 🟢 **P3** WCAG 2.1 Seviye AA uyumluluğu elde et

### Performans Testi
- [ ] 🟡 **P2** Uygulama performansını test et
  - [ ] Kare hızını ölç (%60fps hedef)
  - [ ] Düşük seviye cihazlarda test et
  - [ ] Bellek kullanımını profille
  - [ ] Uygulama boyutunu kontrol et
- [ ] 🟡 **P2** Firebase Firestore'u yük testi yap
  - [ ] Eş zamanlı kullanıcıları test et
  - [ ] Sorgu performansını test et
  - [ ] Veritabanı sorgularını optimize et
- [ ] 🟢 **P3** Performans izleme uygula

### Güvenlik Denetimi
- [ ] 🟠 **P1** Güvenlik incelemesi
  - [ ] API anahtar maruziyetini kontrol et
  - [ ] Kullanıcı girdisini doğrula
  - [ ] Hız sınırlaması uygula
  - [ ] CSRF koruması ekle
  - [ ] SQL injection kontrol et (uygulanabilirse)
- [ ] 🟠 **P1** Firebase güvenlik kurallarını gözden geçir
- [ ] 🟡 **P2** SSL pinning uygula
- [ ] 🟡 **P2** Biyometrik kimlik doğrulama ekle (opsiyonel)

---

## Faz 5: Dağıtım Hazırlığı

### Build Yapılandırması
- [ ] 🟠 **P1** EAS build profillerini yapılandır
  - [ ] Development profili
  - [ ] Preview profili
  - [ ] Production profili
- [ ] 🟠 **P1** Ortam değişkenlerini kur
  - [ ] Development ortamı
  - [ ] Staging ortamı
  - [ ] Production ortamı
- [ ] 🟡 **P2** Uygulama versiyonlamasını yapılandır
- [ ] 🟡 **P2** OTA güncellemeleri kur

### iOS Kurulumu
- [ ] 🟠 **P1** Apple Developer hesabı oluştur
- [ ] 🟠 **P1** App Store Connect'i yapılandır
  - [ ] Uygulama listesi oluştur
  - [ ] Uygulama meta verilerini kur
  - [ ] Ekran görüntülerini yükle
  - [ ] Uygulama açıklaması yaz
- [ ] 🟠 **P1** Sertifika & profiller oluştur
- [ ] 🟡 **P2** App Store incelemesine gönder
- [ ] 🟡 **P2** İnceleme geri bildirimini ele al

### Android Kurulumu
- [ ] 🟠 **P1** Google Play Console hesabı oluştur
- [ ] 🟠 **P1** Play Store listesini yapılandır
  - [ ] Uygulama listesi oluştur
  - [ ] Uygulama meta verilerini kur
  - [ ] Ekran görüntülerini yükle
  - [ ] Uygulama açıklaması yaz
- [ ] 🟠 **P1** İmzalama anahtarı oluştur
- [ ] 🟡 **P2** Play Store incelemesine gönder
- [ ] 🟡 **P2** İnceleme geri bildirimini ele al

### Yasal & Uyumluluk
- [ ] 🔴 **P0** Gizlilik politikası oluştur
  - [ ] Veri toplama açıklaması
  - [ ] Üçüncü taraf servisler
  - [ ] Kullanıcı hakları (GDPR/CCPA)
- [ ] 🔴 **P0** Hizmet şartları oluştur
  - [ ] Kullanıcı sözleşmesi
  - [ ] Profesyonel sözleşmesi
  - [ ] Ödeme şartları
  - [ ] Anlaşmazlık çözümü
- [ ] 🟠 **P1** Çerez onayı ekle (web için)
- [ ] 🟠 **P1** Veri silme özelliği uygula
- [ ] 🟡 **P2** GDPR uyumluluk özellikleri ekle

### Gerçek Cihazlarda Test
- [ ] 🟠 **P1** Fiziksel iOS cihazlarda test et
  - [ ] iPhone SE (küçük ekran)
  - [ ] iPhone 14 Pro (çentik)
  - [ ] iPhone 15 Pro Max (büyük ekran)
  - [ ] iPad (tablet)
- [ ] 🟠 **P1** Fiziksel Android cihazlarda test et
  - [ ] Düşük seviye cihaz
  - [ ] Orta seviye cihaz
  - [ ] Amiral gemisi cihaz
  - [ ] Tablet
- [ ] 🟡 **P2** Farklı işletim sistemi versiyonlarında test et
  - [ ] iOS 13, 14, 15, 16, 17
  - [ ] Android 7, 8, 9, 10, 11, 12, 13, 14

---

## Faz 6: Lansman Sonrası

### İzleme & Analitik
- [ ] 🟠 **P1** Çökme raporlamayı kur
  - [ ] Sentry veya benzeri
  - [ ] Hata takibini yapılandır
  - [ ] Uyarıları kur
- [ ] 🟠 **P1** Analitik uygula
  - [ ] Firebase Analytics
  - [ ] Kullanıcı olaylarını takip et
  - [ ] Dönüşüm hunilerini izle
- [ ] 🟡 **P2** Performans izleme ekle
  - [ ] Firebase Performance
  - [ ] API gecikme süresini takip et
  - [ ] Uygulama başlangıç zamanını izle
- [ ] 🟢 **P3** A/B test çerçevesi kur

### Kullanıcı Geri Bildirimi
- [ ] 🟡 **P2** Uygulama içi geri bildirim formu ekle
- [ ] 🟡 **P2** App store incelemelerini izle
- [ ] 🟡 **P2** Geri bildirim toplama süreci oluştur
- [ ] 🟢 **P3** NPS anketleri uygula

### Özellik İterasyonu
- [ ] 🟡 **P2** Kullanıcı davranışını analiz et
  - [ ] Düşüş noktalarını belirle
  - [ ] En çok kullanılan özellikleri bul
  - [ ] Sorunlu noktaları keşfet
- [ ] 🟡 **P2** Özellik isteklerini önceliklendir
- [ ] 🟡 **P2** Özellik yol haritasını planla
- [ ] 🟢 **P3** Kullanıcı görüşmeleri yap

### Pazarlama & Büyüme
- [ ] 🟡 **P2** App store optimizasyon (ASO) stratejisi oluştur
- [ ] 🟡 **P2** Lansman duyurusunu hazırla
- [ ] 🟡 **P2** Sosyal medya hesapları kur
- [ ] 🟢 **P3** Promosyon materyalleri oluştur
- [ ] 🟢 **P3** Kullanıcı edinme kampanyalarını planla

---

## Backlog (Gelecek İyileştirmeler)

### Özellik Fikirleri
- [ ] 🟢 **P3** Uygulama içi mesajlaşma sistemi
- [ ] 🟢 **P3** Grup aramaları/webinar'lar
- [ ] 🟢 **P3** Aramalar sırasında ekran paylaşımı
- [ ] 🟢 **P3** AI destekli profesyonel önerileri
- [ ] 🟢 **P3** Sohbet transkripsiyon ve özetleri
- [ ] 🟢 **P3** Referans ve ödül programı
- [ ] 🟢 **P3** Abonelik planları
- [ ] 🟢 **P3** Hediye krediler
- [ ] 🟢 **P3** Sosyal paylaşım özellikleri
- [ ] 🟢 **P3** Zamana göre otomatik koyu mod değiştirme

### Teknik İyileştirmeler
- [ ] 🟢 **P3** Expo Router v6'ya geçiş
- [ ] 🟢 **P3** GraphQL uygula (gerekirse)
- [ ] 🟢 **P3** Redis önbellekleme katmanı ekle
- [ ] 🟢 **P3** Mikroservis mimarisi uygula
- [ ] 🟢 **P3** CI/CD pipeline ekle
- [ ] 🟢 **P3** Backend servislerini konteynerize et

---

## Notlar

- Bu listeyi haftalık olarak gözden geçir ve güncelle
- Tamamlanan öğeleri tarihle işaretle
- Tamamlanan öğeleri `/tasks/completed.md`'ye taşı (opsiyonel)
- Ortaya çıkan yeni öğeleri ekle
- İş ihtiyaçlarına göre öncelikleri yeniden belirle

---

**Yöneten:** Geliştirme Ekibi
**Son İnceleme:** 2025-11-15
