# Twilio Voice Integration (React Native / Expo)

This document explains how we integrate Twilio Programmable Voice into the app, what is already configured, and what remains.

---

## What we’ve done so far

- Native app config (app.json)
  - iOS: NSMicrophoneUsageDescription, NSCameraUsageDescription, UIBackgroundModes [audio, voip], AVAudioSessionCategory: PlayAndRecord
  - Android: permissions RECORD_AUDIO, CAMERA, BLUETOOTH/BLUETOOTH_CONNECT, WAKE_LOCK, FOREGROUND_SERVICE
  - Added expo-build-properties plugin (ready for EAS builds / native props)
- Headers safe areas fixed (PrimaryHeader/DetailHeader) to avoid Android status bar overlap

---

## Prerequisites

- Expo + EAS Build (prebuild or config plugins required for native changes)
- Twilio account (Programmable Voice) and the ability to provision Access Tokens from your backend
- FCM (Android) and APNs VoIP (iOS) configured for incoming call push notifications

---

## Install SDK

```bash
cd "/Users/fatihb./Projects/Talkee"
npm i @twilio/voice-react-native-sdk
# If managed Expo → produce native code
npx expo prebuild   # or build directly with EAS
```

---

## Backend: Access Token endpoint (Required)

Do NOT mint tokens on device. Your backend should expose an endpoint that returns a short‑lived Twilio Access Token for the authenticated user. That token must include a Voice grant.

Pseudo-flow:

- Mobile fetches: GET /twilio/voice-token
- Server uses Twilio credentials to mint a token and returns it as text/JSON
- Client uses that token to register/connect

Twilio docs: “Programmable Voice Access Tokens”.

---

## Client wiring (outline)

1. Register for incoming calls using the Access Token:

```ts
import { Voice } from '@twilio/voice-react-native-sdk';

const token = await fetch('<YOUR_BACKEND>/twilio/voice-token').then((r) =>
  r.text()
);
await Voice.register(token); // enables incoming calls (push + native call UI integration)
```

2. Place an outgoing call:

```ts
const call = await Voice.connect({
  accessToken: token,
  params: { To: '<callee>' },
});
// call.on('stateChanged', handler) – update UI based on ringing/connected/ended
```

3. Incoming call handling:

- iOS: receive APNs VoIP push → deliver payload to the Twilio SDK → present CallKit UI to accept/reject
- Android: receive FCM data message → deliver to Twilio SDK → present ConnectionService UI to accept/reject

Twilio’s reference app shows event wiring for accept(), reject(), disconnect(), mute(), hold(), etc.

---

## iOS specifics

- APNs VoIP push (PushKit):
  - Configure VoIP certificate or token-based auth
  - Enable Background Modes: audio, voip (done in app.json)
  - Ensure CallKit integration for native incoming call UI (CXProvider)
- Audio session: set to PlayAndRecord and manage routing (earpiece/speaker/Bluetooth)
- EAS build:

```bash
npx eas build -p ios
```

---

## Android specifics

- Push: FCM data messages for incoming call; pass payload to Twilio SDK
- ConnectionService: implement for native call screen + audio focus
- Foreground service: show ongoing call notification
- EAS build:

```bash
npx eas build -p android
```

---

## Minimal UI tasks to add

- Call screen with: dial input, call button, mute/unmute, speaker/route toggle, hangup
- Incoming call screen: accept/reject buttons, call state indicators
- Token fetch hook (retry/refresh when expired)
- Lifecycle handling (app in background/foreground)

---

## What’s left (checklist)

- Backend
  - [ ] Implement /twilio/voice-token endpoint (server‑side token minting with Voice grant)
  - [ ] TwiML/webhooks for outgoing/incoming behavior
- Push
  - [ ] iOS: APNs VoIP setup (keys/certs), PushKit handling, deliver to SDK
  - [ ] Android: FCM data messages and delivery to SDK
- Native call UI
  - [ ] iOS CallKit callbacks (answer, end, mute) wired to SDK
  - [ ] Android ConnectionService + foreground service notification
- Client UI
  - [ ] Outgoing call flow (connect, in-call controls, end)
  - [ ] Incoming call flow (show UI, accept/reject)
  - [ ] Error states, reconnection, token refresh
- Release
  - [ ] EAS production builds for iOS (AAB for TestFlight via EAS Submit) and Android

---

## Notes & references

- Twilio Voice React Native SDK: @twilio/voice-react-native-sdk
- Twilio Programmable Voice docs: iOS/Android guides (CallKit/ConnectionService, push configuration)
- Expo/EAS: ensure you use EAS for native configuration to apply (or run `expo prebuild` in dev)
