# Logging Guide - Production-Ready Logger System

## Overview

The logger system provides centralized, structured logging with production-ready features:

- ✅ **Structured JSON logging** - All logs include context, timestamps, and metadata
- ✅ **Environment-based levels** - Different log levels for dev vs production
- ✅ **Remote logging support** - Ready for Sentry, Bugsnag, etc.
- ✅ **Breadcrumb tracking** - Automatic error context collection
- ✅ **Performance monitoring** - Built-in performance tracking
- ✅ **Sensitive data filtering** - Automatically filters passwords, tokens, etc.
- ✅ **Async batching** - Efficient log batching for production
- ✅ **User action tracking** - Track user interactions

## Basic Usage

```tsx
import { logger } from '@/lib/logger';

// Basic logging
logger.debug('Debug message', { userId: '123' });
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.warn('Deprecated API used', { endpoint: '/api/v1/users' });
logger.error('Failed to fetch data', error, { endpoint: '/api/users' });
```

## Log Levels

The logger supports 4 log levels:

- **debug** - Development-only detailed logs
- **info** - General information (user actions, API calls, etc.)
- **warn** - Warnings (deprecated APIs, fallbacks, etc.)
- **error** - Errors (exceptions, failures, etc.)

### Default Behavior

- **Development**: All levels (debug, info, warn, error)
- **Production**: Only errors and warnings

### Customize Log Level

```tsx
// Set minimum log level
logger.setLevel('warn'); // Only warn and error will be logged
```

## Error Logging

Always log errors with context:

```tsx
try {
  await fetchUserData();
} catch (error) {
  logger.error('Failed to fetch user data', error, {
    userId: user.id,
    endpoint: '/api/users',
    method: 'GET',
  });
}
```

## Breadcrumbs (Error Context)

Breadcrumbs help track what happened before an error:

```tsx
// Track navigation
logger.breadcrumb('Navigation', 'User navigated to profile', {
  from: 'home',
  to: 'profile',
});

// Track API calls
logger.breadcrumb('API', 'Fetching user data', {
  endpoint: '/api/users',
  method: 'GET',
});

// Track user actions
logger.breadcrumb('User Action', 'Button clicked', {
  button: 'submit',
  screen: 'login',
});

// When an error occurs, all breadcrumbs are included in the log
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', error); // Includes all breadcrumbs
}
```

## Performance Tracking

Track function execution time:

```tsx
// Async function
const result = await logger.time(
  'fetchUserData',
  async () => {
    return await fetchUserData();
  },
  { userId: '123' }
);

// Sync function
const result = logger.timeSync(
  'processData',
  () => {
    return processData();
  },
  { dataSize: 1000 }
);

// Manual performance logging
logger.performance('API call', 150, {
  endpoint: '/api/users',
  statusCode: 200,
});
```

## User Action Tracking

Track user interactions for analytics:

```tsx
logger.userAction('button_click', {
  button: 'submit',
  screen: 'login',
  timestamp: Date.now(),
});

logger.userAction('screen_view', {
  screen: 'profile',
  userId: user.id,
});
```

## Network Request Logging

Log network requests with automatic error detection:

```tsx
const startTime = Date.now();
try {
  const response = await fetch('/api/users');
  const duration = Date.now() - startTime;

  logger.networkRequest(
    'GET',
    '/api/users',
    response.status,
    duration,
    undefined,
    { userId: user.id }
  );
} catch (error) {
  const duration = Date.now() - startTime;

  logger.networkRequest('GET', '/api/users', undefined, duration, error, {
    userId: user.id,
  });
}
```

## User Context

Set user context for all subsequent logs:

```tsx
// Set user when logged in
logger.setUser(user.id, {
  email: user.email,
  name: user.name,
});

// Clear user when logged out
logger.setUser(null);
```

## Additional Context

Set additional context that will be included in all logs:

```tsx
logger.setContext('app', {
  version: '1.0.0',
  build: '123',
});

logger.setContext('device', {
  platform: Platform.OS,
  version: Platform.Version,
});
```

## Remote Logging (Sentry Integration)

### 1. Install Sentry

```bash
npm install @sentry/react-native
```

### 2. Initialize Sentry

```tsx
// app/_layout.tsx
import * as Sentry from '@sentry/react-native';
import { logger } from '@/lib/logger';
import { SentryAdapter } from '@/lib/logger/adapters/sentry.adapter';

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enableAutoSessionTracking: true,
  tracesSampleRate: 1.0, // Adjust based on your needs
});

// Register Sentry adapter
logger.registerRemoteLogger(new SentryAdapter(Sentry));
```

### 3. Configure Logger for Production

