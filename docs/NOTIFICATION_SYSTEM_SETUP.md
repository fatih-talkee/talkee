# Notification System Setup Guide

## Overview

The notification system uses **Expo Push Notifications** (not Firebase FCM directly). Expo handles the complexity of FCM/APNs integration.

## Current Status

✅ **Completed:**

- Notification service implementation
- Database table structure (`notifications`)
- User devices table SQL migration
- Notification listeners setup
- App initialization integration

⚠️ **Pending:**

- Run SQL migration for `user_devices` table
- Test push notifications on physical devices
- Backend service to send push notifications

## 1. Database Setup

### Step 1: Create `user_devices` Table

Run the SQL migration:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f docs/sql/create_user_devices_table.sql
```

Or run it directly in Supabase SQL Editor.

### Step 2: Verify Table Creation

```sql
-- Check if table exists
SELECT * FROM information_schema.tables
WHERE table_schema = 'talkee' AND table_name = 'user_devices';

-- Check RLS policies
SELECT * FROM pg_policies
WHERE schemaname = 'talkee' AND tablename = 'user_devices';
```

## 2. App Configuration

### Firebase Files (Already Present)

✅ `firebase/android/google-services.json` - Android config
✅ `firebase/ios/GoogleService-Info.plist` - iOS config
✅ `app.json` - Firebase web config

### Expo Push Notifications

The app uses Expo Push Notifications which:

- Automatically handles FCM for Android
- Automatically handles APNs for iOS
- Works seamlessly with Expo

**No additional configuration needed** - Expo handles everything!

## 3. How It Works

### Initialization Flow

1. **App Starts** (`app/_layout.tsx`)

   - `notificationsService.setupListeners()` - Sets up notification handlers
   - `notificationsService.initialize()` - Requests permissions and gets push token
   - Token is saved to `user_devices` table

2. **User Receives Notification**

   - If app is in foreground: Shows in-app notification
   - If app is in background: Shows system notification
   - If app is closed: Shows system notification

3. **User Taps Notification**
   - `addNotificationResponseReceivedListener` is triggered
   - Navigation happens based on notification data:
     - `professional_id` → Navigate to professional profile
     - `action_url` → Navigate to action URL
     - `call_id` → Navigate to call screen
     - Default → Navigate to notifications screen

### Notification Data Structure

```typescript
{
  notification_id: string,
  type: 'call_request' | 'call_started' | 'call_ended' | 'review' | 'payment' | 'message' | 'system',
  professional_id?: string,
  call_id?: string,
  action_url?: string,
  // ... other custom data
}
```

## 4. Sending Push Notifications

### Option 1: Using Expo Push Notification API

```typescript
// Backend service example
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, any>
) {
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    return ticket;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
```

### Option 2: Using Supabase Edge Functions

Create a Supabase Edge Function that:

1. Gets user's push tokens from `user_devices` table
2. Sends notifications via Expo Push API
3. Creates notification record in `notifications` table

### Option 3: Using Database Triggers

Create a PostgreSQL trigger that:

1. Listens to `notifications` table INSERT
2. Gets user's push tokens
3. Calls external API to send push notification

## 5. Testing

### Test on Physical Device

Push notifications **only work on physical devices**, not simulators/emulators.

1. Build and install app on physical device:

   ```bash
   # iOS
   npx expo run:ios --device

   # Android
   npx expo run:android --device
   ```

2. Grant notification permissions when prompted

3. Check if token is saved:

   ```sql
   SELECT * FROM talkee.user_devices
   WHERE user_id = 'your-user-id';
   ```

4. Send test notification using Expo Push Tool:
   - Go to: https://expo.dev/notifications
   - Enter your push token
   - Send test notification

### Test Notification Tap Navigation

1. Send a notification with test data:

   ```json
   {
     "professional_id": "some-professional-id",
     "type": "call_request"
   }
   ```

2. Tap the notification
3. Verify app navigates to correct screen

## 6. Troubleshooting

### Token Not Saved

- Check RLS policies on `user_devices` table
- Check user authentication
- Check network connectivity
- Check logs: `logger.error` will show errors

### Notifications Not Received

- Verify permissions are granted
- Check if device is physical (not simulator)
- Verify push token exists in database
- Check Expo Push API status
- Verify notification payload format

### Navigation Not Working

- Check deep link configuration in `app.json`
- Verify notification data structure
- Check logs for navigation errors

## 7. Production Considerations

### Security

- ✅ RLS policies enabled on `user_devices` table
- ✅ Users can only access their own devices
- ✅ Push tokens are encrypted in transit

### Performance

- Token updates are batched (upsert with conflict resolution)
- Notifications are paginated (limit/offset)
- Real-time subscriptions use Supabase channels

### Monitoring

- Use Sentry for error tracking (already integrated)
- Log all notification events
- Monitor push token registration success rate

## 8. Next Steps

1. ✅ Run SQL migration for `user_devices` table
2. ⏳ Test on physical device
3. ⏳ Create backend service to send push notifications
4. ⏳ Implement notification preferences/settings
5. ⏳ Add notification badges to app icon
6. ⏳ Implement notification grouping

## 9. Files Modified

- ✅ `app/_layout.tsx` - Added notification initialization
- ✅ `services/notifications.service.ts` - Improved token saving and navigation
- ✅ `docs/sql/create_user_devices_table.sql` - Created migration
- ✅ `docs/NOTIFICATION_SYSTEM_SETUP.md` - This guide

## 10. Resources

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

