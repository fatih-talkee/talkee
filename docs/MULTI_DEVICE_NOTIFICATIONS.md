# Multi-Device Notification Support

## Overview

The notification system **fully supports multiple devices per user**. A single user can have push notification tokens registered for multiple devices (iPhone, Android phone, iPad, etc.), and notifications will be sent to all active devices.

## How It Works

### Database Structure

The `public.user_devices` table has a **unique constraint on `(user_id, push_token)`**:

```sql
UNIQUE(user_id, push_token)
```

This constraint means:

- ✅ **Same user, different tokens** → Multiple devices allowed
- ✅ **Same user, same token** → Only one entry (upsert updates existing)
- ❌ **Different users, same token** → Not allowed (but rare in practice)

### Example Scenarios

#### Scenario 1: User with iPhone and Android Phone

```
User: John (user_id: abc-123)
├── Device 1: iPhone (push_token: token-iphone-xyz)
├── Device 2: Android (push_token: token-android-abc)
└── Result: ✅ Both devices receive notifications
```

#### Scenario 2: User Reinstalls App on Same Device

```
Day 1: User installs app → Token: token-xyz-123
Day 30: User reinstalls app → New Token: token-xyz-456

System behavior:
1. Old token (token-xyz-123) marked as is_active = false
2. New token (token-xyz-456) saved with is_active = true
3. ✅ Only new token receives notifications
```

#### Scenario 3: User Logs in on Multiple Devices

```
User logs in on:
- iPhone → Token saved
- iPad → Token saved
- Android phone → Token saved

Result: ✅ All 3 devices receive notifications
```

## Implementation Details

### Device Identification

The system uses a **persistent device identifier** stored in AsyncStorage:

```typescript
// Generated once per device installation
device_id = `${Platform.OS}-${Device.modelName}-${Device.osName}-${random}`;
```

This allows the system to:

- Track the same physical device across token changes
- Deactivate old tokens when a device gets a new token
- Identify which device a token belongs to

### Token Management

1. **New Device**: Creates new entry with `is_active = true`
2. **Same Device, New Token**:
   - Marks old token(s) for that device as `is_active = false`
   - Creates/updates entry with new token
3. **Same Device, Same Token**: Updates `updated_at` timestamp

### Active Token Cleanup

The system automatically:

- Marks old tokens as inactive when device gets new token
- Provides `cleanupInactiveTokens()` method to delete tokens older than 30 days
- Only sends notifications to `is_active = true` tokens

## API Methods

### Get User's Active Device Tokens

```typescript
// Get all active push tokens for a user (for sending notifications)
const tokens = await notificationsService.getUserDeviceTokens(userId);
// Returns: ['token1', 'token2', 'token3']
```

### Get User's Devices

```typescript
// Get all devices (active and inactive) for current user
const devices = await notificationsService.getUserDevices();
// Returns: Array of device objects with metadata
```

### Remove Device Token

```typescript
// Deactivate a specific device token
await notificationsService.removeDeviceToken(deviceId);
```

### Cleanup Inactive Tokens

```typescript
// Delete inactive tokens older than 30 days
await notificationsService.cleanupInactiveTokens();
```

## Sending Notifications to Multiple Devices

When sending a push notification, you should:

1. **Get all active tokens** for the user:

   ```typescript
   const tokens = await notificationsService.getUserDeviceTokens(userId);
   ```

2. **Send to all tokens**:

   ```typescript
   for (const token of tokens) {
     await sendPushNotification(token, title, body, data);
   }
   ```

3. **Handle failures gracefully**:
   - If a token is invalid, mark it as inactive
   - Continue sending to other tokens

## Best Practices

### 1. Token Validation

When sending notifications, check if tokens are still valid:

```typescript
const tokens = await notificationsService.getUserDeviceTokens(userId);
const validTokens = await Promise.all(
  tokens.map(async (token) => {
    const isValid = await validateToken(token);
    if (!isValid) {
      // Mark as inactive
      await markTokenInactive(token);
      return null;
    }
    return token;
  })
);
```

### 2. Batch Sending

Send notifications in batches to avoid rate limits:

```typescript
const tokens = await notificationsService.getUserDeviceTokens(userId);
const batchSize = 100;

for (let i = 0; i < tokens.length; i += batchSize) {
  const batch = tokens.slice(i, i + batchSize);
  await Promise.all(
    batch.map(token => sendPushNotification(token, ...))
  );
}
```

### 3. Periodic Cleanup

Run cleanup periodically (e.g., daily cron job):

```typescript
// Clean up inactive tokens older than 30 days
await notificationsService.cleanupInactiveTokens();
```

## Database Queries

### Get Active Devices for User

```sql
SELECT * FROM public.user_devices
WHERE user_id = 'user-id'
  AND is_active = true
ORDER BY updated_at DESC;
```

### Count Devices per User

```sql
SELECT
  user_id,
  COUNT(*) as device_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM public.user_devices
GROUP BY user_id;
```

### Find Inactive Tokens to Cleanup

```sql
SELECT * FROM public.user_devices
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '30 days';
```

## Limitations

1. **Token Expiration**: Expo push tokens don't expire, but devices can be uninstalled
2. **No Automatic Cleanup**: Inactive tokens are not automatically deleted (manual cleanup needed)
3. **Device Identification**: Device ID is generated client-side and may change if app data is cleared

## Future Improvements

- [ ] Automatic token validation on send
- [ ] Automatic cleanup of inactive tokens (cron job)
- [ ] Device management UI (show/remove devices)
- [ ] Push notification delivery tracking
- [ ] Device-specific notification preferences
