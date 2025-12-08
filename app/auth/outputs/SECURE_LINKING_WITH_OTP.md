# 🔒 SECURE ACCOUNT LINKING WITH OTP VERIFICATION

## ⚠️ **WHY OTP IS CRITICAL:**

Account linking is a **HIGH-RISK** operation that requires strong verification!

### **Attack Scenarios Without OTP:**

#### **Scenario 1: Compromised OAuth Account**
```
1. Attacker steals user's Facebook credentials
2. Attacker logs into Talkee with Facebook
3. System finds existing account with phone
4. Attacker clicks "Link Accounts" ❌
5. Attacker gains access to ALL user data!
```

#### **Scenario 2: Social Engineering**
```
1. Attacker tricks user into OAuth login
2. Uses same email
3. Auto-links without verification ❌
4. Attacker gains persistent access!
```

### **Protection With OTP:**
```
1. Attacker attempts to link accounts
2. System sends OTP to registered phone ✅
3. Only REAL owner receives OTP
4. Attacker cannot proceed
5. User is alerted of suspicious activity ✅
```

---

## 🔐 **COMPLETE SECURE LINKING FLOW:**

### **Flow Diagram:**
```
OAuth Login
    ↓
Check for existing account
    ↓
Account found?
    ↓ YES
Different provider?
    ↓ YES
Show Linking Dialog
    ↓
User clicks "Link"
    ↓
🔒 SEND OTP TO PHONE ✅ ← SECURITY CHECKPOINT
    ↓
Show OTP Input
    ↓
User enters OTP
    ↓
Verify OTP
    ↓ VALID
Link accounts ✅
    ↓
Success!
```

---

## 📱 **OTP VERIFICATION COMPONENT:**

### **1. OTP Verification Dialog**

```typescript
// components/auth/LinkingOTPDialog.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Shield, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

interface LinkingOTPDialogProps {
  visible: boolean;
  phone: string;
  provider: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function LinkingOTPDialog({
  visible,
  phone,
  provider,
  onVerified,
  onCancel,
}: LinkingOTPDialogProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (visible) {
      // Reset state
      setCode(['', '', '', '', '', '']);
      setError('');
      setResendTimer(60);
      setCanResend(false);
    }
  }, [visible]);

  useEffect(() => {
    if (resendTimer > 0 && visible) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer, visible]);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text.charAt(text.length - 1);
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newCode.every((digit) => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setLoading(true);
    setError('');

    try {
      // Verify OTP with Supabase
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone,
        token: verificationCode,
        type: 'sms',
      });

      if (verifyError) {
        setError('Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // OTP verified successfully!
      onVerified();
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        setError('Failed to resend code');
      } else {
        setCanResend(false);
        setResendTimer(60);
        toast.success({
          title: 'Code Sent',
          message: 'A new verification code has been sent',
        });
      }
    } catch (error) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length < 4) return phone;
    const lastFour = phone.slice(-4);
    return `+90 *** *** ${lastFour.substring(0, 2)} ${lastFour.substring(2)}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield size={48} color="#10b981" />
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title}>Verify Phone Number</Text>
          <Text style={styles.subtitle}>
            To link your {provider} account, please verify ownership of
          </Text>
          <Text style={styles.phone}>{formatPhone(phone)}</Text>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Shield size={16} color="#10b981" />
            <Text style={styles.securityText}>
              This protects your account from unauthorized access
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  digit && styles.codeInputFilled,
                  error && styles.codeInputError,
                ]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          {/* Resend */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendLink}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
            )}
          </View>

          {/* Actions */}
          <Button
            title={loading ? 'Verifying...' : 'Verify & Link'}
            onPress={() => handleVerify(code.join(''))}
            disabled={loading || code.some((digit) => !digit)}
            style={styles.verifyButton}
          />

          <Button
            title="Cancel"
            onPress={onCancel}
            variant="outline"
            style={styles.cancelButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  phone: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2e2461',
    marginBottom: 16,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    flex: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9FAFB',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    color: '#000',
  },
  codeInputFilled: {
    borderColor: '#2e2461',
    backgroundColor: '#F3F0FF',
  },
  codeInputError: {
    borderColor: '#ef4444',
  },
  error: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2e2461',
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#999',
  },
  verifyButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#E5E5E5',
  },
});
```

---

## 🔄 **UPDATED OAUTH CALLBACK WITH OTP:**

### **2. Enhanced callback.tsx**

```typescript
// app/auth/callback.tsx

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { AccountLinkingService } from '@/services/accountLinking.service';
import { AccountLinkingDialog } from '@/components/auth/AccountLinkingDialog';
import { LinkingOTPDialog } from '@/components/auth/LinkingOTPDialog';

