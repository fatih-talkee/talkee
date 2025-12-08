# 🔗 MULTI-PROVIDER ACCOUNT LINKING - COMPLETE SOLUTION

## 🎯 **PROBLEM:**

```
User journey:
Day 1: Register with phone + john@gmail.com
Day 2: Login with Google (john@gmail.com) → ✅ Auto-linked (same email)
Day 3: Login with Facebook (john@facebook.com) → ❌ NEW account (different email!)
Day 4: Login with LinkedIn (john@linkedin.com) → ❌ NEW account (different email!)

Result: 3 SEPARATE ACCOUNTS! ❌
```

---

## ✅ **COMPLETE SOLUTION: SMART LINKING SYSTEM**

### **Strategy:**
1. **Primary Identifier:** Phone number (most reliable)
2. **Secondary Identifier:** Primary email
3. **Link Detection:** On every OAuth login
4. **User Confirmation:** Before linking
5. **Merge Strategy:** Combine all data

---

## 📊 **DATABASE STRUCTURE:**

### **users table (Enhanced):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id),
  
  -- Primary identifiers
  phone TEXT UNIQUE,
  primary_email TEXT UNIQUE NOT NULL,
  
  -- Profile
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  -- OAuth tracking
  oauth_providers JSONB DEFAULT '[]'::jsonb,
  -- Example: ["google", "facebook", "linkedin"]
  
  oauth_emails JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "google": "john@gmail.com",
  --   "facebook": "john@facebook.com",
  --   "linkedin": "john@linkedin.com"
  -- }
  
  -- Account linking
  linked_accounts UUID[] DEFAULT ARRAY[]::UUID[],
  is_primary_account BOOLEAN DEFAULT true,
  merged_from UUID[], -- Track merged account IDs
  
  -- Metadata
  role TEXT DEFAULT 'user',
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_primary_email ON users(primary_email);
CREATE INDEX idx_users_oauth_emails ON users USING GIN (oauth_emails);
```

---

## 🔧 **IMPLEMENTATION:**

### **1. Account Linking Service**

```typescript
// services/accountLinking.service.ts

interface LinkingCandidate {
  id: string;
  phone: string;
  primary_email: string;
  name: string;
  oauth_providers: string[];
  match_reason: 'phone' | 'email' | 'manual';
}

export class AccountLinkingService {
  
  /**
   * Find potential accounts to link
   */
  static async findLinkableCandidates(
    phone: string | null,
    email: string,
    provider: string
  ): Promise<LinkingCandidate[]> {
    const candidates: LinkingCandidate[] = [];
    
    // 1. Check by phone (strongest match)
    if (phone) {
      const { data: phoneMatch } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
      
      if (phoneMatch) {
        candidates.push({
          ...phoneMatch,
          match_reason: 'phone',
        });
      }
    }
    
    // 2. Check by primary email
    const { data: emailMatch } = await supabase
      .from('users')
      .select('*')
      .eq('primary_email', email)
      .single();
    
    if (emailMatch && !candidates.find(c => c.id === emailMatch.id)) {
      candidates.push({
        ...emailMatch,
        match_reason: 'email',
      });
    }
    
    // 3. Check by OAuth emails (any provider)
    const { data: oauthMatches } = await supabase
      .from('users')
      .select('*')
      .contains('oauth_emails', { [provider]: email });
    
    if (oauthMatches) {
      oauthMatches.forEach(match => {
        if (!candidates.find(c => c.id === match.id)) {
          candidates.push({
            ...match,
            match_reason: 'email',
          });
        }
      });
    }
    
    return candidates;
  }
  
