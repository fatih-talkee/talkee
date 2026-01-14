# Notifications Service - Refactor Plan

## 📊 Current State Analysis

### Metrics

- **Total Lines:** 3,473
- **Class Methods:** 38
- **Logger Calls:** 260
- **`any` Usage:** 15
- **Code Duplication:** High (getCurrentUser, error handling patterns)

### Main Responsibilities (God Class Anti-Pattern)

1. **Global Notification Handler Setup** (lines 22-230)

   - Foreground/background notification behavior
   - Android republishing logic
   - Incoming call detection

2. **Push Token Management** (lines 408-1147)

   - Token initialization
   - Token saving/updating
   - Device identifier management
   - Token cleanup

3. **Device Management** (lines 2642-2992)

   - Device token retrieval
   - Device listing
   - Device removal
   - Inactive token cleanup

4. **Notification CRUD Operations** (lines 1153-1780)

   - Get notifications
   - Mark as read
   - Delete notifications
   - Unread count

5. **Settings Management** (lines 1859-2000)

   - Get/update notification settings
   - Settings validation

6. **Push Notification Sending** (lines 3084-3265)

   - Single push notification
   - Batch push notifications
   - Edge function integration

7. **Real-time Subscriptions** (lines 2000-2538)

   - Notification subscriptions
   - Listener management
   - Callback handling

8. **Listener Setup** (lines 2118-2538)
   - Notification response listener
   - Notification received listener
   - Navigation handling

## 🎯 Refactor Strategy

### Phase 1: Extract Types & Constants

**Goal:** Create proper type definitions and extract magic strings/numbers

**Files to Create:**

- `services/notifications/types/NotificationTypes.ts`
  - Notification data types
  - Handler types
  - Subscription types
- `services/notifications/types/DeviceTypes.ts`
  - Device-related types
  - Token types
- `services/notifications/constants/index.ts`
  - Notification channels
  - Timeouts
  - Magic strings

**Benefits:**

- Type safety
- Centralized constants
- Better IDE support

---

### Phase 2: Extract Notification Handler

**Goal:** Separate global notification handler logic

**Files to Create:**

- `services/notifications/handler/NotificationHandler.ts`
  - Foreground/background detection
  - Notification behavior logic
  - Android republishing
  - Incoming call detection

**Methods to Extract:**

- Global handler setup (lines 22-230)
- Notification behavior determination
- Android-specific logic

**Benefits:**

- Single Responsibility
- Testable handler logic
- Easier to modify notification behavior

---

### Phase 3: Extract Device Manager

**Goal:** Separate device and token management

**Files to Create:**

- `services/notifications/device/DeviceManager.ts`
  - Device identifier management
  - Device name retrieval
  - Token saving/updating
  - Device listing/removal
- `services/notifications/device/TokenManager.ts`
  - Token initialization
  - Token cleanup
  - Token validation

**Methods to Extract:**

- `getDeviceIdentifier()` (line 752)
- `getDeviceName()` (line 856)
- `savePushToken()` (line 914)
- `getUserDeviceTokens()` (line 2642)
- `getUserDevices()` (line 2712)
- `removeDeviceToken()` (line 2820)
- `cleanupInactiveTokens()` (line 2993)

**Benefits:**

- Clear separation of device concerns
- Reusable device management
- Better testability

---

### Phase 4: Extract Notification Repository

**Goal:** Separate database operations

**Files to Create:**

- `services/notifications/repository/NotificationRepository.ts`
  - CRUD operations
  - Query building
  - Professional info joining

**Methods to Extract:**

- `getNotifications()` (line 1153)
- `getUnreadCount()` (line 1371)
- `markAsRead()` (line 1426)
- `markAllAsRead()` (line 1529)
- `deleteNotification()` (line 1611)
- `deleteAllNotifications()` (line 1700)
- `createNotification()` (line 2543)
- `getNotificationsByType()` (line 3266)
- `clearOldNotifications()` (line 3383)

**Benefits:**

- Repository pattern
- Easier to mock for testing
- Centralized database logic

---

### Phase 5: Extract Push Notification Sender

**Goal:** Separate push notification sending logic

**Files to Create:**

- `services/notifications/push/PushNotificationSender.ts`
  - Single push sending
  - Batch push sending
  - Edge function integration
  - Response handling

**Methods to Extract:**

- `sendPushNotification()` (line 3084)
- `sendBatchPushNotifications()` (line 3178)

**Benefits:**

- Single Responsibility
- Easier to add retry logic
- Better error handling

---

### Phase 6: Extract Settings Manager

**Goal:** Separate settings management

**Files to Create:**

- `services/notifications/settings/SettingsManager.ts`
  - Get settings
  - Update settings
  - Settings validation

**Methods to Extract:**

- `getSettings()` (line 1859)
- `updateSettings()` (line 1941)

**Benefits:**

- Clear settings interface
- Easier to extend settings
- Better validation

---

### Phase 7: Extract Subscription Manager

**Goal:** Separate real-time subscription logic

**Files to Create:**

- `services/notifications/subscription/SubscriptionManager.ts`
  - Real-time subscriptions
  - Listener management
  - Callback handling

**Methods to Extract:**

- `subscribeToNotifications()` (line 2000)
- `onNotificationReceived()` (line 2385)

