# Expo Router Folder Organization - Parantez Kullanımı

## 📋 Parantez İçindeki Klasörler `(folder)`

Expo Router'da parantez içindeki klasörler **route segment oluşturmaz**. Sadece organizasyon ve layout yönetimi için kullanılır.

### Örnekler:

#### `(auth)` Klasörü
```
app/(auth)/
├── login.tsx          → URL: /login (NOT /auth/login)
├── register.tsx       → URL: /register (NOT /auth/register)
└── _layout.tsx        → Auth sayfaları için layout
```

**Neden parantez içinde?**
- URL'de `/auth/` görünmesini istemiyoruz
- Sadece organizasyon için (tüm auth sayfaları bir arada)
- Layout yönetimi için (`_layout.tsx` ile Stack navigasyon)

#### `(tabs)` Klasörü
```
app/(tabs)/
├── index.tsx          → URL: / (NOT /tabs)
├── profile.tsx        → URL: /profile (NOT /tabs/profile)
└── _layout.tsx        → Tab navigasyon layout
```

**Neden parantez içinde?**
- URL'de `/tabs/` görünmesini istemiyoruz
- Tab navigasyon için özel layout
- Bottom tab bar yönetimi

## 📁 Normal Klasörler (Parantez Yok)

Normal klasörler **route segment oluşturur** ve URL'de görünür.

### Örnekler:

#### `call` Klasörü
```
app/call/
├── [id].tsx           → URL: /call/:id
├── donation/
│   └── [id].tsx       → URL: /call/donation/:id
└── history/
    └── index.tsx      → URL: /call/history
```

**Neden parantez yok?**
- URL'de `/call/` görünmesini **istiyoruz**
- Route segment'i oluşturması gerekiyor
- RESTful URL yapısı için

#### `settings` Klasörü
```
app/settings/
├── account.tsx        → URL: /settings/account
├── theme.tsx          → URL: /settings/theme
└── notifications.tsx  → URL: /settings/notifications
```

**Neden parantez yok?**
- URL'de `/settings/` görünmesini istiyoruz
- Route segment'i oluşturması gerekiyor

## 🎯 Karar Kriterleri

### Parantez İçinde Kullan `(folder)` Eğer:
- ✅ URL'de görünmesini **istemiyorsan**
- ✅ Sadece organizasyon için kullanıyorsan
- ✅ Layout yönetimi için kullanıyorsan
- ✅ Özel navigasyon yapısı varsa (tabs, stack)

### Normal Klasör Kullan `folder` Eğer:
- ✅ URL'de görünmesini **istiyorsan**
- ✅ Route segment'i oluşturması gerekiyorsa
- ✅ RESTful URL yapısı için

## 📊 Mevcut Proje Yapısı

### Parantez İçinde:
- `(auth)` - Auth sayfaları (URL'de görünmez)
- `(tabs)` - Tab navigasyon sayfaları (URL'de görünmez)

### Normal Klasörler:
- `call/` - Call sayfaları (URL'de `/call/` görünür)
- `settings/` - Settings sayfaları (URL'de `/settings/` görünür)
- `profile/` - Profile sayfaları (URL'de `/profile/` görünür)
- `transactions/` - Transaction sayfaları (URL'de `/transactions/` görünür)

## 🔍 Özet

| Klasör Tipi | URL'de Görünür mü? | Kullanım Amacı |
|-------------|-------------------|----------------|
| `(auth)` | ❌ Hayır | Organizasyon + Layout |
| `(tabs)` | ❌ Hayır | Tab navigasyon |
| `call/` | ✅ Evet | Route segment |
| `settings/` | ✅ Evet | Route segment |

## 💡 Best Practice

**Call klasörü için:**
- ✅ `call/` (parantez yok) - Doğru
- ❌ `(call)/` (parantez var) - Yanlış (route'lar değişir)

**Neden?**
- `/call/:id` URL'sini istiyoruz
- `/call/donation/:id` URL'sini istiyoruz
- `/call/history` URL'sini istiyoruz

Eğer `(call)` yaparsak:
- `/:id` olur (yanlış)
- `/donation/:id` olur (yanlış)
- `/history` olur (yanlış)

