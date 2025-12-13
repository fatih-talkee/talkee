# Send Push Notification Edge Function

Supabase Edge Function for sending push notifications via Expo Push API.

## Setup

1. **Deploy the function:**

```bash
supabase functions deploy send-push
```

2. **Set environment variables** (if not already set):

```bash
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage

### From Frontend/Backend

```typescript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/send-push',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: 'user-uuid',
      title: 'New Call Request',
      body: 'You have a new call request',
      data: {
        type: 'call_request',
        call_id: 'call-123',
      },
      sound: 'default',
      priority: 'high',
    }),
  }
);

const result = await response.json();
```

### From Database Trigger

```sql
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
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

## Request Body

```typescript
{
  user_id: string;        // Required: User ID
  title: string;          // Required: Notification title
  body: string;          // Required: Notification body
  data?: object;         // Optional: Custom data
  sound?: 'default' | null; // Optional: Sound
  badge?: number;        // Optional: Badge count (iOS)
  priority?: 'default' | 'normal' | 'high'; // Optional: Priority
  channelId?: string;    // Optional: Android channel ID
}
```

## Response

```typescript
{
  success: boolean;
  result: {
    success: number;    // Number of successfully sent notifications
    failed: number;     // Number of failed notifications
    errors: string[];   // Array of error messages
  };
}
```

## Error Handling

- **401**: Missing authorization header
- **400**: Missing required fields
- **500**: Server error (database error, Expo API error, etc.)

## Notes

- Automatically sends to all active devices of the user
- Handles batching (100 tokens per batch)
- Automatically marks invalid tokens as inactive
- Uses Expo Push API (which uses Firebase FCM/APNs under the hood)
