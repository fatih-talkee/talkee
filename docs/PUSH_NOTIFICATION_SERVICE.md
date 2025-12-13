# Push Notification Service Guide

## Overview

The `pushNotificationsService` is a backend service for sending push notifications via Expo Push API. It handles:

- ✅ Sending to single user (all devices)
- ✅ Sending to multiple users (all devices)
- ✅ Batch processing (100 tokens per batch)
- ✅ Error handling and token validation
- ✅ Automatic token deactivation (DeviceNotRegistered)
- ✅ Multi-device support

---

## Installation

No additional packages needed! The service uses native `fetch` API to call Expo Push API.

---

## Usage

### Import

```typescript
import { pushNotificationsService } from './services/push-notifications.service';
```

### Send to Single User

```typescript
// Send to all active devices of a user
const result = await pushNotificationsService.sendToUser(userId, {
  title: 'New Call Request',
  body: 'You have a new call request from John Doe',
  data: {
    type: 'call_request',
    call_id: 'call-123',
    professional_id: 'prof-456',
  },
  sound: 'default',
  badge: 1,
});

console.log(`Sent: ${result.success}, Failed: ${result.failed}`);
```

### Send to Multiple Users

```typescript
// Send to all active devices of multiple users
const result = await pushNotificationsService.sendToUsers(
  [userId1, userId2, userId3],
  {
    title: 'System Update',
    body: 'New features are now available!',
    data: {
      type: 'system',
      update_version: '2.0.0',
    },
  }
);
```

### Send to Specific Tokens

```typescript
// Send to specific push tokens (useful for custom logic)
const tokens = ['ExponentPushToken[...]', 'ExponentPushToken[...]'];
const result = await pushNotificationsService.sendToTokens(tokens, {
  title: 'Custom Notification',
  body: 'This is a custom notification',
  data: { type: 'custom' },
});
```

### Test Notification

```typescript
// Send a test notification to verify token works
const success = await pushNotificationsService.sendTestNotification(
  'ExponentPushToken[...]'
);
```

---

## Payload Options

```typescript
interface PushNotificationPayload {
  title: string; // Required: Notification title
  body: string; // Required: Notification body
  data?: Record<string, any>; // Optional: Custom data
  sound?: 'default' | null; // Optional: Sound (default: 'default')
  badge?: number; // Optional: Badge count (iOS)
  priority?: 'default' | 'normal' | 'high'; // Optional: Priority
  channelId?: string; // Optional: Android channel ID
}
```

---

## Response Format

```typescript
{
  success: number;    // Number of successfully sent notifications
  failed: number;     // Number of failed notifications
  errors: string[];   // Array of error messages
}
```

---

## Common Use Cases

### 1. Call Request Notification

```typescript
await pushNotificationsService.sendToUser(professionalId, {
  title: 'New Call Request',
  body: `${userName} wants to call you`,
  data: {
    type: 'call_request',
    call_id: callId,
    user_id: userId,
    user_name: userName,
  },
  sound: 'default',
  priority: 'high',
});
```

### 2. Call Started Notification

```typescript
await pushNotificationsService.sendToUser(userId, {
  title: 'Call Started',
  body: 'Your call with Dr. Smith has started',
  data: {
    type: 'call_started',
    call_id: callId,
    professional_id: professionalId,
  },
  sound: 'default',
});
```

### 3. Payment Notification

```typescript
await pushNotificationsService.sendToUser(userId, {
  title: 'Payment Received',
  body: `You received $${amount} for your call`,
  data: {
    type: 'payment',
    amount: amount,
    call_id: callId,
  },
  sound: 'default',
  badge: unreadCount,
});
```

### 4. Review Reminder

```typescript
await pushNotificationsService.sendToUser(userId, {
  title: 'Rate Your Experience',
  body: 'How was your call with Dr. Smith?',
  data: {
    type: 'review',
    call_id: callId,
    professional_id: professionalId,
  },
  sound: 'default',
});
```

### 5. System Announcement

```typescript
// Send to all users (you'll need to get all user IDs)
const allUserIds = await getAllUserIds();
await pushNotificationsService.sendToUsers(allUserIds, {
  title: 'System Maintenance',
  body: 'The app will be unavailable from 2-4 AM',
  data: {
    type: 'system',
    maintenance_start: '2024-01-15T02:00:00Z',
    maintenance_end: '2024-01-15T04:00:00Z',
  },
});
```

---

## Error Handling

The service automatically handles:

