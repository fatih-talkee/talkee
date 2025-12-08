# 🔧 COMPLETE FIX - DATABASE + CODE

## 🎯 **THE PROBLEM:**

Your `users` table doesn't have an `email` column, but your code is trying to insert into it!

**Line 158 in otp.tsx:**
```typescript
email: data.user.email || null, // ❌ ERROR! Column doesn't exist
```

---

## ✅ **SOLUTION: 2 STEPS**

### **STEP 1: DATABASE MIGRATION (5 min)**
### **STEP 2: UPDATE otp.tsx (2 min)**

---

## 📊 **STEP 1: RUN SIMPLE MIGRATION**

### **In Supabase SQL Editor:**

Copy and paste this SQL:

```sql
-- ✅ SIMPLE MIGRATION - ONLY ADD NEW COLUMNS

-- Add primary_email column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS primary_email TEXT;

-- Add OAuth tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_providers JSONB DEFAULT '[]'::jsonb;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_emails JSONB DEFAULT '{}'::jsonb;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS linked_accounts UUID[] DEFAULT ARRAY[]::UUID[];

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_primary_account BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS merged_from UUID[];

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS merged_into UUID;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_primary_email ON users(primary_email);
CREATE INDEX IF NOT EXISTS idx_users_oauth_emails ON users USING GIN (oauth_emails);
CREATE INDEX IF NOT EXISTS idx_users_oauth_providers ON users USING GIN (oauth_providers);

-- Update existing users
UPDATE users
SET 
  oauth_providers = COALESCE(oauth_providers, '[]'::jsonb),
  oauth_emails = COALESCE(oauth_emails, '{}'::jsonb),
  is_primary_account = COALESCE(is_primary_account, true)
WHERE oauth_providers IS NULL 
   OR oauth_emails IS NULL 
   OR is_primary_account IS NULL;

-- Create audit table
CREATE TABLE IF NOT EXISTS account_linking_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('link', 'unlink', 'merge')),
  provider TEXT,
  secondary_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON account_linking_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON account_linking_audit(created_at);

-- Enable RLS on audit table
ALTER TABLE account_linking_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can view their own audit logs" ON account_linking_audit;

CREATE POLICY "Users can view their own audit logs"
  ON account_linking_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = account_linking_audit.user_id 
        AND users.auth_id = auth.uid()
    )
  );

-- ✅ MIGRATION COMPLETE!
```

**Click:** "Run" ▶️

---

## ✅ **VERIFY MIGRATION:**

```sql
-- Quick check
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('primary_email', 'oauth_providers', 'oauth_emails')
ORDER BY column_name;
```

**Expected Result:**
```
column_name
-----------------
oauth_emails
oauth_providers
primary_email
```

✅ **If you see all 3, migration is successful!**

---

## 📝 **STEP 2: UPDATE otp.tsx**

### **Find line 158 and change:**

**❌ OLD (Line 158):**
```typescript
await supabase.from('users').insert({
  auth_id: data.user.id,
  phone: cleanPhone,
  email: data.user.email || null, // ❌ WRONG COLUMN!
  name: userName || cleanPhone,
  role: 'user',
});
```

**✅ NEW:**
```typescript
await supabase.from('users').insert({
  auth_id: data.user.id,
  phone: cleanPhone,
  primary_email: data.user.email || null, // ✅ CORRECT COLUMN!
  name: userName || cleanPhone,
  role: 'user',
});
```

**Just change:** `email:` → `primary_email:`

---

## 🎯 **QUICK FIX LOCATIONS:**

### **File: app/auth/otp.tsx**
**Line 158:** Change `email:` to `primary_email:`

That's it! Just 1 word to change!

---

## ✅ **VERIFICATION:**

After making both changes:

### **1. Test Registration:**
```
1. Register with phone + email + password
2. Receive SMS code
3. Enter code in OTP screen
4. Profile should be created ✅
```

### **2. Check Database:**
```sql
SELECT id, name, phone, primary_email, oauth_providers
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
id    | name      | phone           | primary_email      | oauth_providers
------|-----------|-----------------|--------------------|-----------------
uuid  | John Doe  | +905551234567   | john@example.com   | []
```

✅ **primary_email should have the email!**

---

## 🎉 **COMPLETE CHECKLIST:**

- [ ] Run SIMPLE_MIGRATION.sql in Supabase
- [ ] Verify `primary_email` column exists
- [ ] Change `email:` to `primary_email:` in otp.tsx (line 158)
- [ ] Test registration flow
- [ ] Verify profile creation

**Total Time: 7 minutes**

---

## 🚨 **WHY THIS ERROR HAPPENED:**

1. Your `users` table was created WITHOUT an `email` column
2. The migration tried to RENAME a non-existent column
3. Your code (otp.tsx) was trying to INSERT into non-existent column

**Solution:** 
- Add `primary_email` as NEW column (not rename)
- Update code to use `primary_email`

---

## 📁 **FILES NEEDED:**

1. **SIMPLE_MIGRATION.sql** - Database changes
2. **otp.tsx** - Code change (1 word!)

---

**Ready to fix! This will work! 🚀**
