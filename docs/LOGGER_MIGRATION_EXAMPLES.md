# Logger Migration Examples

Bu dosya, mevcut `console.log` ve `console.error` kullanımlarını yeni logger sistemine nasıl migrate edeceğinizi gösterir.

## Temel Migration

### console.log → logger.info/debug

```tsx
// ❌ Eski
console.log('User logged in', userId);

// ✅ Yeni
logger.info('User logged in', { userId });
```

### console.error → logger.error

```tsx
// ❌ Eski
console.error('Error:', error);

// ✅ Yeni
logger.error('Operation failed', error, {
  operation: 'fetchUser',
  userId: user.id,
});
```

### console.warn → logger.warn

```tsx
// ❌ Eski
console.warn('Deprecated API used');

// ✅ Yeni
logger.warn('Deprecated API used', {
  endpoint: '/api/v1/users',
  suggestedEndpoint: '/api/v2/users',
});
```

## Service Dosyalarında Migration

### Örnek: profile.service.ts

```tsx
// ❌ Eski
static async getProfileData(authId: string) {
  console.log('🔍 Fetching profile for auth ID:', authId);
  // ...
  console.log('✅ User found:', user.name);
  console.log('📊 Stats loaded:', stats);
}

// ✅ Yeni
static async getProfileData(authId: string) {
  logger.breadcrumb('API', 'Fetching profile', { authId });

  try {
    // ... fetch logic
    logger.info('Profile fetched successfully', {
      userId: user.id,
      isProfessional: !!professional
    });
  } catch (error) {
    logger.error('Failed to fetch profile', error, { authId });
    throw error;
  }
}
```

### Örnek: favorites.service.ts

```tsx
// ❌ Eski
async addFavorite(professionalId: string) {
  console.log('🔍 [addFavorite] Calling RPC function with:', {
    professionalId,
    authId: authUser.id,
  });
  // ...
  console.log('✅ [addFavorite] Success:', data);
}

// ✅ Yeni
async addFavorite(professionalId: string) {
  logger.breadcrumb('User Action', 'Adding favorite', { professionalId });

  try {
    // ... RPC call
    logger.info('Favorite added', { professionalId });
    return true;
  } catch (error) {
    logger.error('Failed to add favorite', error, { professionalId });
    throw error;
  }
}
```

## Hook Dosyalarında Migration

### Örnek: useAuth.ts

```tsx
// ❌ Eski
const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    console.log('✅ Sign in successful');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    return { data: null, error };
  }
};

// ✅ Yeni
const signIn = async (email: string, password: string) => {
  logger.breadcrumb('Auth', 'Sign in attempt', { email });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    logger.userAction('sign_in', { userId: data.user?.id });
    logger.info('Sign in successful', { userId: data.user?.id });

    return { data, error: null };
  } catch (error) {
    logger.error('Sign in failed', error, { email });
    return { data: null, error };
  }
};
```

## Performance Tracking Migration

### Örnek: API Calls

```tsx
// ❌ Eski
const startTime = Date.now();
const response = await fetch('/api/users');
const duration = Date.now() - startTime;
console.log(`API call took ${duration}ms`);

// ✅ Yeni
const response = await logger.time(
  'fetchUsers',
  async () => {
    return await fetch('/api/users');
  },
  { endpoint: '/api/users' }
);
```

## Network Request Logging

### Örnek: Supabase Service

```tsx
// ❌ Eski
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

if (error) {
  console.error('Error fetching user:', error);
}

// ✅ Yeni
const startTime = Date.now();
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

const duration = Date.now() - startTime;

if (error) {
  logger.networkRequest('GET', '/users', undefined, duration, error, {
    userId,
  });
} else {
  logger.networkRequest('GET', '/users', 200, duration, undefined, { userId });
}
```

## User Action Tracking

### Örnek: Button Clicks

```tsx
// ❌ Eski
const handleSubmit = () => {
  console.log('Submit button clicked');
  // ... submit logic
};

// ✅ Yeni
const handleSubmit = () => {
  logger.userAction('button_click', {
    button: 'submit',
    screen: 'login',
  });
  // ... submit logic
};
```

## Error Context with Breadcrumbs

### Örnek: Complex Operation

```tsx
// ❌ Eski
try {
  await step1();
  await step2();
  await step3();
} catch (error) {
  console.error('Operation failed:', error);
}

// ✅ Yeni
try {
  logger.breadcrumb('Operation', 'Starting step 1');
  await step1();

  logger.breadcrumb('Operation', 'Starting step 2');
  await step2();

  logger.breadcrumb('Operation', 'Starting step 3');
  await step3();
} catch (error) {
  // Error log will include all breadcrumbs
  logger.error('Operation failed', error, {
    operation: 'multiStepProcess',
  });
}
```

## Migration Checklist

- [ ] Replace all `console.log` with `logger.info` or `logger.debug`
- [ ] Replace all `console.error` with `logger.error` (with context)
- [ ] Replace all `console.warn` with `logger.warn` (with context)
- [ ] Add breadcrumbs before important operations
- [ ] Add user action tracking for important user interactions
- [ ] Add performance tracking for slow operations
- [ ] Add network request logging for API calls
- [ ] Set user context when user logs in
- [ ] Clear user context when user logs out
- [ ] Add error context to all error logs