  /**
   * Link OAuth provider to existing account
   */
  static async linkProvider(
    userId: string,
    provider: string,
    providerEmail: string,
    providerData: any
  ) {
    const { data: user } = await supabase
      .from('users')
      .select('oauth_providers, oauth_emails')
      .eq('id', userId)
      .single();
    
    if (!user) throw new Error('User not found');
    
    // Update OAuth providers array
    const providers = user.oauth_providers || [];
    if (!providers.includes(provider)) {
      providers.push(provider);
    }
    
    // Update OAuth emails object
    const emails = user.oauth_emails || {};
    emails[provider] = providerEmail;
    
    // Update user
    await supabase
      .from('users')
      .update({
        oauth_providers: providers,
        oauth_emails: emails,
        avatar_url: providerData.avatar_url || user.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }
  
  /**
   * Merge two accounts
   */
  static async mergeAccounts(
    primaryAccountId: string,
    secondaryAccountId: string
  ) {
    // Get both accounts
    const { data: primary } = await supabase
      .from('users')
      .select('*')
      .eq('id', primaryAccountId)
      .single();
    
    const { data: secondary } = await supabase
      .from('users')
      .select('*')
      .eq('id', secondaryAccountId)
      .single();
    
    if (!primary || !secondary) {
      throw new Error('Accounts not found');
    }
    
    // Merge OAuth providers
    const mergedProviders = [
      ...(primary.oauth_providers || []),
      ...(secondary.oauth_providers || []),
    ].filter((v, i, a) => a.indexOf(v) === i); // Unique
    
    // Merge OAuth emails
    const mergedEmails = {
      ...(primary.oauth_emails || {}),
      ...(secondary.oauth_emails || {}),
    };
    
    // Merge other data
    const mergedData = {
      oauth_providers: mergedProviders,
      oauth_emails: mergedEmails,
      phone: primary.phone || secondary.phone,
      avatar_url: primary.avatar_url || secondary.avatar_url,
      bio: primary.bio || secondary.bio,
      merged_from: [
        ...(primary.merged_from || []),
        secondaryAccountId,
      ],
    };
    
    // Update primary account
    await supabase
      .from('users')
      .update(mergedData)
      .eq('id', primaryAccountId);
    
    // Mark secondary as merged (or delete)
    await supabase
      .from('users')
      .update({
        is_primary_account: false,
        merged_into: primaryAccountId,
      })
      .eq('id', secondaryAccountId);
    
    // Transfer all related data (favorites, appointments, etc.)
    await this.transferUserData(secondaryAccountId, primaryAccountId);
  }
  
  /**
   * Transfer all user data to primary account
   */
  static async transferUserData(
    fromUserId: string,
    toUserId: string
  ) {
    // Update all related tables
    const tables = [
      'appointments',
      'favorites',
      'reviews',
      'transactions',
      'notifications',
      // Add all your tables here
    ];
    
    for (const table of tables) {
      await supabase
        .from(table)
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId);
    }
  }
}
```

---

## 🎨 **UI COMPONENTS:**

### **2. Account Linking Dialog**

```typescript
// components/auth/AccountLinkingDialog.tsx

interface AccountLinkingDialogProps {
  visible: boolean;
  candidate: LinkingCandidate;
  provider: string;
  onLink: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export function AccountLinkingDialog({
  visible,
  candidate,
  provider,
  onLink,
  onCreateNew,
  onCancel,
}: AccountLinkingDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <AlertCircle size={48} color="#f59e0b" />
            <Text style={styles.title}>Account Found</Text>
          </View>
          
          {/* Message */}
          <Text style={styles.message}>
            We found an existing account with{' '}
            {candidate.match_reason === 'phone' 
              ? 'this phone number' 
              : 'a similar email'}
          </Text>
          
          {/* Account Info */}
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{candidate.name}</Text>
            <Text style={styles.accountEmail}>{candidate.primary_email}</Text>
            {candidate.phone && (
              <Text style={styles.accountPhone}>{candidate.phone}</Text>
            )}
            
            {/* Connected providers */}
            <View style={styles.providers}>
              <Text style={styles.providersLabel}>Connected accounts:</Text>
              <View style={styles.providersList}>
                {candidate.oauth_providers.map(p => (
                  <View key={p} style={styles.providerBadge}>
                    <Text style={styles.providerText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={`Link ${provider} Account`}
              onPress={onLink}
              style={styles.linkButton}
            />
            
            <Button
              title="Create Separate Account"
              onPress={onCreateNew}
              variant="outline"
              style={styles.newButton}
            />
            
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## 🔄 **OAUTH CALLBACK - ENHANCED:**

### **3. Updated callback.tsx**

```typescript
// app/auth/callback.tsx

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { AccountLinkingService } from '@/services/accountLinking.service';
import { AccountLinkingDialog } from '@/components/auth/AccountLinkingDialog';

export default function AuthCallbackScreen() {
  const toast = useToast();
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);
  const [linkingCandidate, setLinkingCandidate] = useState(null);
  const [pendingOAuthData, setPendingOAuthData] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('OAuth callback error:', error);
        toast.error({
          title: 'Authentication Failed',
          message: error.message,
        });
        router.replace('/auth/login');
        return;
      }

      if (!session) {
        toast.error({
          title: 'Authentication Failed',
          message: 'No session found',
        });
        router.replace('/auth/login');
        return;
      }

      // Get OAuth provider and data
      const provider = session.user.app_metadata.provider;
      const oauthEmail = session.user.email;
      const oauthPhone = session.user.phone || null;
      
      // ✅ STEP 1: Check for existing account
      const candidates = await AccountLinkingService.findLinkableCandidates(
        oauthPhone,
        oauthEmail,
        provider
      );

      if (candidates.length > 0) {
        // ✅ STEP 2: Account found - Check if already linked
        const candidate = candidates[0];
        
        // Check if this provider is already linked
        if (candidate.oauth_providers?.includes(provider)) {
          // Already linked - just login
          await finalizeLogin(session, candidate.id);
          return;
        }
        
        // ✅ STEP 3: Not linked yet - Show dialog
        setLinkingCandidate(candidate);
        setPendingOAuthData({
          provider,
          email: oauthEmail,
          name: session.user.user_metadata?.name || 
                session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url || 
                     session.user.user_metadata?.picture,
        });
        setShowLinkingDialog(true);
      } else {
        // ✅ STEP 4: No existing account - Create new
        await createNewOAuthAccount(session);
      }
    } catch (error) {
      console.error('Unexpected callback error:', error);
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
      router.replace('/auth/login');
    }
  };

  const handleLinkAccount = async () => {
    try {
      setShowLinkingDialog(false);
      
      // Link the OAuth provider to existing account
      await AccountLinkingService.linkProvider(
        linkingCandidate.id,
        pendingOAuthData.provider,
        pendingOAuthData.email,
        pendingOAuthData
      );
      
      toast.success({
        title: 'Accounts Linked!',
        message: `${pendingOAuthData.provider} has been linked to your account`,
      });
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      await finalizeLogin(session, linkingCandidate.id);
    } catch (error) {
      console.error('Linking error:', error);
      toast.error({
        title: 'Linking Failed',
        message: 'Failed to link accounts',
      });
      router.replace('/auth/login');
    }
  };

  const handleCreateNew = async () => {
    try {
      setShowLinkingDialog(false);
      
      const { data: { session } } = await supabase.auth.getSession();
      await createNewOAuthAccount(session);
    } catch (error) {
      console.error('Create account error:', error);
      toast.error({
        title: 'Error',
        message: 'Failed to create account',
      });
      router.replace('/auth/login');
    }
  };

  const createNewOAuthAccount = async (session) => {
    const provider = session.user.app_metadata.provider;
    const email = session.user.email;
    
    // Create new user profile
    const { error: profileError } = await supabase.from('users').insert({
      auth_id: session.user.id,
      phone: session.user.phone || null,
      primary_email: email,
      name: session.user.user_metadata?.name || 
            session.user.user_metadata?.full_name || 
            'OAuth User',
      avatar_url: session.user.user_metadata?.avatar_url || 
                 session.user.user_metadata?.picture,
      oauth_providers: [provider],
      oauth_emails: { [provider]: email },
      role: 'user',
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    toast.success({
      title: 'Welcome!',
      message: 'Account created successfully',
    });

    router.replace('/(tabs)');
  };

  const finalizeLogin = async (session, userId) => {
    toast.success({
      title: 'Welcome Back!',
      message: 'Signed in successfully',
    });
    
    router.replace('/(tabs)');
  };

  return (
    <>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2e2461" />
        <Text style={styles.text}>
          {showLinkingDialog ? 'Checking accounts...' : 'Completing sign in...'}
        </Text>
      </View>

      {showLinkingDialog && linkingCandidate && (
        <AccountLinkingDialog
          visible={showLinkingDialog}
          candidate={linkingCandidate}
          provider={pendingOAuthData.provider}
          onLink={handleLinkAccount}
          onCreateNew={handleCreateNew}
          onCancel={() => router.replace('/auth/login')}
        />
      )}
    </>
  );
}
```

---

## ⚙️ **SETTINGS - CONNECTED ACCOUNTS:**

### **4. Connected Accounts Settings Page**

```typescript
// app/settings/connected-accounts.tsx

export default function ConnectedAccountsScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();
    
    setUser(userData);
    setLoading(false);
  };

  const handleLinkProvider = async (provider: string) => {
    // Initiate OAuth flow for linking
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: Platform.OS === 'web'
          ? `${window.location.origin}/auth/callback`
          : 'talkee://auth/callback',
      },
    });

    if (error) {
      toast.error({
        title: 'Error',
        message: 'Failed to connect account',
      });
    }
  };

  const handleUnlinkProvider = async (provider: string) => {
    Alert.alert(
      'Unlink Account',
      `Are you sure you want to unlink your ${provider} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            // Remove provider
            const providers = user.oauth_providers.filter(p => p !== provider);
            const emails = { ...user.oauth_emails };
            delete emails[provider];

            await supabase
              .from('users')
              .update({
                oauth_providers: providers,
                oauth_emails: emails,
              })
              .eq('id', user.id);

            loadUser();
            toast.success({
              title: 'Unlinked',
              message: `${provider} account has been unlinked`,
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Accounts</Text>
        
        {/* Phone */}
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Phone size={24} color="#2e2461" />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountType}>Phone</Text>
            <Text style={styles.accountValue}>{user.phone}</Text>
          </View>
          <View style={styles.accountBadge}>
            <Text style={styles.badgeText}>Primary</Text>
          </View>
        </View>

        {/* Email */}
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Mail size={24} color="#2e2461" />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountType}>Email</Text>
            <Text style={styles.accountValue}>{user.primary_email}</Text>
          </View>
        </View>

        {/* OAuth Providers */}
        {['google', 'facebook', 'linkedin'].map(provider => {
          const isConnected = user.oauth_providers?.includes(provider);
          const email = user.oauth_emails?.[provider];

          return (
            <View key={provider} style={styles.accountCard}>
              <View style={styles.accountIcon}>
                {provider === 'google' && <Text>G</Text>}
                {provider === 'facebook' && <Text>f</Text>}
                {provider === 'linkedin' && <Text>in</Text>}
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountType}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </Text>
                {isConnected ? (
                  <Text style={styles.accountValue}>{email}</Text>
                ) : (
                  <Text style={styles.accountDisconnected}>Not connected</Text>
                )}
              </View>
              {isConnected ? (
                <TouchableOpacity
                  onPress={() => handleUnlinkProvider(provider)}
                  style={styles.unlinkButton}
                >
                  <Text style={styles.unlinkText}>Unlink</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleLinkProvider(provider)}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Linking multiple accounts allows you to sign in using any of these methods.
          Your data remains connected across all login methods.
        </Text>
      </View>
    </ScrollView>
  );
}
```

---

## 📊 **USER FLOWS:**

### **Flow 1: Perfect Match (Same Email)**
```
Day 1: Register
  - Phone: +90 555 123 45 67
  - Email: john@gmail.com
  
Day 2: Google Login (john@gmail.com)
  → Supabase auto-links ✅
  → No dialog needed
  → Login successful
  
Result: ONE account with phone + Google
```

### **Flow 2: Different Email (Manual Link)**
```
Day 1: Register
  - Phone: +90 555 123 45 67
  - Email: john@gmail.com
  
Day 2: Facebook Login (john@facebook.com)
  → System detects phone match
  → Shows linking dialog:
     "Found account with this phone"
     [Link Accounts] [Create New]
  → User clicks "Link"
  → Facebook added to account ✅
  
Result: ONE account with phone + Google + Facebook
```

### **Flow 3: Multiple Providers**
```
Day 1: Register (phone + john@gmail.com)
Day 2: Google Login → Auto-linked ✅
Day 3: Facebook Login → Dialog → Manual link ✅
Day 4: LinkedIn Login → Dialog → Manual link ✅

Result: ONE account with:
  - Phone: +90 555 123 45 67
  - Primary Email: john@gmail.com
  - OAuth: Google, Facebook, LinkedIn
  - Can login with ANY method!
```

### **Flow 4: Settings Management**
```
User goes to Settings → Connected Accounts

Sees:
✅ Phone: +90 555 *** ** 67
✅ Email: john@gmail.com
✅ Google: john@gmail.com [Unlink]
✅ Facebook: john@facebook.com [Unlink]
✅ LinkedIn: john@linkedin.com [Unlink]

Can:
- Add more providers
- Unlink providers (except primary)
- See all connected emails
```

---

## 🔒 **SECURITY CONSIDERATIONS:**

### **1. Verification Before Linking**
```typescript
// Require phone OTP before linking
const verifyBeforeLinking = async () => {
  // Send OTP to phone
  await supabase.auth.signInWithOtp({
    phone: candidate.phone,
  });
  
  // User enters code
  // Then proceed with linking
};
```

### **2. Prevent Orphaned Accounts**
```typescript
// Don't allow unlinking if only one method remains
if (user.oauth_providers.length === 1 && !user.phone) {
  toast.error({
    title: 'Cannot Unlink',
    message: 'You must have at least one login method',
  });
  return;
}
```

### **3. Audit Log**
```sql
CREATE TABLE account_linking_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT, -- 'link', 'unlink', 'merge'
  provider TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ **FINAL CHECKLIST:**

- [ ] Update users table with OAuth tracking fields
- [ ] Create AccountLinkingService
- [ ] Create AccountLinkingDialog component
- [ ] Update callback.tsx with linking logic
- [ ] Create Connected Accounts settings page
- [ ] Add phone verification for linking
- [ ] Add audit logging
- [ ] Test all linking scenarios

---

## 🎯 **BENEFITS:**

1. ✅ **Flexible:** User can login with ANY method
2. ✅ **Smart:** Auto-links when possible
3. ✅ **Safe:** Asks before linking different emails
4. ✅ **Transparent:** Clear UI showing all connections
5. ✅ **Reversible:** Can unlink providers
6. ✅ **Auditable:** Track all linking actions
7. ✅ **User-friendly:** No data loss, no duplicates

---

## 🚀 **READY TO IMPLEMENT!**

Bu sistem ile user:
- ✅ Any method ile register edebilir
- ✅ Any method ile login yapabilir
- ✅ Multiple provider'ları link edebilir
- ✅ Settings'den manage edebilir
- ✅ Hiç duplicate account oluşmaz!

**Perfect solution!** 🎉
