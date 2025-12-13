# Push Notification Senaryoları (Push Notification Scenarios)

Bu belge, Talkee uygulamasında kullanılan push bildirim senaryolarını, tetiklenme durumlarını ve davranışlarını listeler.

## Bildirim Tipleri ve Senaryolar

Aşağıdaki liste, `NotificationType` enum değerlerine dayalı olarak belirlenmiş bildirim senaryolarını içerir.

### 1. Arama İsteği (Call Request)
*   **Kod:** `call_request`
*   **Ne Zaman Gönderilir:** Bir kullanıcı (danışan), bir uzamanı (professional) aradığında.
*   **Alıcı:** Uzman (Professional)
*   **Örnek Başlık:** Yeni Arama İsteği
*   **Örnek İçerik:** "{Kullanıcı Adı} görüntülü/sesli arama yapmak istiyor."
*   **Tıklama Aksiyonu:** Uygulama açılır ve gelen arama ekranına (Incoming Call Screen) yönlendirir. `call_id` verisini taşır.

### 2. Arama Başladı (Call Started)
*   **Kod:** `call_started`
*   **Ne Zaman Gönderilir:** Arama bağlantısı başarılı bir şekilde kurulduğunda (örneğin randevulu bir arama başladığında).
*   **Alıcı:** Kullanıcı ve/veya Uzman
*   **Örnek Başlık:** Görüşme Başladı
*   **Örnek İçerik:** "{Uzman Adı} ile görüşmeniz başladı."
*   **Tıklama Aksiyonu:** Aktif görüşme ekranına (Active Call Screen) yönlendirir.

### 3. Arama Sonlandı (Call Ended)
*   **Kod:** `call_ended`
*   **Ne Zaman Gönderilir:** Görüşme tamamlandığında (Özet veya bilgilendirme amaçlı).
*   **Alıcı:** Kullanıcı ve Uzman
*   **Örnek Başlık:** Görüşme Sonlandı
*   **Örnek İçerik:** Görüşme süresi: 15dk. Toplam Tutar: 150 TL.
*   **Tıklama Aksiyonu:** Görüşme özeti veya geçmiş ekranına yönlendirir.

### 4. Ödeme Bildirimi (Payment)
*   **Kod:** `payment`
*   **Ne Zaman Gönderilir:** Bir görüşme tamamlanıp ödeme başarıyla tahsil edildiğinde ve uzmanın hesabına geçtiğinde.
*   **Alıcı:** Uzman (Professional)
*   **Örnek Başlık:** Ödeme Alındı
*   **Örnek İçerik:** "Son görüşmenizden {Tutar} kazandınız."
*   **Tıklama Aksiyonu:** Cüzdan/Kazançlar sayfasına yönlendirir.

### 5. Değerlendirme Hatırlatması (Review)
*   **Kod:** `review`
*   **Ne Zaman Gönderilir:** Görüşme bittikten kısa bir süre sonra, kullanıcıyı değerlendirme yapmaya teşvik etmek için.
*   **Alıcı:** Kullanıcı (Danışan)
*   **Örnek Başlık:** Deneyiminizi Puanlayın
*   **Örnek İçerik:** "{Uzman Adı} ile yaptığınız görüşmeyi nasıl buldunuz?"
*   **Tıklama Aksiyonu:** İlgili görüşme için değerlendirme/yorum yapma ekranına yönlendirir.

### 6. Yeni Mesaj (Message)
*   **Kod:** `message`
*   **Ne Zaman Gönderilir:** Uygulama içi sohbet üzerinden yeni bir mesaj alındığında.
*   **Alıcı:** Mesajın Alıcısı
*   **Örnek Başlık:** Yeni Mesaj
*   **Örnek İçerik:** "{Gönderen}: Merhaba, müsaitlik durumunuz..."
*   **Tıklama Aksiyonu:** İlgili sohbet odasına yönlendirir.

### 7. Sistem Duyurusu (System)
*   **Kod:** `system`
*   **Ne Zaman Gönderilir:** Genel duyurular, bakım çalışmaları, uygulama güncellemeleri veya kampanyalar hakkında bilgi vermek için.
*   **Alıcı:** Tüm Kullanıcılar veya Hedeflenen Grup
*   **Örnek Başlık:** Talkee Güncellemesi
*   **Örnek İçerik:** "Yeni özelliklerimiz yayında! Hemen keşfedin."
*   **Tıklama Aksiyonu:** Ana sayfa, duyuru detay sayfası veya ilgili kampanya sayfasına yönlendirir (`action_url` parametresine göre).

---

## Teknik Detaylar

Bildirimler `notifications` tablosuna kayıt edildikten sonra tetiklenir veya Notification Service aracılığıyla doğrudan Expo Push API kullanılarak gönderilir.

**Örnek Payload:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Yeni Arama İsteği",
  "body": "Ali Yılmaz sizi arıyor",
  "data": {
    "type": "call_request",
    "call_id": "12345-67890",
    "professional_id": "prof-123"
  },
  "sound": "default"
}
```
