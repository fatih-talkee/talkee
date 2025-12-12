# Account Deletion and Restoration - Best Practices

## Overview

This document describes the account deletion and restoration system implemented in Talkee.

## Problem

When a user deletes their account and later tries to sign in again with the same OAuth provider:
1. Old account is soft-deleted (anonymized but not removed)
2. New sign-in attempt tries to create a new account
3. **Issue**: `auth_id UNIQUE` constraint prevents duplicate entries
4. **Issue**: Foreign key constraints may reference the deleted account

## Solution: Account Restoration System

### Architecture

1. **Soft Delete with `deleted_at`**: Accounts are marked as deleted but not removed
2. **Account Restoration Service**: Automatically restores accounts when users sign in again
3. **Preserve `auth_id`**: Keep the same `auth_id` so restoration is possible

### Implementation

#### 1. Database Schema

```sql
-- Add deleted_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) 
WHERE deleted_at IS NOT NULL;
```

#### 2. Delete Account Flow

When `deleteAccount()` is called:
1. Anonymize personal data (name, email, phone, avatar, bio)
2. Set `deleted_at = NOW()`
3. **Keep `auth_id`** (important for restoration)
4. Deactivate professional profile (if exists)
5. Delete auth user (optional, for GDPR compliance)

#### 3. Sign-In Flow (OAuth Callback)

When user signs in:
1. Check if account exists with this `auth_id`
2. If exists and `deleted_at IS NOT NULL` → **Restore account**
3. If exists and `deleted_at IS NULL` → Normal login
4. If doesn't exist → Create new account

### Best Practices

#### ✅ DO:
- Use `deleted_at` timestamp for soft delete
- Keep `auth_id` when soft deleting
- Automatically restore accounts on sign-in
- Preserve transactional data (calls, reviews, invoices)
- Log account restoration events

#### ❌ DON'T:
- Remove `auth_id` during soft delete
- Hard delete accounts (lose audit trail)
- Create duplicate accounts for same user
- Skip restoration check on sign-in

### Files Modified

1. **`docs/sql/add_deleted_at_to_users.sql`**: Database migration
2. **`services/supabase/accountRestoration.service.ts`**: Restoration service
3. **`services/supabase/user.service.ts`**: Updated `deleteAccount()` to set `deleted_at`
4. **`app/auth/callback.tsx`**: Added restoration logic on OAuth sign-in

### Usage

#### Manual Restoration (if needed)

```typescript
import { accountRestorationService } from '@/services/supabase/accountRestoration.service';

const restored = await accountRestorationService.restoreDeletedAccount(
  authId,
  email,
  name,
  avatarUrl
);
```

#### Check Account Status

```typescript
const status = await accountRestorationService.checkAccountExists(authId);
// Returns: { exists: boolean, isDeleted: boolean, userId?: string }
```

### Migration Steps

1. **Run SQL migration**: `docs/sql/add_deleted_at_to_users.sql`
2. **Deploy updated services**: Account restoration service is automatically used
3. **Test flow**: Delete account → Sign in again → Account should be restored

### Future Enhancements

- [ ] Add restoration confirmation dialog (optional)
- [ ] Add restoration audit log
- [ ] Support hard delete after X days
- [ ] Email notification on account restoration