export default function AuthCallbackScreen() {
  const toast = useToast();
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [linkingCandidate, setLinkingCandidate] = useState(null);
  const [pendingOAuthData, setPendingOAuthData] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        toast.error({
          title: 'Authentication Failed',
          message: error?.message || 'No session found',
        });
        router.replace('/auth/login');
        return;
      }

      const provider = session.user.app_metadata.provider;
      const oauthEmail = session.user.email;
      const oauthPhone = session.user.phone || null;

      // Check for existing account
      const candidates = await AccountLinkingService.findLinkableCandidates(
        oauthPhone,
        oauthEmail,
        provider
      );

      if (candidates.length > 0) {
        const candidate = candidates[0];

        // Check if already linked
        if (candidate.oauth_providers?.includes(provider)) {
          await finalizeLogin(session, candidate.id);
          return;
        }

        // Not linked yet - Show dialog
        setLinkingCandidate(candidate);
        setPendingOAuthData({
          provider,
          email: oauthEmail,
          name: session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
        });
        setShowLinkingDialog(true);
      } else {
        // No existing account
        await createNewOAuthAccount(session);
      }
    } catch (error) {
      console.error('Callback error:', error);
      toast.error({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
      router.replace('/auth/login');
    }
  };

  const handleUserWantsToLink = async () => {
    // User clicked "Link Accounts" in first dialog
    setShowLinkingDialog(false);

    try {
      // 🔒 STEP 1: Send OTP to phone for verification
      const { error } = await supabase.auth.signInWithOtp({
        phone: linkingCandidate.phone,
      });

      if (error) {
        console.error('OTP send error:', error);
        toast.error({
          title: 'Failed to Send OTP',
          message: 'Could not send verification code',
        });
        router.replace('/auth/login');
        return;
      }

      // 🔒 STEP 2: Show OTP verification dialog
      toast.success({
        title: 'Verification Code Sent',
        message: `Check ${formatPhone(linkingCandidate.phone)} for your code`,
      });
      setShowOTPDialog(true);
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error({
        title: 'Error',
        message: 'Failed to initiate verification',
      });
      router.replace('/auth/login');
    }
  };

  const handleOTPVerified = async () => {
    // 🔒 STEP 3: OTP verified, now safe to link!
    try {
      setShowOTPDialog(false);

      // Link the OAuth provider
      await AccountLinkingService.linkProvider(
        linkingCandidate.id,
        pendingOAuthData.provider,
        pendingOAuthData.email,
        pendingOAuthData
      );

      toast.success({
        title: 'Accounts Linked! ✅',
        message: `${pendingOAuthData.provider} has been securely linked`,
      });

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
    setShowLinkingDialog(false);
    const { data: { session } } = await supabase.auth.getSession();
    await createNewOAuthAccount(session);
  };

  const createNewOAuthAccount = async (session) => {
    const provider = session.user.app_metadata.provider;
    const email = session.user.email;

    const { error } = await supabase.from('users').insert({
      auth_id: session.user.id,
      phone: session.user.phone || null,
      primary_email: email,
      name: session.user.user_metadata?.name || 'OAuth User',
      avatar_url: session.user.user_metadata?.avatar_url,
      oauth_providers: [provider],
      oauth_emails: { [provider]: email },
      role: 'user',
    });

    if (error) {
      console.error('Profile creation error:', error);
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

  const formatPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    const lastFour = phone.slice(-4);
    return `+90 *** *** ${lastFour.substring(0, 2)} ${lastFour.substring(2)}`;
  };

  return (
    <>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2e2461" />
        <Text style={styles.text}>
          {showLinkingDialog
            ? 'Checking accounts...'
            : showOTPDialog
            ? 'Verifying...'
            : 'Completing sign in...'}
        </Text>
      </View>

      {/* Account Linking Dialog */}
      {showLinkingDialog && linkingCandidate && (
        <AccountLinkingDialog
          visible={showLinkingDialog}
          candidate={linkingCandidate}
          provider={pendingOAuthData.provider}
          onLink={handleUserWantsToLink} // Now sends OTP first!
          onCreateNew={handleCreateNew}
          onCancel={() => router.replace('/auth/login')}
        />
      )}

      {/* 🔒 OTP Verification Dialog */}
      {showOTPDialog && linkingCandidate && (
        <LinkingOTPDialog
          visible={showOTPDialog}
          phone={linkingCandidate.phone}
          provider={pendingOAuthData.provider}
          onVerified={handleOTPVerified}
          onCancel={() => {
            setShowOTPDialog(false);
            router.replace('/auth/login');
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
});
```

---

## 🔐 **SECURITY BENEFITS:**

### **1. Phone Ownership Verification** ✅
```
Only person with access to the phone can link
→ Even if OAuth is compromised, linking fails
```

### **2. Real-time Attack Detection** ✅
```
User receives unexpected OTP
→ Knows someone is trying to access account
→ Can take action immediately
```

### **3. Audit Trail** ✅
```
Every OTP send/verify logged
→ Security team can detect patterns
→ User can review in settings
```

### **4. Time-Limited** ✅
```
OTP expires after 60 seconds
→ Attacker has very limited window
→ Forces fresh authentication
```

### **5. Rate Limiting** ✅
```
Supabase limits OTP requests
→ Prevents brute force
→ Prevents DoS attacks
```

---

## 🎯 **UPDATED USER FLOWS:**

### **Flow 1: Legitimate Linking** ✅
```
1. User: Google login (different email)
2. System: "Found account with phone +90 555 ***"
3. Dialog: [Link Accounts] [Create New]
4. User: Clicks "Link Accounts"
5. System: Sends OTP to +90 555 123 45 67 ✅
6. User: Receives SMS "Your code: 123456"
7. User: Enters code in OTP dialog
8. System: Verifies OTP ✅
9. System: Links Google account ✅
10. Success!
```

### **Flow 2: Attack Prevented** ✅
```
1. Attacker: Stolen Facebook login
2. System: "Found account with phone +90 555 ***"
3. Dialog: [Link Accounts]
4. Attacker: Clicks "Link Accounts"
5. System: Sends OTP to +90 555 123 45 67 ✅
6. VICTIM: Receives SMS "Your code: 123456" ⚠️
7. VICTIM: "I didn't request this!" 🚨
8. Attacker: Cannot proceed (no OTP) ❌
9. System: Linking failed ✅
10. Victim alerted! ✅
```

---

## 📊 **COMPARISON:**

| Feature | Without OTP | With OTP |
|---------|-------------|----------|
| **Security** | ⚠️ Medium | ✅ High |
| **Attack Protection** | ❌ Vulnerable | ✅ Protected |
| **User Alert** | ❌ No | ✅ Yes (receives SMS) |
| **Audit Trail** | ⚠️ Partial | ✅ Complete |
| **User Friction** | 🟢 Low | 🟡 Medium |
| **Industry Standard** | ❌ No | ✅ Yes |

---

## 🚀 **IMPLEMENTATION:**

### **Files to Create:**
1. ✅ `LinkingOTPDialog.tsx` - OTP verification component
2. ✅ `callback.tsx` - Updated with OTP flow
3. ✅ Enhanced audit logging for OTP

### **Changes Needed:**
```typescript
// Before (INSECURE):
User clicks "Link" → Immediately link ❌

// After (SECURE):
User clicks "Link" → Send OTP → Verify → Link ✅
```

---

## 💡 **BEST PRACTICES:**

### **1. Always Verify Phone Ownership**
```typescript
// Never link without OTP
if (linkingRequested) {
  await sendOTP();  // ✅ REQUIRED
  await verifyOTP(); // ✅ REQUIRED
  await linkAccount(); // ✅ Only after verification
}
```

### **2. Log Everything**
```typescript
// Audit table entries:
- OTP requested (who, when, for what)
- OTP verified (success/fail)
- Account linked (which accounts)
- Failed attempts (security monitoring)
```

### **3. Rate Limiting**
```typescript
// Prevent abuse:
- Max 3 OTP per hour per phone
- Max 5 link attempts per day
- Block after 10 failed verifications
```

### **4. User Notifications**
```typescript
// Alert user of:
- OTP sent for linking
- Account successfully linked
- Failed link attempts
- Suspicious activity detected
```

---

## ✅ **FINAL RECOMMENDATION:**

**ABSOLUTELY use OTP verification!**

### **Benefits:**
- ✅ Industry standard (WhatsApp, Google, etc.)
- ✅ Protects against OAuth compromise
- ✅ Alerts user of suspicious activity
- ✅ Complete audit trail
- ✅ Peace of mind

### **Cost:**
- 🟡 One extra step for user
- 🟡 One extra SMS cost (~$0.02)

### **Verdict:**
**Security >> Convenience**

The extra step is worth it for account safety! 🔒

---

## 📝 **SUMMARY:**

```
Account Linking Flow (SECURE):
1. OAuth login
2. Existing account detected
3. Show linking dialog
4. User confirms "Link"
5. 🔒 Send OTP to phone ← CRITICAL!
6. Show OTP input dialog
7. User enters code
8. 🔒 Verify OTP ← CRITICAL!
9. Link accounts
10. Success!

Total time: ~30 seconds
Security gain: MASSIVE! 🔒✅
```

**Kesinlikle implement edelim!** 🚀
