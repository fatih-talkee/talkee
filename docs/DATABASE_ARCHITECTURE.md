# Talkee Database Architecture

**Version:** 1.0.0
**Last Updated:** 2025-11-26
**Status:** Development (Mock Data Phase)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation State](#2-current-implementation-state)
3. [Database Configuration](#3-database-configuration)
4. [Data Models & Schemas](#4-data-models--schemas)
5. [Entity Relationships](#5-entity-relationships)
6. [Firestore Collection Structure](#6-firestore-collection-structure)
7. [Query Patterns & Usage](#7-query-patterns--usage)
8. [Security & Access Control](#8-security--access-control)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Migration Plan](#10-migration-plan)
11. [Optimization & Best Practices](#11-optimization--best-practices)
12. [Related Documentation](#12-related-documentation)

---

## 1. Overview

### Database Provider

**Primary Database:** Firebase Firestore (NoSQL)
- **Project ID:** `talkee-d41d6`
- **Auth Domain:** `talkee-d41d6.firebaseapp.com`
- **Configuration File:** `/lib/firebase.ts`

**Local Storage:** React Native AsyncStorage
- **Purpose:** Theme preferences, cached data
- **Wrapper:** `/lib/storage.ts`

### Architecture Philosophy

Talkee's database architecture follows these principles:

1. **Denormalization for Performance**: Embed frequently accessed data (e.g., Professional profiles in CallHistory) to minimize queries
2. **Strong Type Safety**: All data models defined with TypeScript interfaces
3. **Real-time Ready**: Structure supports Firestore real-time listeners
4. **Scalable Schema**: Designed for future growth (multi-currency, internationalization)
5. **Audit Trail**: Timestamps and history tracking built into all entities

---

## 2. Current Implementation State

### ✅ Implemented (Mock Data Phase)

| Feature | Status | Location |
|---------|--------|----------|
| Data Models | ✅ Complete | `/mockData/*.ts` |
| TypeScript Interfaces | ✅ Complete | All mock data files |
| Client-side Filtering | ✅ Complete | Search, wallet, charity screens |
| Local State Management | ✅ Complete | React hooks throughout |
| Theme Persistence | ✅ Complete | AsyncStorage via `/lib/storage.ts` |
| Mock Professionals | ✅ 16 records | `/mockData/professionals.ts` |
| Mock Categories | ✅ 12 records | `/mockData/professionals.ts` |
| Mock Transactions | ✅ 18 records | `/mockData/professionals.ts` |
| Mock Donations | ✅ 20 records | `/mockData/donations.ts` |
| Mock Charities | ✅ 10 records | `/mockData/charities.ts` |

### 🟡 In Progress

| Feature | Status | Notes |
|---------|--------|-------|
| Firebase Integration | 🟡 Configured | `/lib/firebase.ts` initialized, not wired to components |
| User Authentication | 🟡 Partial | Firebase Auth configured, login flow incomplete |
| Real-time Calling | 🟡 Planned | Twilio integration pending |
| Push Notifications | 🟡 Planned | FCM tokens not yet collected |
| Payment Processing | 🟡 Planned | Stripe/PayPal integration pending |

### 🔴 Not Started

- Offline mode support
- Real-time sync via Firestore listeners
- Professional verification workflow backend
- Rating/review system backend
- Call recording and playback
- Advanced search indexing
- Data analytics and reporting

---

## 3. Database Configuration

### Firebase Setup

**File:** `/lib/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import Constants from 'expo-constants';

const firebaseConfig = Constants.expoConfig?.extra?.firebase;
const app = initializeApp(firebaseConfig);

export { app };
```

**Configuration Source:** `/app.json` (lines 77-85)

```json
{
  "firebase": {
    "projectId": "talkee-d41d6",
    "authDomain": "talkee-d41d6.firebaseapp.com",
    "storageBucket": "talkee-d41d6.firebasestorage.app",
    "apiKey": "AIzaSyBeqpwfLjvvgKEKv7ZScDPe9Y9aGO6ubso",
    "messagingSenderId": "748569301754",
    "appId": "1:748569301754:web:df4d509e4aa0b76bda7236"
  }
}
```

### Local Storage Setup

**File:** `/lib/storage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  async setItem(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
};
```

**Current Usage:**
- Theme preferences: `@app_theme` key
- User session data (planned)
- Cached search results (planned)

---

## 4. Data Models & Schemas

### 4.1 Professional Entity

**Purpose:** Core entity representing service providers on the platform

**File:** `/mockData/professionals.ts` (lines 1-18)

**Firestore Path (Planned):** `professionals/{professionalId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Unique professional identifier | UUID or Firebase auto-generated |
| `name` | string | Yes | Professional's full name | 2-100 characters |
| `title` | string | Yes | Job title or expertise area | Max 200 characters |
| `category` | string | Yes | Primary category | Must match Category.name |
| `ratePerMinute` | number | Yes | Consultation rate per minute | Min: 0, Max: 1000 (USD) |
| `avatar` | string | Yes | Profile image URL | Firebase Storage path |
| `bio` | string | Yes | Professional biography | Max 2000 characters |
| `rating` | number | Yes | Average rating | 0-5, decimal precision |
| `totalCalls` | number | Yes | Total completed calls | Non-negative integer |
| `isOnline` | boolean | Yes | Current online status | Updated real-time |
| `isVerified` | boolean | Yes | Verification badge status | Admin-controlled |
| `specialties` | string[] | Yes | Array of specialty tags | 1-10 items |
| `languages` | string[] | Yes | Languages spoken | ISO 639-1 codes preferred |
| `responseTime` | string | Yes | Average response time | Format: "< X min" |
| `badges` | string[] | Yes | Achievement badges | Predefined badge IDs |
| `isBlocked` | boolean | No | User-specific block status | Optional, user-scoped |

#### Sample Record

```typescript
{
  id: '1',
  name: 'Dr. Sarah Chen',
  title: 'Business Strategy Consultant',
  category: 'Business',
  ratePerMinute: 8.50,
  avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
  bio: 'Former McKinsey consultant...',
  rating: 4.9,
  totalCalls: 1247,
  isOnline: true,
  isVerified: true,
  specialties: ['Strategy', 'Leadership', 'Digital Transformation'],
  languages: ['English', 'Mandarin'],
  responseTime: '< 2 min',
  badges: ['Top Rated', 'Fast Responder', '1000+ Calls']
}
```

#### Indexes Required (Firestore)

```javascript
// Composite indexes for filtering
professionals.createIndex(['category', 'isOnline', 'rating']);
professionals.createIndex(['isVerified', 'totalCalls']);
professionals.createIndex(['ratePerMinute', 'rating']);

// Full-text search (Algolia integration recommended)
professionals.algoliaIndex(['name', 'title', 'specialties']);
```

---

### 4.2 Category Entity

**Purpose:** Organize professionals into browsable categories

**File:** `/mockData/professionals.ts` (lines 20-26)

**Firestore Path (Planned):** `categories/{categoryId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Category identifier | Lowercase, URL-friendly |
| `name` | string | Yes | Display name | Unique, 3-50 characters |
| `icon` | string | Yes | Lucide icon name | Must be valid Lucide icon |
| `color` | string | Yes | Theme color (hex) | 6-digit hex code |
| `professionalCount` | number | Yes | Number of professionals | Aggregated, updated via Cloud Functions |

#### Sample Record

```typescript
{
  id: 'business',
  name: 'Business',
  icon: 'Briefcase',
  color: '#007AFF',
  professionalCount: 1247
}
```

#### Available Categories (12 Total)

1. **Business** (`#007AFF` - Blue) - 1,247 professionals
2. **Technology** (`#5856D6` - Purple) - 892 professionals
3. **Health** (`#30D158` - Green) - 1,534 professionals
4. **Finance** (`#FFD60A` - Yellow) - 687 professionals
5. **Lifestyle** (`#FF9F0A` - Orange) - 456 professionals
6. **Education** (`#64D2FF` - Light Blue) - 789 professionals
7. **Design** (`#BF5AF2` - Pink) - 345 professionals
8. **Entertainment** (`#FF375F` - Red) - 234 professionals
9. **Sports** (`#32D74B` - Bright Green) - 567 professionals
10. **Automotive** (`#8E8E93` - Gray) - 123 professionals
11. **Photography** (`#FF6B35` - Orange-Red) - 298 professionals
12. **Gaming** (`#5AC8FA` - Sky Blue) - 445 professionals

---

### 4.3 CallHistory Entity

**Purpose:** Track all voice and video consultations

**File:** `/mockData/professionals.ts` (lines 28-39)

**Firestore Path (Planned):** `users/{userId}/callHistory/{callId}` (user view)
**Firestore Path (Planned):** `professionals/{professionalId}/callHistory/{callId}` (professional view)
**Firestore Path (Planned):** `calls/{callId}` (system record)

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Call record identifier | UUID |
| `professionalId` | string | Yes | Reference to Professional | Foreign key |
| `professional` | Professional | Yes | Embedded Professional object | Denormalized for UI |
| `duration` | number | Yes | Call duration in minutes | Non-negative |
| `cost` | number | Yes | Total call cost (USD) | Calculated: duration × ratePerMinute |
| `date` | string | Yes | ISO 8601 timestamp | UTC timezone |
| `type` | 'voice' \| 'video' | Yes | Call type | Enum validation |
| `status` | 'completed' \| 'missed' \| 'cancelled' | Yes | Call outcome | Enum validation |
| `direction` | 'incoming' \| 'outgoing' | No | Call direction | Optional, user perspective |
| `isBlocked` | boolean | No | If participant is blocked | Optional |

#### Sample Record

```typescript
{
  id: '1',
  professionalId: '1',
  professional: { /* Full Professional object */ },
  duration: 25,
  cost: 212.50,
  date: '2024-03-15T14:30:00Z',
  type: 'video',
  status: 'completed',
  direction: 'outgoing'
}
```

#### Relationships

- **One-to-Many**: Professional → CallHistory (via `professionalId`)
- **Many-to-One**: User → CallHistory (implicit via user subcollection)

#### Queries Used

```typescript
// Filter by status (completed, missed, cancelled)
callHistory.filter(call => call.status === selectedStatus);

// Search by professional name
callHistory.filter(call =>
  call.professional.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// Group by date (Today, Yesterday, etc.)
callHistory.reduce((groups, call) => {
  const dateKey = formatDateGroup(call.date);
  groups[dateKey].push(call);
  return groups;
}, {});
```

**File:** `/app/call-history/index.tsx` (lines 47-68)

---

### 4.4 WalletTransaction Entity

**Purpose:** Track all financial transactions (income and expenses)

**File:** `/mockData/professionals.ts` (lines 543-556)

**Firestore Path (Planned):** `users/{userId}/transactions/{transactionId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Transaction identifier | UUID |
| `type` | 'income' \| 'expenses' | Yes | Transaction direction | Enum validation |
| `amount` | number | Yes | Transaction amount (USD) | Positive number |
| `description` | string | Yes | Transaction description | Max 500 characters |
| `timestamp` | string | Yes | ISO 8601 timestamp | UTC timezone |
| `professionalId` | string | No | Reference to Professional | For call expenses |
| `professional` | Professional | No | Embedded Professional object | Denormalized |
| `callerId` | string | No | Reference to caller | For income (professionals only) |
| `caller` | Professional | No | Embedded caller object | Denormalized |
| `status` | 'completed' \| 'pending' \| 'failed' | No | Transaction status | Enum validation |
| `duration` | number | No | Call duration in seconds | For call transactions |

#### Sample Records

**Expense (User paying for call):**
```typescript
{
  id: 'txn_1',
  type: 'expenses',
  amount: 212.50,
  description: 'Video call with Dr. Sarah Chen',
  timestamp: '2024-03-15T14:30:00Z',
  professionalId: '1',
  professional: { /* Full Professional object */ },
  status: 'completed',
  duration: 1500
}
```

**Income (Professional earning from call):**
```typescript
{
  id: 'txn_2',
  type: 'income',
  amount: 180.00,
  description: 'Earnings from call',
  timestamp: '2024-03-15T14:30:00Z',
  callerId: 'user_123',
  caller: { /* Caller Professional object */ },
  status: 'completed',
  duration: 1500
}
```

**Income (Credit purchase):**
```typescript
{
  id: 'txn_3',
  type: 'income',
  amount: 100.00,
  description: 'Credit purchase',
  timestamp: '2024-03-16T10:00:00Z',
  status: 'completed'
}
```

#### Relationships

- **Many-to-One**: WalletTransaction → Professional (via `professionalId` for expenses)
- **Many-to-One**: WalletTransaction → User (via `callerId` for income)

#### Queries Used

```typescript
// Filter by type (income vs expenses)
transactions.filter(txn => txn.type === selectedType);

// Group by date
transactions.reduce((groups, txn) => {
  const dateKey = formatDateGroup(txn.timestamp);
  groups[dateKey].push(txn);
  return groups;
}, {});

// Calculate totals
const totalIncome = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + t.amount, 0);
```

**File:** `/app/wallet-history.tsx` (lines 18-27)

---

### 4.5 DonationRecord Entity

**Purpose:** Track charitable donations made from call earnings

**File:** `/mockData/donations.ts` (lines 1-12)

**Firestore Path (Planned):** `users/{userId}/donations/{donationId}` (user view)
**Firestore Path (Planned):** `charities/{charityId}/donations/{donationId}` (charity view)
**Firestore Path (Planned):** `calls/{callId}/donation` (call-specific)

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Donation record identifier | UUID |
| `callId` | string | Yes | Reference to originating call | Foreign key |
| `charityId` | string | Yes | Reference to charity | Foreign key |
| `charityName` | string | Yes | Charity name (denormalized) | For UI display |
| `amount` | number | Yes | Donation amount | Positive number |
| `currency` | 'USD' \| 'TRY' \| 'EUR' | Yes | Currency code | ISO 4217 |
| `date` | Date | Yes | Donation timestamp | JavaScript Date object |
| `callDuration` | number | Yes | Call duration in seconds | Non-negative |
| `grossEarnings` | number | Yes | Total earnings from call | Before donations |
| `donationPercentage` | number | Yes | Percentage donated | 0-100 |

#### Sample Record

```typescript
{
  id: 'don_1',
  callId: 'call_123',
  charityId: '1',
  charityName: 'Global Education Fund',
  amount: 12.50,
  currency: 'USD',
  date: new Date('2024-03-15T14:30:00Z'),
  callDuration: 1500,
  grossEarnings: 125.00,
  donationPercentage: 10
}
```

#### Relationships

- **One-to-One**: DonationRecord → CallHistory (via `callId`)
- **Many-to-One**: DonationRecord → CharityOrganization (via `charityId`)

#### Helper Functions

**File:** `/mockData/donations.ts` (lines 264-314)

```typescript
// Calculate total donated across all records
getTotalDonated(records: DonationRecord[]): number

// Group donations by charity
getDonationsByCharity(records: DonationRecord[]): Map<string, DonationRecord[]>

// Filter donations by time period (days)
getDonationsByPeriod(records: DonationRecord[], days: number): DonationRecord[]

// Group donations by month (newest first)
groupDonationsByMonth(records: DonationRecord[]): Map<string, DonationRecord[]>

// Format month display name
getMonthDisplayName(date: Date): string
```

#### Queries Used

```typescript
// Filter by period (last 30/90/365 days or all-time)
const filteredDonations = getDonationsByPeriod(allDonations, 30);

// Group by month
const monthlyDonations = groupDonationsByMonth(filteredDonations);

// Aggregate by charity
const charityTotals = getDonationsByCharity(filteredDonations);
```

**File:** `/app/charity/history.tsx` (lines 42-59)

---

### 4.6 CharityOrganization Entity

**Purpose:** Directory of verified charitable organizations

**File:** `/mockData/charities.ts` (lines 1-12)

**Firestore Path (Planned):** `charities/{charityId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Charity identifier | UUID |
| `name` | string | Yes | Organization name | Unique, 3-200 characters |
| `shortDescription` | string | Yes | Brief description | Max 200 characters |
| `fullDescription` | string | Yes | Detailed description | Max 2000 characters |
| `logo` | string | Yes | Logo image URL | Firebase Storage path |
| `category` | CategoryType | Yes | Charity category | Enum validation (see below) |
| `country` | string | Yes | Country code | ISO 3166-1 alpha-2 |
| `website` | string | No | Official website URL | Valid URL format |
| `verified` | boolean | Yes | Verification status | Admin-controlled |
| `featuredImage` | string | No | Featured image URL | Firebase Storage path |

#### Category Enum

```typescript
type CharityCategory =
  | 'education'
  | 'health'
  | 'environment'
  | 'poverty'
  | 'animals'
  | 'human_rights'
  | 'other';
```

#### Sample Record

```typescript
{
  id: '1',
  name: 'Global Education Fund',
  shortDescription: 'Providing education to children in developing countries',
  fullDescription: 'The Global Education Fund works to ensure...',
  logo: 'https://example.com/logos/gef.png',
  category: 'education',
  country: 'US',
  website: 'https://globaleducationfund.org',
  verified: true,
  featuredImage: 'https://example.com/featured/gef.jpg'
}
```

#### Helper Functions

**File:** `/mockData/charities.ts` (lines 137-177)

```typescript
// Lookup charity by ID
getCharityById(id: string): CharityOrganization | undefined

// Filter charities by category
getCharitiesByCategory(category: CharityCategory | 'all'): CharityOrganization[]

// Get category display name
getCategoryDisplayName(category: CharityCategory): string

// Get theme-safe category color
getCategoryColor(category: CharityCategory, theme: Theme): string
```

#### Category Display Names & Colors

| Category | Display Name | Color (Light Theme) | Color (Dark Theme) |
|----------|--------------|---------------------|-------------------|
| `education` | Education | `#007AFF` | `#007AFF` |
| `health` | Health | `#30D158` | `#30D158` |
| `environment` | Environment | `#32D74B` | `#32D74B` |
| `poverty` | Poverty Alleviation | `#FF9F0A` | `#FF9F0A` |
| `animals` | Animal Welfare | `#BF5AF2` | `#BF5AF2` |
| `human_rights` | Human Rights | `#FF375F` | `#FF375F` |
| `other` | Other Causes | `theme.colors.textSecondary` | `theme.colors.textSecondary` |

#### Queries Used

```typescript
// Filter by category (including 'all')
const filteredCharities = getCharitiesByCategory(selectedCategory);

// Filter by verification status
const verifiedCharities = allCharities.filter(c => c.verified);

// Search by name
const searchResults = allCharities.filter(c =>
  c.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**File:** `/app/charity/organizations.tsx` (lines 64, 161-198)

---

### 4.7 UserProfile Entity

**Purpose:** User account and profile information

**File:** `/mockData/user.ts` (lines 7-19)

**Firestore Path (Planned):** `users/{userId}/profile`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | User identifier | Firebase Auth UID |
| `name` | string | Yes | User's display name | 2-100 characters |
| `email` | string | Yes | User's email address | Valid email format |
| `avatar` | string | Yes | Profile image URL | Firebase Storage path |
| `memberSince` | string | Yes | Membership start date | Format: "Month YYYY" |
| `totalCalls` | number | Yes | Total completed calls | Non-negative |
| `favoriteCount` | number | Yes | Number of favorited professionals | Non-negative |
| `urgentCallEnabled` | boolean | Yes | Premium feature flag | Default: false |
| `urgentCallPrice` | number | Yes | Urgent call multiplier price | For premium users |
| `urgentCallCurrency` | 'USD' \| 'TRY' \| 'EUR' | Yes | Urgent call currency | ISO 4217 |

#### Sample Record

```typescript
{
  id: 'user_123',
  name: 'Mila Victoria',
  email: 'mila.victoria@example.com',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  memberSince: 'January 2024',
  totalCalls: 23,
  favoriteCount: 8,
  urgentCallEnabled: true,
  urgentCallPrice: 15.99,
  urgentCallCurrency: 'USD'
}
```

#### Relationships

- **One-to-Many**: UserProfile → CallHistory
- **One-to-Many**: UserProfile → WalletTransaction
- **One-to-Many**: UserProfile → DonationRecord
- **One-to-Many**: UserProfile → BlockedUser
- **One-to-One**: UserProfile → CharitySettings

---

### 4.8 BlockedUser Entity

**Purpose:** Track users blocked by the current user

**File:** `/mockData/professionals.ts` (lines 557-565)

**Firestore Path (Planned):** `users/{userId}/blockedUsers/{blockedUserId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Block record identifier | UUID |
| `userId` | string | Yes | ID of blocked user | Foreign key |
| `user` | Professional | Yes | Embedded blocked user profile | Denormalized |
| `blockedAt` | string | Yes | ISO 8601 timestamp | UTC timezone |
| `lastCallDate` | string | No | Last call before blocking | ISO 8601 |
| `lastCallDuration` | number | No | Last call duration in seconds | Non-negative |

#### Sample Record

```typescript
{
  id: 'block_1',
  userId: '2',
  user: { /* Full Professional object for Marcus Thompson */ },
  blockedAt: '2024-03-10T09:15:00Z',
  lastCallDate: '2024-03-09T14:30:00Z',
  lastCallDuration: 900
}
```

#### Relationships

- **Many-to-One**: BlockedUser → Professional (via `userId`)

**File:** `/app/blocked-users.tsx`

---

### 4.9 Notification Entity

**Purpose:** In-app notifications and alerts

**File:** `/mockData/professionals.ts` (lines 446-456)

**Firestore Path (Planned):** `users/{userId}/notifications/{notificationId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Notification identifier | UUID |
| `title` | string | Yes | Notification title | Max 100 characters |
| `message` | string | Yes | Notification body | Max 500 characters |
| `type` | NotificationType | Yes | Notification type | Enum validation (see below) |
| `timestamp` | string | Yes | ISO 8601 timestamp | UTC timezone |
| `isRead` | boolean | Yes | Read status | Default: false |
| `professionalId` | string | No | Related professional | Foreign key |
| `professional` | Professional | No | Embedded Professional object | Denormalized |
| `actionUrl` | string | No | Navigation URL | Deep link format |

#### Type Enum

```typescript
type NotificationType =
  | 'call'           // Incoming call
  | 'message'        // New message
  | 'appointment'    // Appointment reminder
  | 'promotion'      // Marketing promotion
  | 'payment'        // Payment updates
  | 'system';        // System announcements
```

#### Sample Record

```typescript
{
  id: 'notif_1',
  title: 'Incoming Call',
  message: 'Dr. Sarah Chen is calling you',
  type: 'call',
  timestamp: '2024-03-15T14:25:00Z',
  isRead: false,
  professionalId: '1',
  professional: { /* Full Professional object */ },
  actionUrl: '/call/incoming/call_123'
}
```

#### Queries Used

```typescript
// Get unread count
const unreadCount = notifications.filter(n => !n.isRead).length;

// Mark as read
notifications.map(n => ({ ...n, isRead: true }));

// Filter by type
const callNotifications = notifications.filter(n => n.type === 'call');
```

---

### 4.10 Promotion Entity

**Purpose:** Marketing banners and promotional content

**File:** `/mockData/professionals.ts` (lines 41-48)

**Firestore Path (Planned):** `promotions/{promotionId}`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Promotion identifier | UUID |
| `title` | string | Yes | Promotion headline | Max 100 characters |
| `subtitle` | string | Yes | Promotion subtitle | Max 200 characters |
| `image` | string | Yes | Banner image URL | Firebase Storage path |
| `ctaText` | string | Yes | Call-to-action button text | Max 50 characters |
| `gradient` | string[] | Yes | RGBA gradient colors | Array of 2 RGBA strings |

#### Sample Record

```typescript
{
  id: 'promo_1',
  title: 'Turn Knowledge to Action',
  subtitle: 'Connect with experts instantly',
  image: 'https://images.unsplash.com/photo-1...',
  ctaText: 'Get Started',
  gradient: [
    'rgba(139, 69, 172, 0.9)',
    'rgba(104, 45, 110, 0.8)'
  ]
}
```

**Usage:** Home screen carousel (`/app/(tabs)/index.tsx`)

---

### 4.11 CharitySettings Entity

**Purpose:** User's charity donation preferences

**File:** `/lib/donationCalculator.ts` (lines 18-24)

**Firestore Path (Planned):** `users/{userId}/charitySettings`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `enabled` | boolean | Yes | Enable charitable donations | Default: false |
| `donationPercentage` | number | Yes | **Legacy field** (unused) | 0-100, superseded by selectedCharities |
| `selectedCharities` | SelectedCharity[] | Yes | Array of charity allocations | Max 5 charities |
| `showPublicBadge` | boolean | Yes | Show public charity badge | Default: false |
| `monthlyGoal` | number | No | Optional monthly donation goal | Positive number |

#### SelectedCharity Sub-Schema

```typescript
interface SelectedCharity {
  id: string;              // Charity ID
  name: string;            // Charity name (denormalized)
  logo: string;            // Logo URL (denormalized)
  percentage: number;      // Individual allocation percentage (0-100)
}
```

#### Sample Record

```typescript
{
  enabled: true,
  donationPercentage: 0,  // Legacy, not used
  selectedCharities: [
    {
      id: '1',
      name: 'Global Education Fund',
      logo: 'https://example.com/logos/gef.png',
      percentage: 15
    },
    {
      id: '2',
      name: 'Clean Water Initiative',
      logo: 'https://example.com/logos/cwi.png',
      percentage: 10
    },
    {
      id: '3',
      name: 'Rainforest Guardians',
      logo: 'https://example.com/logos/rg.png',
      percentage: 20
    }
  ],
  showPublicBadge: true,
  monthlyGoal: 100.00
}
```

#### Validation Rules

- Total of all `selectedCharities[].percentage` must not exceed 100%
- Minimum 1 charity, maximum 5 charities when enabled
- Each charity percentage must be between 1-100

**Default Settings** (lines 208-234): 3 charities, 45% total allocation

---

### 4.12 EarningsBreakdown Entity

**Purpose:** Calculate earnings after deductions

**File:** `/lib/donationCalculator.ts` (lines 1-9)

#### Schema

| Field | Type | Required | Description | Calculation |
|-------|------|----------|-------------|-------------|
| `grossEarnings` | number | Yes | Total call earnings | `duration × ratePerMinute` |
| `platformCommission` | number | Yes | Platform fee | `grossEarnings × platformCommissionRate` |
| `platformCommissionRate` | number | Yes | Platform fee percentage | 0-1 (e.g., 0.15 = 15%) |
| `donationAmount` | number | Yes | Total donations | `grossEarnings × (totalPercentage / 100)` |
| `donationPercentage` | number | Yes | Total donation percentage | Sum of all charity percentages |
| `netEarnings` | number | Yes | Final earnings | `grossEarnings - platformCommission - donationAmount` |
| `currency` | 'USD' \| 'TRY' \| 'EUR' | Yes | Currency code | ISO 4217 |

#### Calculation Formula

**File:** `/lib/donationCalculator.ts` (lines 41-76)

```typescript
function calculateEarnings(
  grossEarnings: number,
  platformCommissionRate: number,
  donationPercentage: number,
  currency: string
): EarningsBreakdown {
  const platformCommission = grossEarnings * platformCommissionRate;
  const donationAmount = grossEarnings * (donationPercentage / 100);
  const netEarnings = grossEarnings - platformCommission - donationAmount;

  return {
    grossEarnings,
    platformCommission,
    platformCommissionRate,
    donationAmount,
    donationPercentage,
    netEarnings,
    currency
  };
}
```

#### Sample Calculation

**Input:**
- Gross Earnings: $125.00
- Platform Commission: 15%
- Donation Percentage: 45% (across 3 charities)

**Output:**
```typescript
{
  grossEarnings: 125.00,
  platformCommission: 18.75,      // 15% of $125.00
  platformCommissionRate: 0.15,
  donationAmount: 56.25,          // 45% of $125.00
  donationPercentage: 45,
  netEarnings: 50.00,             // $125.00 - $18.75 - $56.25
  currency: 'USD'
}
```

---

### 4.13 DonationOrganization Entity (Call-specific)

**Purpose:** Pre-selected charities for specific calls (Turkish organizations)

**File:** `/mockData/callDonationOrganizations.ts` (lines 6-10)

**Firestore Path (Planned):** `calls/{callId}/donationOrganizations`

#### Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | Organization identifier | UUID |
| `name` | string | Yes | Organization name | Turkish charity names |
| `percentage` | number | Yes | Donation percentage for this call | 0-100 |

#### Sample Records

```typescript
[
  { id: '1', name: 'Çağdaş Yaşamı Destekleme Derneği', percentage: 20 },
  { id: '2', name: 'LÖSEV', percentage: 20 },
  { id: '3', name: 'ÖÇEV', percentage: 5 }
]
```

**Usage:** `/app/call-donation/[id].tsx` - Call-specific donation selection

---

## 5. Entity Relationships

### Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIPS                             │
└─────────────────────────────────────────────────────────────────────────┘

UserProfile (1)
  ├─► CallHistory (N) [users/{userId}/callHistory/{callId}]
  │   └─► Professional (1) [professionalId + embedded]
  │
  ├─► WalletTransaction (N) [users/{userId}/transactions/{txnId}]
  │   ├─► Professional (0..1) [professionalId for expenses]
  │   └─► Professional (0..1) [callerId for income]
  │
  ├─► DonationRecord (N) [users/{userId}/donations/{donationId}]
  │   ├─► CharityOrganization (1) [charityId]
  │   └─► CallHistory (1) [callId]
  │
  ├─► BlockedUser (N) [users/{userId}/blockedUsers/{blockId}]
  │   └─► Professional (1) [userId + embedded]
  │
  ├─► Notification (N) [users/{userId}/notifications/{notifId}]
  │   └─► Professional (0..1) [professionalId + embedded]
  │
  └─► CharitySettings (1) [users/{userId}/charitySettings]
      └─► SelectedCharity (N) [embedded array]
          └─► CharityOrganization (1) [id reference]

Professional (1)
  ├─► Category (1) [category field references Category.name]
  ├─► CallHistory (N) [as service provider]
  └─► WalletTransaction (N) [as both income recipient and expense payee]

Category (1)
  └─◄ Professional (N) [category field]

CharityOrganization (1)
  ├─◄ DonationRecord (N) [charityId]
  └─◄ SelectedCharity (N) [id reference in CharitySettings]

CallHistory (1)
  └─► DonationRecord (0..1) [callId]

Promotion
  └─ (Standalone entity, no relationships)
```

### Relationship Types

#### One-to-Many (1:N)
- **UserProfile → CallHistory**: A user has many call records
- **UserProfile → WalletTransaction**: A user has many transactions
- **UserProfile → DonationRecord**: A user makes many donations
- **UserProfile → BlockedUser**: A user can block many users
- **UserProfile → Notification**: A user receives many notifications
- **Professional → CallHistory**: A professional has many call records
- **Professional → WalletTransaction**: A professional has many transactions
- **Category → Professional**: A category contains many professionals
- **CharityOrganization → DonationRecord**: A charity receives many donations

#### One-to-One (1:1)
- **UserProfile → CharitySettings**: Each user has one charity settings object
- **CallHistory → DonationRecord**: Each call has at most one donation record

#### Many-to-Many (N:M)
- **UserProfile ↔ CharityOrganization**: Via `CharitySettings.selectedCharities[]`
- **Professional ↔ UserProfile**: Via favorites (not yet implemented in schema)

### Denormalization Strategy

Talkee uses strategic denormalization for performance:

| Denormalized Data | Location | Reason |
|-------------------|----------|---------|
| Full `Professional` object | `CallHistory.professional` | Avoid N+1 queries for call history list |
| Full `Professional` object | `WalletTransaction.professional` | Display transaction details without lookup |
| Full `Professional` object | `BlockedUser.user` | Show blocked user profile |
| Full `Professional` object | `Notification.professional` | Show notification sender |
| `charityName` | `DonationRecord.charityName` | Display charity name without lookup |
| `name`, `logo` | `SelectedCharity` in `CharitySettings` | Display charity info without lookup |

**Trade-offs:**
- ✅ **Pros**: Faster reads, single query for complex UI
- ❌ **Cons**: Data duplication, stale data risk, larger document sizes

**Mitigation**: Use Firebase Cloud Functions to update denormalized data when source changes

---

## 6. Firestore Collection Structure

### Proposed Database Schema

```
talkee-d41d6 (Firestore Database)
│
├── users/                                    [Collection]
│   └── {userId}/                             [Document]
│       ├── profile                           [UserProfile]
│       ├── wallet                            [{ balance: number, currency: string }]
│       ├── charitySettings                   [CharitySettings]
│       │
│       ├── callHistory/                      [Subcollection]
│       │   └── {callId}                      [CallHistory]
│       │
│       ├── transactions/                     [Subcollection]
│       │   └── {transactionId}               [WalletTransaction]
│       │
│       ├── donations/                        [Subcollection]
│       │   └── {donationId}                  [DonationRecord]
│       │
│       ├── blockedUsers/                     [Subcollection]
│       │   └── {blockId}                     [BlockedUser]
│       │
│       ├── notifications/                    [Subcollection]
│       │   └── {notificationId}              [Notification]
│       │
│       └── favorites/                        [Subcollection]
│           └── {professionalId}              [{ professionalId: string, addedAt: Timestamp }]
│
├── professionals/                            [Collection]
│   └── {professionalId}/                     [Document]
│       ├── profile                           [Professional]
│       ├── availability                      [{ schedule: object, timezone: string }]
│       ├── stats                             [{ rating: number, totalCalls: number, responseTime: string }]
│       │
│       ├── callHistory/                      [Subcollection]
│       │   └── {callId}                      [CallHistory]
│       │
│       └── earnings/                         [Subcollection]
│           └── {transactionId}               [WalletTransaction]
│
├── categories/                               [Collection]
│   └── {categoryId}                          [Category]
│
├── calls/                                    [Collection - System-wide call records]
│   └── {callId}/                             [Document]
│       ├── participants                      [{ userId: string, professionalId: string }]
│       ├── duration                          [number (seconds)]
│       ├── cost                              [number]
│       ├── type                              ['voice' | 'video']
│       ├── status                            ['active' | 'completed' | 'missed' | 'cancelled']
│       ├── startedAt                         [Timestamp]
│       ├── endedAt                           [Timestamp | null]
│       ├── recordingUrl                      [string | null]
│       │
│       └── donation                          [DonationRecord (embedded)]
│
├── charities/                                [Collection]
│   └── {charityId}/                          [Document]
│       ├── metadata                          [CharityOrganization]
│       │
│       └── donations/                        [Subcollection]
│           └── {donationId}                  [DonationRecord (denormalized copy)]
│
├── promotions/                               [Collection]
│   └── {promotionId}                         [Promotion]
│
└── systemConfig/                             [Collection]
    └── settings                              [Document]
        ├── platformCommissionRate            [number (0-1)]
        ├── urgentCallMultiplier              [number]
        ├── minimumCallDuration               [number (seconds)]
        └── supportedCurrencies               [string[]]
```

### Collection Access Patterns

| Collection | Read Pattern | Write Pattern | Real-time |
|------------|--------------|---------------|-----------|
| `users/{userId}/profile` | On login, profile view | On registration, profile edit | No |
| `users/{userId}/callHistory` | Paginated list | After each call | Yes (optional) |
| `users/{userId}/transactions` | Paginated list, filtered by type | After payments/earnings | Yes |
| `users/{userId}/donations` | Grouped by month/charity | After each call with donations | No |
| `users/{userId}/notifications` | Recent 50, real-time | Push notification events | Yes |
| `professionals` | Search (Algolia), category filter | On profile update | No |
| `professionals/{id}/availability` | Before call initiation | Professional sets schedule | Yes |
| `categories` | Full list on app start (cached) | Admin only | No |
| `calls/{callId}` | During active call | Call start/end | Yes |
| `charities` | Full list (cached), filtered by category | Admin only | No |
| `promotions` | Full list on home screen | Admin only | No |

### Storage Buckets (Firebase Storage)

```
gs://talkee-d41d6.firebasestorage.app/
│
├── avatars/
│   ├── users/
│   │   └── {userId}/
│   │       └── avatar.jpg
│   │
│   └── professionals/
│       └── {professionalId}/
│           └── avatar.jpg
│
├── recordings/
│   └── {callId}/
│       └── recording.{mp4|webm}
│
├── charityLogos/
│   └── {charityId}/
│       ├── logo.png
│       └── featured.jpg
│
└── promotions/
    └── {promotionId}/
        └── banner.jpg
```

### Required Firestore Indexes

```javascript
// Composite indexes for complex queries

// Search professionals by category, rating, online status
db.collection('professionals')
  .where('category', '==', 'Business')
  .where('isOnline', '==', true)
  .orderBy('rating', 'desc');
// Index: professionals (category ASC, isOnline ASC, rating DESC)

// Search professionals by price range and verification
db.collection('professionals')
  .where('ratePerMinute', '>=', 5)
  .where('ratePerMinute', '<=', 20)
  .where('isVerified', '==', true);
// Index: professionals (ratePerMinute ASC, isVerified ASC)

// Get user's recent call history
db.collection('users/{userId}/callHistory')
  .where('status', '==', 'completed')
  .orderBy('date', 'desc')
  .limit(20);
// Index: callHistory (status ASC, date DESC)

// Get user's transactions by type and date
db.collection('users/{userId}/transactions')
  .where('type', '==', 'income')
  .orderBy('timestamp', 'desc')
  .limit(50);
// Index: transactions (type ASC, timestamp DESC)

// Get user's donations by period
db.collection('users/{userId}/donations')
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
  .orderBy('date', 'desc');
// Index: donations (date ASC)

// Get charity's donations
db.collection('charities/{charityId}/donations')
  .orderBy('date', 'desc')
  .limit(100);
// Index: donations (date DESC)

// Get unread notifications
db.collection('users/{userId}/notifications')
  .where('isRead', '==', false)
  .orderBy('timestamp', 'desc');
// Index: notifications (isRead ASC, timestamp DESC)
```

---

## 7. Query Patterns & Usage

### 7.1 Professional Search & Discovery

**File:** `/app/(tabs)/search.tsx` (lines 65-109)

**Current Implementation:** Client-side filtering on mock data

**Firestore Query (Planned):**

```typescript
// Multi-criteria search
async function searchProfessionals(filters: FilterState) {
  let query = db.collection('professionals');

  // Filter by category
  if (filters.categories.length > 0) {
    query = query.where('category', 'in', filters.categories);
  }

  // Filter by price range
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) {
    query = query
      .where('ratePerMinute', '>=', filters.priceRange[0])
      .where('ratePerMinute', '<=', filters.priceRange[1]);
  }

  // Filter by availability
  if (filters.availability === 'online') {
    query = query.where('isOnline', '==', true);
  }

  // Filter by verification
  if (filters.verifiedOnly) {
    query = query.where('isVerified', '==', true);
  }

  // Order by rating (descending)
  query = query.orderBy('rating', 'desc');

  // Pagination
  const snapshot = await query.limit(20).get();
  return snapshot.docs.map(doc => doc.data() as Professional);
}
```

**Optimization Notes:**
- Use Algolia for full-text search on `name`, `title`, `specialties`
- Firestore queries limited to 1-2 filters + 1 orderBy for efficiency
- Implement pagination with `startAfter()` for large result sets

---

### 7.2 Call History Retrieval

**File:** `/app/call-history/index.tsx` (lines 47-68)

**Current Implementation:**

```typescript
// Client-side filtering
const filteredHistory = callHistory.filter(call => {
  const matchesStatus =
    selectedStatus === 'all' || call.status === selectedStatus;

  const matchesSearch =
    call.professional.name.toLowerCase().includes(searchQuery.toLowerCase());

  return matchesStatus && matchesSearch;
});

// Grouping by date
const groupedHistory = filteredHistory.reduce((groups, call) => {
  const dateKey = formatDateGroup(call.date);
  groups[dateKey] = [...(groups[dateKey] || []), call];
  return groups;
}, {});
```

**Firestore Query (Planned):**

```typescript
async function getCallHistory(
  userId: string,
  status: string,
  limit: number = 20,
  startAfter?: DocumentSnapshot
) {
  let query = db
    .collection('users')
    .doc(userId)
    .collection('callHistory');

  // Filter by status
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }

  // Order by date (newest first)
  query = query.orderBy('date', 'desc');

  // Pagination
  if (startAfter) {
    query = query.startAfter(startAfter);
  }

  const snapshot = await query.limit(limit).get();
  return {
    calls: snapshot.docs.map(doc => doc.data() as CallHistory),
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
}
```

**Grouping Logic:** Done client-side after fetching (same as current)

---

### 7.3 Wallet Transaction History

**File:** `/app/wallet-history.tsx` (lines 18-27)

**Current Implementation:**

```typescript
// Filter by type
const filteredTransactions = transactions.filter(txn =>
  selectedType === 'all' || txn.type === selectedType
);

// Group by date
const groupedTransactions = filteredTransactions.reduce((groups, txn) => {
  const dateKey = formatDateGroup(txn.timestamp);
  groups[dateKey] = [...(groups[dateKey] || []), txn];
  return groups;
}, {});

// Calculate totals
const totalIncome = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + t.amount, 0);

const totalExpenses = transactions
  .filter(t => t.type === 'expenses')
  .reduce((sum, t) => sum + t.amount, 0);
```

**Firestore Query (Planned):**

```typescript
async function getTransactions(
  userId: string,
  type: 'income' | 'expenses' | 'all',
  limit: number = 50
) {
  let query = db
    .collection('users')
    .doc(userId)
    .collection('transactions');

  // Filter by type
  if (type !== 'all') {
    query = query.where('type', '==', type);
  }

  // Order by timestamp (newest first)
  query = query.orderBy('timestamp', 'desc').limit(limit);

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as WalletTransaction);
}

// Totals aggregation (Cloud Function recommended)
async function getTransactionTotals(userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .get();

  return snapshot.docs.reduce((totals, doc) => {
    const txn = doc.data() as WalletTransaction;
    if (txn.type === 'income') {
      totals.income += txn.amount;
    } else {
      totals.expenses += txn.amount;
    }
    return totals;
  }, { income: 0, expenses: 0 });
}
```

**Optimization:** Store aggregated totals in `users/{userId}/wallet` document, updated via Cloud Function triggers

---

### 7.4 Charity Donation History

**File:** `/app/charity/history.tsx` (lines 42-59)

**Current Implementation:**

```typescript
// Filter by period
const filteredDonations = getDonationsByPeriod(allDonations, selectedPeriod);

// Group by month
const monthlyDonations = groupDonationsByMonth(filteredDonations);

// Aggregate by charity
const charityTotals = getDonationsByCharity(filteredDonations);
```

**Helper Functions:** `/mockData/donations.ts` (lines 264-314)

**Firestore Query (Planned):**

```typescript
async function getDonationHistory(
  userId: string,
  periodDays: number | null
) {
  let query = db
    .collection('users')
    .doc(userId)
    .collection('donations');

  // Filter by date range
  if (periodDays !== null) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    query = query.where('date', '>=', Timestamp.fromDate(startDate));
  }

  // Order by date (newest first)
  query = query.orderBy('date', 'desc');

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as DonationRecord);
}

// Client-side grouping (same as current implementation)
function groupDonationsByMonth(donations: DonationRecord[]) {
  return donations.reduce((groups, donation) => {
    const monthKey = format(donation.date, 'MMMM yyyy');
    groups[monthKey] = [...(groups[monthKey] || []), donation];
    return groups;
  }, {} as Record<string, DonationRecord[]>);
}

// Client-side aggregation
function getTotalDonated(donations: DonationRecord[]) {
  return donations.reduce((sum, d) => sum + d.amount, 0);
}
```

---

### 7.5 Charity Organization Directory

**File:** `/app/charity/organizations.tsx` (lines 64, 161-198)

**Current Implementation:**

```typescript
// Filter by category
const filteredCharities = getCharitiesByCategory(selectedCategory);

// Search by name
const searchResults = filteredCharities.filter(charity =>
  charity.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**Firestore Query (Planned):**

```typescript
async function getCharities(category: CharityCategory | 'all') {
  let query = db.collection('charities');

  // Filter by category
  if (category !== 'all') {
    query = query.where('category', '==', category);
  }

  // Only show verified charities (optional)
  query = query.where('verified', '==', true);

  // Order alphabetically
  query = query.orderBy('name', 'asc');

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as CharityOrganization);
}

// Search (client-side or Algolia)
function searchCharities(charities: CharityOrganization[], query: string) {
  return charities.filter(charity =>
    charity.name.toLowerCase().includes(query.toLowerCase()) ||
    charity.shortDescription.toLowerCase().includes(query.toLowerCase())
  );
}
```

**Caching Strategy:** Cache full charity list on app launch (only ~10 records, rarely changes)

---

### 7.6 Professional Availability Check

**File:** Not yet implemented (planned for call initiation flow)

**Firestore Query (Planned):**

```typescript
async function getProfessionalAvailability(professionalId: string) {
  const doc = await db
    .collection('professionals')
    .doc(professionalId)
    .collection('availability')
    .doc('current')
    .get();

  return doc.data() as {
    isOnline: boolean;
    timezone: string;
    schedule: Record<string, { start: string; end: string }[]>;
    nextAvailable: Timestamp | null;
  };
}

// Real-time listener for online status
function subscribeToOnlineStatus(
  professionalId: string,
  callback: (isOnline: boolean) => void
) {
  return db
    .collection('professionals')
    .doc(professionalId)
    .onSnapshot(snapshot => {
      const data = snapshot.data();
      callback(data?.isOnline || false);
    });
}
```

---

### 7.7 Notification Management

**File:** Not yet fully implemented (notifications displayed but not managed)

**Firestore Query (Planned):**

```typescript
// Get unread notifications
async function getUnreadNotifications(userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .where('isRead', '==', false)
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Notification));
}

// Mark notification as read
async function markNotificationRead(userId: string, notificationId: string) {
  await db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .doc(notificationId)
    .update({ isRead: true });
}

// Real-time listener for new notifications
function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
) {
  return db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .where('isRead', '==', false)
    .orderBy('timestamp', 'desc')
    .onSnapshot(snapshot => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    });
}
```

---

### 7.8 Active Call Management

**File:** Not yet implemented (Twilio integration pending)

**Firestore Query (Planned):**

```typescript
// Create call record
async function initiateCall(
  userId: string,
  professionalId: string,
  type: 'voice' | 'video'
) {
  const callRef = db.collection('calls').doc();

  await callRef.set({
    id: callRef.id,
    participants: { userId, professionalId },
    type,
    status: 'active',
    startedAt: Timestamp.now(),
    endedAt: null,
    duration: 0,
    cost: 0,
    recordingUrl: null
  });

  return callRef.id;
}

// End call and calculate cost
async function endCall(callId: string, professional: Professional) {
  const callRef = db.collection('calls').doc(callId);
  const callDoc = await callRef.get();
  const callData = callDoc.data();

  const endTime = Timestamp.now();
  const durationSeconds = endTime.seconds - callData.startedAt.seconds;
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const cost = durationMinutes * professional.ratePerMinute;

  await callRef.update({
    status: 'completed',
    endedAt: endTime,
    duration: durationSeconds,
    cost
  });

  return { durationMinutes, cost };
}

// Real-time call status listener
function subscribeToCallStatus(
  callId: string,
  callback: (status: string) => void
) {
  return db
    .collection('calls')
    .doc(callId)
    .onSnapshot(snapshot => {
      const data = snapshot.data();
      callback(data?.status || 'unknown');
    });
}
```

---

## 8. Security & Access Control

### Firestore Security Rules

**File:** Not yet created (`firestore.rules` - needs to be added)

#### Proposed Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection
    match /users/{userId} {
      // User can read/write their own profile
      allow read, write: if isOwner(userId);

      // User subcollections
      match /callHistory/{callId} {
        allow read, write: if isOwner(userId);
      }

      match /transactions/{transactionId} {
        allow read, write: if isOwner(userId);
        // Admins can also read for support purposes
        allow read: if isAdmin();
      }

      match /donations/{donationId} {
        allow read, write: if isOwner(userId);
      }

      match /blockedUsers/{blockId} {
        allow read, write: if isOwner(userId);
      }

      match /notifications/{notificationId} {
        allow read: if isOwner(userId);
        // System can write notifications
        allow write: if isAdmin();
      }

      match /charitySettings {
        allow read, write: if isOwner(userId);
      }

      match /wallet {
        allow read: if isOwner(userId);
        // Wallet updates only via Cloud Functions
        allow write: if false;
      }
    }

    // Professionals collection
    match /professionals/{professionalId} {
      // Anyone can read professional profiles
      allow read: if isAuthenticated();

      // Only the professional can update their profile
      allow write: if isOwner(professionalId) || isAdmin();

      match /availability/{doc} {
        allow read: if isAuthenticated();
        allow write: if isOwner(professionalId);
      }

      match /callHistory/{callId} {
        allow read: if isOwner(professionalId);
      }

      match /earnings/{transactionId} {
        allow read: if isOwner(professionalId);
      }
    }

    // Categories collection (read-only for users)
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Calls collection (system-managed)
    match /calls/{callId} {
      allow read: if isAuthenticated() && (
        resource.data.participants.userId == request.auth.uid ||
        resource.data.participants.professionalId == request.auth.uid
      );
      // Writes only via Cloud Functions
      allow write: if false;
    }

    // Charities collection (read-only)
    match /charities/{charityId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();

      match /donations/{donationId} {
        allow read: if isAdmin();
        // Writes via Cloud Functions only
        allow write: if false;
      }
    }

    // Promotions collection (read-only)
    match /promotions/{promotionId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // System config (read-only for users)
    match /systemConfig/{doc} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### Firebase Storage Rules

**File:** Not yet created (`storage.rules` - needs to be added)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isAdmin() {
      return request.auth.token.admin == true;
    }

    function isImageFile() {
      return request.resource.contentType.matches('image/.*');
    }

    function isVideoFile() {
      return request.resource.contentType.matches('video/.*');
    }

    function isUnder10MB() {
      return request.resource.size < 10 * 1024 * 1024;
    }

    // User avatars
    match /avatars/users/{userId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId) && isImageFile() && isUnder10MB();
    }

    // Professional avatars
    match /avatars/professionals/{professionalId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isOwner(professionalId) && isImageFile() && isUnder10MB();
    }

    // Call recordings
    match /recordings/{callId}/{fileName} {
      allow read: if isAuthenticated(); // Add call participant check
      allow write: if false; // Only Cloud Functions
    }

    // Charity logos
    match /charityLogos/{charityId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Promotion banners
    match /promotions/{promotionId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### Authentication Security

**Firebase Auth Configuration:**

```javascript
// Password requirements
{
  "passwordPolicy": {
    "enforcementState": "ENFORCE",
    "forceUpgradeOnSignin": true,
    "constraints": {
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumeric": true,
      "minLength": 8
    }
  },

  // Email verification required
  "emailVerification": {
    "enabled": true
  },

  // Multi-factor authentication (optional)
  "mfa": {
    "state": "OPTIONAL",
    "enabledProviders": ["PHONE_SMS"]
  }
}
```

---

## 9. Data Flow Diagrams

### 9.1 User Registration Flow

```
┌─────────────┐
│ User starts │
│ registration│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Firebase Auth       │
│ createUserWithEmail │
│ AndPassword()       │
└──────┬──────────────┘
       │
       ▼ [Auth UID generated]
       │
┌──────▼──────────────┐
│ Create Firestore    │
│ user profile        │
│ users/{uid}/profile │
└──────┬──────────────┘
       │
       ├──► Create wallet document
       │    users/{uid}/wallet
       │    { balance: 0, currency: 'USD' }
       │
       ├──► Create charity settings
       │    users/{uid}/charitySettings
       │    { enabled: false, ... }
       │
       └──► Upload avatar to Storage
            avatars/users/{uid}/avatar.jpg
```

**Files Involved:**
- Auth: `/app/auth/register.tsx` (planned)
- Storage: `/lib/firebase.ts`

---

### 9.2 Professional Search & Discovery Flow

```
┌─────────────┐
│ User opens  │
│ search tab  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Load categories     │
│ from Firestore      │
│ (cached)            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ User applies        │
│ filters:            │
│ - Category          │
│ - Price range       │
│ - Availability      │
│ - Languages         │
│ - Verified only     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Query Firestore     │
│ professionals       │
│ with filters        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Display results     │
│ with pagination     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ User taps           │
│ professional card   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Navigate to         │
│ professional detail │
│ /professional/{id}  │
└─────────────────────┘
```

**Files Involved:**
- Search UI: `/app/(tabs)/search.tsx`
- Filters: `/components/filters/FilterModal.tsx`
- Professional Card: `/components/listings/ProfessionalCard.tsx`

**Current:** Mock data filtering
**Planned:** Firestore composite queries + Algolia search

---

### 9.3 Call Initiation & Completion Flow

```
┌─────────────────┐
│ User taps       │
│ "Call" button   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Check professional  │
│ availability        │
│ (Firestore)         │
└────────┬────────────┘
         │
         ▼ [Available]
         │
┌────────▼────────────┐
│ Deduct estimated    │
│ cost from wallet    │
│ (hold funds)        │
└────────┬────────────┘
         │
         ▼
┌────────────────────────┐
│ Create call document   │
│ calls/{callId}         │
│ status: 'active'       │
└────────┬───────────────┘
         │
         ├──► Initiate Twilio call
         │
         └──► Start call timer
              │
              ▼
        ┌─────────────────┐
        │ Call in progress│
        │ (real-time sync)│
        └────────┬���───────┘
                 │
                 ▼ [Call ends]
                 │
        ┌────────▼──────────────┐
        │ Update call document  │
        │ status: 'completed'   │
        │ duration: X seconds   │
        │ cost: $Y              │
        └────────┬──────────────┘
                 │
                 ├──► Calculate final cost
                 │    (duration × rate)
                 │
                 ├──► Deduct from user wallet
                 │    (Cloud Function)
                 │
                 ├──► Add to professional earnings
                 │    (Cloud Function)
                 │
                 ├──► Create CallHistory records
                 │    users/{userId}/callHistory
                 │    professionals/{profId}/callHistory
                 │
                 ├──► Create WalletTransaction records
                 │    (expense for user, income for professional)
                 │
                 └──► [If charity enabled]
                      ├─► Calculate donation amounts
                      │   (per CharitySettings)
                      │
                      └─► Create DonationRecord
                          users/{userId}/donations
```

**Files Involved:**
- Call initiation: Planned (Twilio integration)
- Wallet: `/app/(tabs)/wallet.tsx`
- Call history: `/app/call-history/index.tsx`
- Donation calculator: `/lib/donationCalculator.ts`

**Cloud Functions Required:**
1. `onCallComplete` - Handle post-call processing
2. `updateWalletBalance` - Atomic balance updates
3. `calculateDonations` - Split donations across charities
4. `updateProfessionalStats` - Increment totalCalls, recalculate rating

---

### 9.4 Donation Processing Flow

```
┌─────────────────┐
│ Call completes  │
│ with $125 gross │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Fetch user's            │
│ CharitySettings         │
│ users/{uid}/            │
│   charitySettings       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Check if enabled        │
│ enabled: true           │
│ selectedCharities: [3]  │
│   - GEF: 15%            │
│   - CWI: 10%            │
│   - RG: 20%             │
└────────┬────────────────┘
         │
         ▼ [Enabled]
         │
┌────────▼──────────────────┐
│ Calculate earnings        │
│ (donationCalculator.ts)   │
│                           │
│ grossEarnings: $125.00    │
│ platformCommission: $18.75│
│   (15% of gross)          │
│ donationAmount: $56.25    │
│   (45% of gross)          │
│ netEarnings: $50.00       │
└────────┬──────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Split donations per charity │
│                             │
│ GEF: $18.75 (15% of $125)   │
│ CWI: $12.50 (10% of $125)   │
│ RG: $25.00 (20% of $125)    │
└────────┬────────────────────┘
         │
         ├──► Create 3 DonationRecord documents
         │    users/{uid}/donations/{id}
         │    - One per charity
         │
         ├──► Copy to charity subcollections
         │    charities/{charityId}/donations/{id}
         │    - For charity-side reporting
         │
         └──► Update monthly donation totals
              users/{uid}/donationSummary
              { month: 'March 2024', total: $156.25 }
```

**Files Involved:**
- Donation calculator: `/lib/donationCalculator.ts`
- Charity settings: User profile (planned)
- Donation history: `/app/charity/history.tsx`
- Mock donations: `/mockData/donations.ts`

**Cloud Function:**
`processDonations` - Triggered on call completion, creates DonationRecords

---

### 9.5 Wallet Transaction Flow

```
┌─────────────────┐
│ User adds       │
│ credits ($100)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Process payment via │
│ Stripe/PayPal       │
└────────┬────────────┘
         │
         ▼ [Payment successful]
         │
┌────────▼──────────────────┐
│ Create WalletTransaction  │
│ users/{uid}/transactions  │
│ {                         │
│   type: 'income',         │
│   amount: 100.00,         │
│   description: 'Credit    │
│     purchase',            │
│   status: 'completed'     │
│ }                         │
└────────┬──────────────────┘
         │
         ▼
┌────────────────────────┐
│ Update wallet balance  │
│ users/{uid}/wallet     │
│ balance: old + $100    │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Send notification      │
│ "Credit added: $100"   │
└────────────────────────┘


[Call expense flow]

┌─────────────────┐
│ Call completes  │
│ cost: $212.50   │
└────────┬────────┘
         │
         ▼
┌────────▼──────────────────┐
│ Create WalletTransaction  │
│ users/{uid}/transactions  │
│ {                         │
│   type: 'expenses',       │
│   amount: 212.50,         │
│   professionalId: '1',    │
│   professional: {...},    │
│   status: 'completed'     │
│ }                         │
└────────┬──────────────────┘
         │
         ▼
┌────────────────────────┐
│ Update wallet balance  │
│ users/{uid}/wallet     │
│ balance: old - $212.50 │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────────┐
│ Create income transaction  │
│ for professional           │
│ professionals/{id}/        │
│   earnings/{txnId}         │
│ {                          │
│   type: 'income',          │
│   amount: 180.00,          │
│   (after platform fee &    │
│    donations)              │
│ }                          │
└────────────────────────────┘
```

**Files Involved:**
- Wallet UI: `/app/(tabs)/wallet.tsx`
- Transaction history: `/app/wallet-history.tsx`
- Mock transactions: `/mockData/professionals.ts`

**Cloud Functions Required:**
1. `processPayment` - Handle Stripe/PayPal webhooks
2. `updateWalletBalance` - Atomic balance updates
3. `createTransaction` - Transaction logging with retries

---

### 9.6 Rating & Review Flow (Planned)

```
┌─────────────────┐
│ Call completes  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Show rating prompt  │
│ "Rate your call"    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────┐
│ User submits:           │
│ - Rating: 5 stars       │
│ - Review: "Great call!" │
│ - Tips: $5 (optional)   │
└────────┬────────────────┘
         │
         ▼
┌────────▼──────────────────┐
│ Create Review document    │
│ professionals/{id}/       │
│   reviews/{reviewId}      │
│ {                         │
│   userId: '...',          │
│   rating: 5,              │
│   comment: "Great call!", │
│   callId: '...',          │
│   createdAt: Timestamp    │
│ }                         │
└────────┬──────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Trigger Cloud Function      │
│ updateProfessionalRating    │
│ - Recalculate avg rating    │
│ - Update totalCalls count   │
└────────┬────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Update Professional doc    │
│ professionals/{id}         │
│ {                          │
│   rating: 4.85,            │
│   totalCalls: 1248,        │
│   totalReviews: 892        │
│ }                          │
└────────┬───────────────────┘
         │
         ▼ [If tip provided]
         │
┌────────▼──────────────────┐
│ Process tip payment       │
│ - Deduct from user wallet │
│ - Add to professional     │
│   earnings                │
└───────────────────────────┘
```

**Files Involved:**
- Not yet implemented
- Professional detail: `/app/professional/[id].tsx` (planned)

**Cloud Function:**
`updateProfessionalRating` - Recalculate aggregate rating after each review

---

## 10. Migration Plan

### Phase 1: Firebase Setup (Week 1)

**Tasks:**
1. ✅ Initialize Firebase project (`talkee-d41d6`)
2. ✅ Configure Firebase SDK in app (`/lib/firebase.ts`)
3. ⬜ Deploy Firestore security rules (`firestore.rules`)
4. ⬜ Deploy Storage security rules (`storage.rules`)
5. ⬜ Set up Firebase Authentication
6. ⬜ Create admin user with elevated privileges

**Deliverables:**
- Firestore database with security rules
- Firebase Storage buckets configured
- Admin panel access

---

### Phase 2: Core Collections (Week 2-3)

**Tasks:**
1. ⬜ Create `categories` collection
   - Seed 12 categories from mock data
   - Set up admin write access

2. ⬜ Create `professionals` collection
   - Migrate 16 professional profiles
   - Upload avatar images to Storage
   - Create Firestore indexes for search queries

3. ⬜ Create `charities` collection
   - Migrate 10 charity organizations
   - Upload logos to Storage

4. ⬜ Create `promotions` collection
   - Migrate 4 promotion banners
   - Upload banner images to Storage

5. ⬜ Set up user profile structure
   - Define `users/{userId}/profile` schema
   - Create wallet subcollection
   - Create charitySettings document

**Deliverables:**
- All static collections populated
- Images migrated to Firebase Storage
- Firestore indexes created

---

### Phase 3: User-Specific Data (Week 4-5)

**Tasks:**
1. ⬜ Implement user registration flow
   - Firebase Auth integration
   - Profile creation on signup
   - Email verification

2. ⬜ Create subcollection structures
   - `users/{userId}/callHistory`
   - `users/{userId}/transactions`
   - `users/{userId}/donations`
   - `users/{userId}/blockedUsers`
   - `users/{userId}/notifications`

3. ⬜ Implement real-time queries
   - Replace mock data with Firestore queries
   - Add pagination for large collections
   - Implement real-time listeners for notifications

4. ⬜ Update UI components
   - Replace `mockProfessionals` with Firestore queries
   - Update search filters to use Firestore
   - Add loading states and error handling

**Deliverables:**
- User authentication working
- Dynamic data fetching from Firestore
- Real-time updates for notifications

---

### Phase 4: Call Management (Week 6-7)

**Tasks:**
1. ⬜ Integrate Twilio for voice/video calls
   - Set up Twilio account
   - Generate access tokens
   - Implement call initiation/termination

2. ⬜ Implement call lifecycle management
   - Create `calls/{callId}` on call start
   - Update document in real-time during call
   - Finalize document on call end

3. ⬜ Create Cloud Functions for call processing
   - `onCallComplete` function
   - Calculate final cost
   - Deduct from user wallet
   - Add to professional earnings
   - Create CallHistory records

4. ⬜ Implement wallet management
   - Credit purchase flow (Stripe integration)
   - Atomic balance updates
   - Transaction logging

**Deliverables:**
- Working voice/video calls
- Automatic wallet deductions
- Call history tracking

---

### Phase 5: Donation System (Week 8-9)

**Tasks:**
1. ⬜ Implement charity selection UI
   - User can choose charities
   - Set donation percentages
   - Save to `users/{userId}/charitySettings`

2. ⬜ Create donation processing Cloud Function
   - Calculate donation amounts
   - Split across selected charities
   - Create DonationRecord documents

3. ⬜ Implement donation history
   - Query user's donations
   - Group by month/charity
   - Display aggregated totals

4. ⬜ Create charity admin panel
   - View donation reports
   - Download donation data

**Deliverables:**
- Charity donation system functional
- Donation history and reporting
- Admin panel for charities

---

### Phase 6: Search & Discovery (Week 10-11)

**Tasks:**
1. ⬜ Implement Algolia integration
   - Set up Algolia account
   - Create search indexes
   - Sync professional data

2. ⬜ Update search UI
   - Replace client-side filtering with Algolia
   - Add autocomplete/suggestions
   - Implement faceted search

3. ⬜ Optimize Firestore queries
   - Add composite indexes
   - Implement query pagination
   - Cache frequently accessed data

4. ⬜ Add professional discovery features
   - "Recommended for you" (based on call history)
   - "Trending now" (by totalCalls)
   - "New professionals" (by signup date)

**Deliverables:**
- Fast, scalable search
- Personalized recommendations
- Optimized query performance

---

### Phase 7: Advanced Features (Week 12+)

**Tasks:**
1. ⬜ Implement rating/review system
   - Post-call rating prompt
   - Review submission
   - Aggregate rating calculation

2. ⬜ Add favorites system
   - Save favorite professionals
   - Quick access from home screen

3. ⬜ Implement notification system
   - Firebase Cloud Messaging
   - Push notification setup
   - In-app notification center

4. ⬜ Add offline mode support
   - Cache essential data locally
   - Sync when online
   - Queue offline actions

5. ⬜ Implement analytics
   - Track user behavior
   - Professional performance metrics
   - Revenue reporting

**Deliverables:**
- Full-featured app
- Analytics dashboard
- Offline support

---

### Data Seeding Scripts

**Create:** `/scripts/seedDatabase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { mockProfessionals, mockCategories } from '../mockData/professionals';
import { mockCharities } from '../mockData/charities';

const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedCategories() {
  console.log('Seeding categories...');
  for (const category of mockCategories) {
    await setDoc(doc(db, 'categories', category.id), category);
    console.log(`✓ Seeded category: ${category.name}`);
  }
}

async function seedProfessionals() {
  console.log('Seeding professionals...');
  for (const professional of mockProfessionals) {
    await setDoc(doc(db, 'professionals', professional.id), {
      ...professional,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✓ Seeded professional: ${professional.name}`);
  }
}

async function seedCharities() {
  console.log('Seeding charities...');
  for (const charity of mockCharities) {
    await setDoc(doc(db, 'charities', charity.id), charity);
    console.log(`✓ Seeded charity: ${charity.name}`);
  }
}

async function main() {
  try {
    await seedCategories();
    await seedProfessionals();
    await seedCharities();
    console.log('\n✅ Database seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

main();
```

**Run:** `npx ts-node scripts/seedDatabase.ts`

---

## 11. Optimization & Best Practices

### 11.1 Query Optimization

#### Use Composite Indexes

Firestore requires composite indexes for queries with multiple filters or orderBy clauses:

```javascript
// Automatically creates index on first query failure
db.collection('professionals')
  .where('category', '==', 'Business')
  .where('isOnline', '==', true)
  .orderBy('rating', 'desc');

// Firestore console will prompt to create index:
// professionals (category ASC, isOnline ASC, rating DESC)
```

**Best Practices:**
- Create indexes proactively in Firestore console
- Export index configuration to `firestore.indexes.json`
- Version control index definitions

#### Limit Query Results

Always use `.limit()` to prevent expensive queries:

```typescript
// BAD: Fetches all documents
const snapshot = await db.collection('professionals').get();

// GOOD: Fetch only what's needed
const snapshot = await db.collection('professionals').limit(20).get();
```

#### Use Pagination

Implement cursor-based pagination for large lists:

```typescript
// First page
const firstPage = await db
  .collection('professionals')
  .orderBy('rating', 'desc')
  .limit(20)
  .get();

const lastVisible = firstPage.docs[firstPage.docs.length - 1];

// Next page
const nextPage = await db
  .collection('professionals')
  .orderBy('rating', 'desc')
  .startAfter(lastVisible)
  .limit(20)
  .get();
```

---

### 11.2 Caching Strategy

#### Cache Static Data

Cache rarely-changing collections:

```typescript
// Cache categories on app launch
const CACHE_KEY = '@categories';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getCategories() {
  // Check cache first
  const cached = await storage.getItem<{ data: Category[], timestamp: number }>(CACHE_KEY);

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  // Fetch from Firestore
  const snapshot = await db.collection('categories').get();
  const categories = snapshot.docs.map(doc => doc.data() as Category);

  // Update cache
  await storage.setItem(CACHE_KEY, {
    data: categories,
    timestamp: Date.now()
  });

  return categories;
}
```

#### Enable Firestore Persistence

```typescript
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const db = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024 // 50 MB
});

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab
  } else if (err.code == 'unimplemented') {
    // Browser doesn't support persistence
  }
});
```

---

### 11.3 Denormalization Best Practices

#### When to Denormalize

**✅ Denormalize when:**
- Data is read frequently but updated rarely (e.g., Professional profiles)
- UI requires displaying related data without extra queries
- Real-time consistency is not critical

**❌ Don't denormalize when:**
- Data changes frequently (e.g., online status, wallet balance)
- Strong consistency is required
- Document size would exceed 1 MB limit

#### Update Denormalized Data

Use Cloud Functions to keep denormalized data in sync:

```typescript
// Cloud Function: Update denormalized Professional in CallHistory
export const onProfessionalUpdate = functions.firestore
  .document('professionals/{professionalId}')
  .onUpdate(async (change, context) => {
    const professionalId = context.params.professionalId;
    const newData = change.after.data();

    // Update all CallHistory records with this professional
    const batch = db.batch();

    const callHistorySnapshot = await db
      .collectionGroup('callHistory')
      .where('professionalId', '==', professionalId)
      .get();

    callHistorySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { professional: newData });
    });

    await batch.commit();
  });
```

---

### 11.4 Real-time Listeners

#### Use Sparingly

Real-time listeners cost more reads. Only use for critical data:

```typescript
// GOOD: Listen to own notifications
const unsubscribe = db
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .where('isRead', '==', false)
  .onSnapshot(snapshot => {
    const notifications = snapshot.docs.map(doc => doc.data());
    setNotifications(notifications);
  });

// Return cleanup function
return unsubscribe;

// BAD: Listen to all professionals (expensive!)
// Use one-time fetch instead
```

#### Unsubscribe on Unmount

Always clean up listeners to prevent memory leaks:

```typescript
useEffect(() => {
  const unsubscribe = db.collection('calls').doc(callId).onSnapshot(/* ... */);

  return () => unsubscribe(); // Cleanup
}, [callId]);
```

---

### 11.5 Batch Operations

Use batch writes for atomic operations:

```typescript
async function blockUserAndDeleteHistory(userId: string, blockedUserId: string) {
  const batch = db.batch();

  // Add to blocked users
  const blockRef = db
    .collection('users')
    .doc(userId)
    .collection('blockedUsers')
    .doc();
  batch.set(blockRef, { userId: blockedUserId, blockedAt: new Date() });

  // Delete call history with this user
  const callsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('callHistory')
    .where('professionalId', '==', blockedUserId)
    .get();

  callsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Commit all changes atomically
  await batch.commit();
}
```

---

### 11.6 Security Considerations

#### Validate Data on Write

Use Firestore security rules to validate data:

```javascript
// Only allow valid email addresses
match /users/{userId} {
  allow create: if request.resource.data.email is string &&
                   request.resource.data.email.matches('.*@.*\\..*');
}

// Prevent negative wallet balances
match /users/{userId}/wallet {
  allow update: if request.resource.data.balance >= 0;
}
```

#### Sanitize User Input

Always sanitize before writing to Firestore:

```typescript
function sanitizeProfessionalBio(bio: string): string {
  // Remove HTML tags
  let clean = bio.replace(/<[^>]*>/g, '');

  // Limit length
  clean = clean.substring(0, 2000);

  // Remove excessive whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}
```

---

### 11.7 Cost Optimization

#### Minimize Document Reads

**Expensive:**
```typescript
// Reads ALL call history documents
const snapshot = await db
  .collection('users')
  .doc(userId)
  .collection('callHistory')
  .get();

const totalCalls = snapshot.size; // Very expensive!
```

**Optimized:**
```typescript
// Store aggregate in user profile
const userDoc = await db
  .collection('users')
  .doc(userId)
  .get();

const totalCalls = userDoc.data().totalCalls; // Single read!

// Update via Cloud Function on each new call
```

#### Use Cloud Functions for Aggregations

```typescript
// Cloud Function: Update totalCalls counter
export const onNewCall = functions.firestore
  .document('users/{userId}/callHistory/{callId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;

    await db
      .collection('users')
      .doc(userId)
      .update({
        totalCalls: FieldValue.increment(1)
      });
  });
```

#### Monitor Usage

Use Firebase console to track:
- Document reads/writes per day
- Storage usage
- Bandwidth usage
- Set budget alerts to avoid surprises

---

## 12. Related Documentation

### Internal Documentation

- [BLUEPRINT.md](./BLUEPRINT.md) - Overall project architecture and roadmap
- [DESIGN.md](./DESIGN.md) - UI/UX design system and component library (if exists)
- `README.md` - Project setup and installation instructions

### Firebase Documentation

- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

### Third-Party Integrations

- [Twilio Voice/Video](https://www.twilio.com/docs/voice) - Call management
- [Algolia Search](https://www.algolia.com/doc/) - Professional search
- [Stripe API](https://stripe.com/docs/api) - Payment processing

### Mock Data Files

All current data structures can be found in:

- `/mockData/professionals.ts` - Professional, Category, CallHistory, Promotion, Notification, WalletTransaction, BlockedUser
- `/mockData/user.ts` - UserProfile
- `/mockData/donations.ts` - DonationRecord
- `/mockData/charities.ts` - CharityOrganization
- `/mockData/callDonationOrganizations.ts` - DonationOrganization
- `/lib/donationCalculator.ts` - EarningsBreakdown, CharitySettings

---

## Appendix A: Mock Data Summary

### Current Mock Data Counts

| Entity | Count | Location |
|--------|-------|----------|
| Professional | 16 | `/mockData/professionals.ts` (lines 51-328) |
| Category | 12 | `/mockData/professionals.ts` (lines 333-346) |
| CallHistory | 5 | `/mockData/professionals.ts` (lines 348-409) |
| Promotion | 4 | `/mockData/professionals.ts` (lines 411-444) |
| Notification | 8 | `/mockData/professionals.ts` (lines 458-541) |
| WalletTransaction | 18 | `/mockData/professionals.ts` (lines 566-747) |
| BlockedUser | 2 | `/mockData/professionals.ts` (lines 749-766) |
| UserProfile | 1 | `/mockData/user.ts` (lines 21-32) |
| DonationRecord | 20 | `/mockData/donations.ts` (lines 21-262) |
| CharityOrganization | 10 | `/mockData/charities.ts` (lines 14-135) |
| DonationOrganization | 3 | `/mockData/callDonationOrganizations.ts` (lines 12-28) |

**Total Mock Records:** 99

---

## Appendix B: TypeScript Interface Summary

All interfaces are strongly typed and ready for Firestore integration. See [Section 4](#4-data-models--schemas) for detailed schemas.

---

## Appendix C: Cloud Functions Required

| Function Name | Trigger | Purpose |
|---------------|---------|---------|
| `onCallComplete` | Firestore trigger: `calls/{callId}` update | Process call completion, create transactions, calculate donations |
| `updateWalletBalance` | Firestore trigger: `transactions/{txnId}` create | Atomically update user/professional wallet |
| `processDonations` | Called by `onCallComplete` | Split donations across charities, create DonationRecords |
| `updateProfessionalRating` | Firestore trigger: `reviews/{reviewId}` create | Recalculate average rating |
| `updateProfessionalStats` | Firestore trigger: `callHistory/{callId}` create | Increment totalCalls counter |
| `onProfessionalUpdate` | Firestore trigger: `professionals/{id}` update | Sync denormalized Professional data |
| `processPayment` | HTTP endpoint (Stripe webhook) | Handle payment success/failure |
| `sendNotification` | HTTP endpoint or Firestore trigger | Send FCM push notifications |
| `aggregateDonations` | Scheduled (daily) | Calculate monthly donation totals |
| `cleanupOldData` | Scheduled (weekly) | Archive or delete old records |

---

**End of Database Architecture Document**

*This document will be updated as the database implementation progresses through the migration phases outlined in Section 10.*
