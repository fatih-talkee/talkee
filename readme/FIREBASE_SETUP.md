## Firebase Setup

### 1) Place native config files

- Android: put your `google-services.json` at `firebase/android/google-services.json`
- iOS: put your `GoogleService-Info.plist` at `firebase/ios/GoogleService-Info.plist`

`app.json` already points to these paths:

- `expo.android.googleServicesFile: ./firebase/android/google-services.json`
- `expo.ios.googleServicesFile: ./firebase/ios/GoogleService-Info.plist`

### 2) Install SDK

Already added:

```bash
npm i firebase
```

### 3) Add Web SDK config

Edit `app.json` → `expo.extra.firebase` with your Web config from Firebase console:

```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "<API_KEY>",
        "authDomain": "<PROJECT>.firebaseapp.com",
        "projectId": "<PROJECT_ID>",
        "storageBucket": "<PROJECT>.appspot.com",
        "messagingSenderId": "<SENDER_ID>",
        "appId": "<APP_ID>",
        "measurementId": "<MEASUREMENT_ID>"
      }
    }
  }
}
```

### 4) Use in code

Initialize once via `lib/firebase.ts`:

```ts
import { getFirebaseApp } from '../lib/firebase';
const app = getFirebaseApp();
```

### Notes

- Native files are used for native services (e.g., FCM). The Web config initializes the JS SDK for Auth/Firestore/Storage.
- For push notifications on Android/iOS, you’ll also configure FCM/APNs later.