```tsx
// app/_layout.tsx
import { logger } from '@/lib/logger';

export default function RootLayout() {
  useEffect(() => {
    // Configure logger for production
    logger.configure({
      enableRemoteLogging: !__DEV__,
      logLevel: __DEV__ ? 'debug' : 'error',
      enableBreadcrumbs: true,
      enablePerformanceTracking: true,
    });
  }, []);

  // ... rest of component
}
```

## Configuration

Configure logger behavior:

```tsx
logger.configure({
  enabled: true,
  logLevel: 'info',
  enableRemoteLogging: true,
  enableBreadcrumbs: true,
  enablePerformanceTracking: true,
  maxBreadcrumbs: 50,
  batchSize: 10,
  batchInterval: 5000,
  sensitiveKeys: ['password', 'token', 'secret'], // Add custom sensitive keys
});
```

## Sensitive Data Filtering

The logger automatically filters sensitive data:

- `password`
- `token`
- `secret`
- `apiKey`
- `authToken`
- `accessToken`
- `refreshToken`
- `authorization`
- `creditCard`
- `ssn`
- `socialSecurityNumber`

Add custom sensitive keys:

```tsx
logger.configure({
  sensitiveKeys: [
    ...logger.config.sensitiveKeys,
    'customSecretKey',
    'apiSecret',
  ],
});
```

## Migration from console.log

Replace all `console.log` with logger:

```tsx
// ❌ Before
console.log('User logged in', userId);
console.error('Error:', error);

// ✅ After
logger.info('User logged in', { userId });
logger.error('Error occurred', error);
```

## Best Practices

### 1. Always Include Context

```tsx
// ❌ Bad
logger.error('Failed to fetch data');

// ✅ Good
logger.error('Failed to fetch data', error, {
  endpoint: '/api/users',
  method: 'GET',
  userId: user.id,
});
```

### 2. Use Appropriate Log Levels

```tsx
// Debug - Development only
logger.debug('Processing data', { dataSize: 1000 });

// Info - General information
logger.info('User logged in', { userId: '123' });

// Warn - Warnings
logger.warn('Deprecated API used', { endpoint: '/api/v1/users' });

// Error - Errors
logger.error('API call failed', error, { endpoint: '/api/users' });
```

### 3. Track User Actions

```tsx
// Track important user actions
logger.userAction('profile_updated', {
  userId: user.id,
  fields: ['name', 'email'],
});
```

### 4. Use Breadcrumbs for Error Context

```tsx
// Before operations that might fail
logger.breadcrumb('API', 'Starting user fetch', { userId: '123' });

try {
  await fetchUser();
} catch (error) {
  // Error log will include the breadcrumb
  logger.error('Failed to fetch user', error);
}
```

### 5. Performance Tracking

```tsx
// Track slow operations
const result = await logger.time(
  'database_query',
  async () => {
    return await db.query('SELECT * FROM users');
  },
  { table: 'users' }
);
```

## Cleanup

Cleanup logger on app unmount:

```tsx
useEffect(() => {
  return () => {
    logger.cleanup();
  };
}, []);
```

## Testing

Disable logging in tests:

```tsx
// In test setup
logger.disable();

// Or set specific log level
logger.setLevel('error');
```

## Environment Variables

Recommended environment variables:

```env
# Sentry DSN (optional)
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Log level override (optional)
EXPO_PUBLIC_LOG_LEVEL=error
```

## Example: Complete Integration

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/lib/logger';
import { SentryAdapter } from '@/lib/logger/adapters/sentry.adapter';
import { setupGlobalErrorHandlers } from '@/lib/globalErrorHandler';

export default function RootLayout() {
  useEffect(() => {
    // Initialize Sentry (if DSN provided)
    if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: __DEV__ ? 'development' : 'production',
      });
      logger.registerRemoteLogger(new SentryAdapter(Sentry));
    }

    // Configure logger
    logger.configure({
      enableRemoteLogging: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
      logLevel: __DEV__ ? 'debug' : 'error',
    });

    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Cleanup on unmount
    return () => {
      logger.cleanup();
    };
  }, []);

  // ... rest of component
}
```

## Troubleshooting

### Logs not appearing in production

- Check `enableRemoteLogging` is `true` in production
- Verify Sentry DSN is configured
- Check log level is appropriate

### Too many logs

- Increase `logLevel` to 'warn' or 'error'
- Reduce `maxBreadcrumbs`
- Disable `enablePerformanceTracking` if not needed

### Missing error context

- Ensure breadcrumbs are added before errors
- Check `enableBreadcrumbs` is `true`
- Verify breadcrumbs are not cleared before error
