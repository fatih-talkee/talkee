## Android APK (via Expo EAS)

### Prerequisites

- Node.js and npm installed
- Expo account

### One-time setup

```bash
npm i -g eas-cli
eas login
# Configure EAS for this project (links it and sets projectId)
eas build:configure
```

### Build a shareable preview APK

```bash
eas build -p android --profile preview
```

- When finished, open the build URL from the CLI output and copy the APK link/QR to share.
- If prompted for a keystore, choose to let EAS manage it.

### Notes

- App ID is `net.talkee.app` (set in `app.json`).
- `eas.json` includes a preview profile that outputs an APK.
- For Google Play, generate an AAB instead:

```bash
eas build -p android --profile production
```