1. **Invalid Tokens**: Filtered out before sending
2. **DeviceNotRegistered**: Token marked as inactive automatically
3. **Network Errors**: Logged and counted as failed
4. **API Errors**: Logged with full error details

### Example Error Handling

```typescript
try {
  const result = await pushNotificationsService.sendToUser(userId, {
    title: 'Test',
    body: 'Test notification',
  });

  if (result.failed > 0) {
    console.warn('Some notifications failed:', result.errors);
  }

  if (result.success === 0) {
    console.error('All notifications failed');
  }
} catch (error) {
  console.error('Error sending notifications:', error);
  // Handle critical errors
}
```

---

## Integration Examples

### With Database Triggers

```sql
-- Create a function that sends push notification when notification is created
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function or external API
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'data', NEW.data
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification();
```

### With Supabase Edge Function

Create `supabase/functions/send-push/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { pushNotificationsService } from '../../services/push-notifications.service.ts';

serve(async (req) => {
  try {
    const { user_id, title, body, data } = await req.json();

    const result = await pushNotificationsService.sendToUser(user_id, {
      title,
      body,
      data,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### With API Route (Next.js/Express)

```typescript
// pages/api/send-push.ts (Next.js)
import { pushNotificationsService } from '../../services/push-notifications.service';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, title, body, data } = req.body;

    const result = await pushNotificationsService.sendToUser(user_id, {
      title,
      body,
      data,
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## Best Practices

### 1. Batch Sending

The service automatically batches tokens (100 per batch). For large user bases, consider:

```typescript
// Get users in batches
const BATCH_SIZE = 1000;
for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
  const batch = allUserIds.slice(i, i + BATCH_SIZE);
  await pushNotificationsService.sendToUsers(batch, payload);
  // Add delay between batches to avoid rate limits
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
```

### 2. Error Logging

Always log errors for debugging:

```typescript
const result = await pushNotificationsService.sendToUser(userId, payload);

if (result.failed > 0) {
  logger.warn('Some push notifications failed', {
    userId,
    success: result.success,
    failed: result.failed,
    errors: result.errors,
  });
}
```

### 3. Rate Limiting

Expo Push API has rate limits. The service handles batching, but for very large sends:

- Add delays between batches
- Use queues (e.g., Bull, BullMQ)
- Monitor rate limit responses

### 4. Token Cleanup

The service automatically marks invalid tokens as inactive. Periodically clean up:

```typescript
// Clean up inactive tokens older than 30 days
await supabase
  .from('user_devices')
  .delete()
  .eq('is_active', false)
  .lt(
    'updated_at',
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  );
```

---

## Testing

### Test on Physical Device

1. Get your push token from the app
2. Send test notification:

```typescript
const token = 'ExponentPushToken[...]';
await pushNotificationsService.sendTestNotification(token);
```

### Test with Real User

```typescript
const userId = 'user-id-from-database';
await pushNotificationsService.sendToUser(userId, {
  title: 'Test',
  body: 'This is a test notification',
  data: { type: 'test' },
});
```

---

## Troubleshooting

### No Notifications Received

1. **Check token is saved**: Query `user_devices` table
2. **Check token is active**: `is_active = true`
3. **Check permissions**: App must have notification permissions
4. **Check device**: Push notifications only work on physical devices

### "DeviceNotRegistered" Error

- Token is invalid or expired
- App was uninstalled
- Token automatically marked as inactive

### Rate Limit Errors

- Reduce batch size
- Add delays between batches
- Use queue system for large sends

---

## API Reference

### `sendToUser(userId, payload)`

Send notification to all active devices of a user.

**Parameters:**

- `userId: string` - User ID
- `payload: PushNotificationPayload` - Notification payload

**Returns:** `Promise<{ success: number; failed: number; errors: string[] }>`

### `sendToUsers(userIds, payload)`

Send notification to all active devices of multiple users.

**Parameters:**

- `userIds: string[]` - Array of user IDs
- `payload: PushNotificationPayload` - Notification payload

**Returns:** `Promise<{ success: number; failed: number; errors: string[] }>`

### `sendToTokens(tokens, payload)`

Send notification to specific push tokens.

**Parameters:**

- `tokens: string[]` - Array of push tokens
- `payload: PushNotificationPayload` - Notification payload

**Returns:** `Promise<{ success: number; failed: number; errors: string[] }>`

### `sendTestNotification(token)`

Send a test notification to verify token works.

**Parameters:**

- `token: string` - Push token

**Returns:** `Promise<boolean>`

### `isValidToken(token)`

Validate push token format.

**Parameters:**

- `token: string` - Push token

**Returns:** `boolean`

