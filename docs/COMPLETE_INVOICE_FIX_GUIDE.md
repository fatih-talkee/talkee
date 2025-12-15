# 📋 Invoice Fix - Baştan Sona Adım Adım Rehber

## 🎯 Ne Yapıyoruz?

Payment başarılı olduğunda `invoices` tablosuna kayıt oluşturmak.

---

## ✅ Durum Kontrolü

### Şu Ana Kadar Yapılanlar

1. ✅ Invoice insert kodu webhook'a eklendi (`stripe-webhook/index.ts`)
2. ✅ Schema kontrolü yapıldı - hata yok
3. ✅ Test insert başarılı - hata yok

### Şimdi Yapılacaklar

1. ⏳ Webhook'u deploy et
2. ⏳ Test payment yap
3. ⏳ Invoice'ları kontrol et

---

## 📝 ADIM ADIM YAPILACAKLAR

### ADIM 1: Webhook'u Deploy Et

**Neden?** Invoice insert kodu eklendi ama henüz canlıya alınmadı.

**Nasıl?**

1. Terminal'i açın
2. Proje klasörüne gidin:
   ```bash
   cd /Users/fatihb./Projects/talkee
   ```
3. Webhook'u deploy edin:
   ```bash
   supabase functions deploy stripe-webhook
   ```

**Beklenen Çıktı:**

```
Deploying function stripe-webhook...
✓ Function deployed successfully!
```

**✅ Başarılı oldu mu?** → ADIM 2'ye geçin

**❌ Hata aldınız mı?** → Hata mesajını paylaşın

---

### ADIM 2: Test Payment Yap

**Neden?** Invoice'ların gerçekten oluşup oluşmadığını test etmek.

**Nasıl?**

1. **Uygulamayı açın** (Expo Go veya build)
2. **Login olun**
3. **Wallet sayfasına gidin:**
   - Tab bar'dan "Wallet" sekmesine tıklayın
   - Veya `/wallet` route'una gidin
4. **Credit package seçin:**
   - 50, 100, 250, veya 500 credit paketlerinden birini seçin
   - Varsayılan olarak 250 seçili olmalı
5. **"Purchase Credits" butonuna tıklayın**
6. **Stripe payment modal açılır**
7. **Test kartı bilgilerini girin:**
   ```
   Kart Numarası: 4242 4242 4242 4242
   Son Kullanma: 12/25 (gelecek bir tarih)
   CVC: 123
   ZIP: 12345
   ```
8. **"Pay" butonuna tıklayın**

**Beklenen Sonuç:**

- ✅ "Payment successful" toast mesajı görünür
- ✅ Wallet sayfasına yönlendirilirsiniz
- ✅ Current balance güncellenmiş olmalı

**✅ Başarılı oldu mu?** → ADIM 3'e geçin

**❌ Hata aldınız mı?** → Hata mesajını paylaşın

---

### ADIM 3: Invoice'ları Kontrol Et

**Neden?** Invoice'ların gerçekten oluşup oluşmadığını görmek.

**Nasıl?**

#### Yöntem 1: Uygulama İçinden (Önerilen)

1. **Invoices sayfasına gidin:**
   - Profile → Invoices
   - Veya direkt `/invoices` route'una gidin
2. **Kontrol edin:**
   - ✅ Yeni bir invoice görünüyor mu?
   - ✅ Invoice number: `INV-...` formatında mı?
   - ✅ Amount: Ödediğiniz miktar mı?
   - ✅ Status: `Paid` mi?
   - ✅ Date: Bugünün tarihi mi?

**✅ Invoice görünüyor mu?** → ✅ **BAŞARILI!** İşlem tamamlandı.

**❌ Invoice görünmüyor mu?** → Yöntem 2'ye geçin

---

#### Yöntem 2: Database'den Kontrol

1. **Supabase Dashboard'a gidin**
2. **SQL Editor'ı açın**
3. **Şu sorguyu çalıştırın:**
   ```sql
   SELECT
     id,
     invoice_number,
     caller_id,
     total_amount,
     status,
     metadata->>'type' as invoice_type,
     created_at
   FROM invoices
   WHERE metadata->>'type' = 'credit_purchase'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**✅ Sonuç var mı?** → Invoice oluşmuş ama sayfada görünmüyor olabilir. Log kontrolü yapın.

**❌ Sonuç yok mu?** → ADIM 4'e geçin (Webhook log kontrolü)

---

### ADIM 4: Webhook Log Kontrolü (Sorun Varsa)

**Neden?** Invoice oluşmadıysa, webhook'ta hata olabilir.

**Nasıl?**

1. **Supabase Dashboard'a gidin**
2. **Edge Functions** → **stripe-webhook** → **Logs** sekmesine tıklayın
3. **Son payment'ın loglarını bulun** (en üstte olmalı)
4. **Aranacak mesajlar:**

   **✅ Başarılı:**

   ```
   "Invoice created successfully:"
   "invoice_number": "INV-..."
   ```

   **❌ Hata:**

   ```
   "Error creating invoice:"
   "error": "..."
   ```

**✅ "Invoice created successfully" görüyor musunuz?** → Invoice oluşmuş ama sayfada görünmüyor. Cache sorunu olabilir.

**❌ "Error creating invoice" görüyor musunuz?** → Hata mesajını paylaşın, birlikte çözelim.

---

## 🎉 Başarılı Test Sonrası

Eğer invoice başarıyla görünüyorsa:

✅ **Invoice fix tamamlandı!**

**Sonraki adım:** Push notification sorununu inceleyeceğiz.

---

## 🆘 Sık Karşılaşılan Sorunlar

### Sorun 1: Invoice Görünmüyor

**Kontrol 1:** Webhook deploy edildi mi?

```bash
supabase functions deploy stripe-webhook
```

**Kontrol 2:** Payment başarılı oldu mu?

- Wallet balance güncellendi mi?
- Transaction history'de görünüyor mu?

**Kontrol 3:** Database'de var mı?

- Yöntem 2'deki SQL sorgusunu çalıştırın

**Kontrol 4:** Webhook logları

- ADIM 4'teki log kontrolünü yapın

---

### Sorun 2: Webhook 401 Hatası

**Çözüm:**

1. `supabase/config.toml` dosyasını kontrol edin:
   ```toml
   [functions.stripe-webhook]
   verify_jwt = false  # Bu satır olmalı
   ```
2. Webhook'u tekrar deploy edin:
   ```bash
   supabase functions deploy stripe-webhook
   ```

---

### Sorun 3: "Invoice created successfully" ama sayfada görünmüyor

**Çözüm:** Cache sorunu olabilir.

1. Uygulamayı kapatıp açın
2. Invoices sayfasını yenileyin
3. Veya React Query cache'ini temizleyin

---

## 📚 İlgili Dosyalar

- `supabase/functions/stripe-webhook/index.ts` - Webhook function (invoice insert kodu burada)
- `app/invoices/index.tsx` - Invoices sayfası
- `docs/INVOICE_CREDIT_PURCHASE_FIX.md` - Teknik detaylar

---

## ✅ Özet Checklist

- [ ] ADIM 1: Webhook deploy edildi
- [ ] ADIM 2: Test payment yapıldı
- [ ] ADIM 3: Invoice görünüyor
- [ ] ADIM 4: (Gerekirse) Webhook logları kontrol edildi

**Tüm adımlar ✅ ise:** Invoice fix tamamlandı! 🎉
