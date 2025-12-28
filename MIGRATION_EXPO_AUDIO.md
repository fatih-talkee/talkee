# Migration: expo-av → expo-audio

## Status
⚠️ **Pending**: `expo-audio` package needs to be installed first

## Steps

1. **Install expo-audio package:**
   ```bash
   npx expo install expo-audio
   ```

2. **After installation, update `services/twilioVoice.service.ts`:**
   - Replace `import { Audio } from 'expo-av'` with `import { AudioPlayer, setAudioModeAsync } from 'expo-audio'`
   - Update `ringtoneSound` type from `Audio.Sound` to `AudioPlayer`
   - Update `playRingtone()` to use `AudioPlayer` API
   - Update `stopRingtone()` to use `AudioPlayer.remove()` instead of `unloadAsync()`

## Current Implementation
- Currently using `expo-av` (deprecated but functional)
- TODO comments added in code for migration
- Deprecation warning will appear until migration is complete

## Notes
- `expo-av` will be removed in SDK 54
- Migration must be completed before upgrading to SDK 54
- Ringtone functionality will continue to work with `expo-av` until migration