**Benefits:**

- Clear subscription interface
- Better lifecycle management
- Easier to test

---

### Phase 8: Extract Listener Manager

**Goal:** Separate listener setup and navigation logic

**Files to Create:**

- `services/notifications/listeners/ListenerManager.ts`
  - Notification response listener
  - Navigation handling
  - Incoming call detection
- `services/notifications/listeners/NavigationHandler.ts`
  - Navigation logic
  - Route determination
  - Deep linking

**Methods to Extract:**

- `setupListeners()` (line 2118)
- Navigation logic from response listener (lines 2156-2380)

**Benefits:**

- Clear listener management
- Separated navigation concerns
- Easier to modify navigation logic

---

### Phase 9: Extract Utilities

**Goal:** Extract common utilities and helpers

**Files to Create:**

- `services/notifications/utils/NotificationUtils.ts`
  - Notification type detection
  - Data extraction
  - Validation helpers
- `services/notifications/utils/ErrorHandler.ts`
  - Standardized error handling
  - Error logging patterns

**Benefits:**

- Reusable utilities
- Consistent error handling
- Less code duplication

---

### Phase 10: Refactor Main Service

**Goal:** Transform main service into orchestrator

**Changes:**

- Main service becomes thin orchestrator
- Delegates to extracted classes
- Maintains public API
- Reduces to ~500-800 lines

**Benefits:**

- Maintainable structure
- Clear responsibilities
- Easy to extend

---

## 📋 Implementation Order

### Priority 1 (High Impact, Low Risk)

1. ✅ Phase 1: Types & Constants
2. ✅ Phase 2: Notification Handler
3. ✅ Phase 3: Device Manager
4. ✅ Phase 4: Notification Repository

### Priority 2 (Medium Impact, Medium Risk)

5. ✅ Phase 5: Push Notification Sender
6. ✅ Phase 6: Settings Manager
7. ✅ Phase 7: Subscription Manager

### Priority 3 (Lower Impact, Higher Risk)

8. ✅ Phase 8: Listener Manager
9. ✅ Phase 9: Utilities
10. ✅ Phase 10: Main Service Refactor

---

## 🎯 Expected Outcomes

### Before Refactoring:

- **Main File:** 3,473 lines
- **Methods:** 38 in one class
- **Responsibilities:** 8+ mixed concerns
- **Testability:** Low (hard to mock)
- **Maintainability:** Low (hard to navigate)

### After Refactoring:

- **Main File:** ~500-800 lines (orchestrator)
- **Extracted Classes:** 8-10 focused classes
- **Responsibilities:** Single Responsibility per class
- **Testability:** High (easy to mock dependencies)
- **Maintainability:** High (clear structure)

---

## 🔍 Code Quality Improvements

1. **Reduce Logging Verbosity**

   - Current: 260 logger calls
   - Target: ~100-150 (remove redundant logs)
   - Use centralized logging utility

2. **Remove `any` Types**

   - Current: 15 instances
   - Target: 0 (use proper types)

3. **Extract Common Patterns**

   - `getCurrentUser()` calls (appears 15+ times)
   - Error handling patterns
   - Timing measurements

4. **Improve Error Handling**

   - Custom error classes
   - Consistent error propagation
   - Better error context

5. **Reduce Code Duplication**
   - Extract common query patterns
   - Extract validation logic
   - Extract timing utilities

---

## 📁 Proposed File Structure

```
services/notifications/
├── types/
│   ├── NotificationTypes.ts
│   ├── DeviceTypes.ts
│   ├── HandlerTypes.ts
│   └── index.ts
├── constants/
│   └── index.ts
├── handler/
│   ├── NotificationHandler.ts
│   └── index.ts
├── device/
│   ├── DeviceManager.ts
│   ├── TokenManager.ts
│   └── index.ts
├── repository/
│   ├── NotificationRepository.ts
│   └── index.ts
├── push/
│   ├── PushNotificationSender.ts
│   └── index.ts
├── settings/
│   ├── SettingsManager.ts
│   └── index.ts
├── subscription/
│   ├── SubscriptionManager.ts
│   └── index.ts
├── listeners/
│   ├── ListenerManager.ts
│   ├── NavigationHandler.ts
│   └── index.ts
├── utils/
│   ├── NotificationUtils.ts
│   ├── ErrorHandler.ts
│   └── index.ts
└── notifications.service.ts (orchestrator)
```

---

## ⚠️ Risks & Considerations

1. **Breaking Changes**

   - Maintain public API
   - Keep singleton export
   - Ensure backward compatibility

2. **Testing**

   - Test each extracted class
   - Integration tests for main service
   - Mock dependencies properly

3. **Migration**

   - Refactor incrementally
   - Test after each phase
   - Keep git history clean

4. **Performance**
   - No performance degradation
   - Maintain current functionality
   - Optimize if needed

---

## ✅ Success Criteria

- [ ] Main service reduced to <1000 lines
- [ ] All `any` types removed
- [ ] Logging reduced by 40-50%
- [ ] Code duplication reduced by 60%+
- [ ] All tests passing
- [ ] No breaking changes to public API
- [ ] Improved type safety
- [ ] Better separation of concerns
- [ ] Easier to test and maintain
