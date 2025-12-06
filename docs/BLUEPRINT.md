# Talkee Project Blueprint

**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Language:** English | [Türkçe](./BLUEPRINT.tr.md)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Initial Feature Set](#3-initial-feature-set)
4. [Directory Layout](#4-directory-layout)
5. [Technology Stack](#5-technology-stack)
6. [Data Models](#6-data-models)
7. [Development Roadmap](#7-development-roadmap)
8. [Related Documentation](#8-related-documentation)

---

## 1. Project Overview

**Talkee** is a cross-platform (iOS/Android) professional consultation marketplace built with React Native and Expo. The app connects users with verified professionals across 12 categories for paid voice/video consultations.

### Core Value Proposition

#### For Users
- **On-demand Access**: Connect with experts instantly
- **Transparent Pricing**: Per-minute rates displayed upfront
- **Quality Assurance**: Verified professionals with ratings
- **Multi-category**: 12+ professional categories
- **Flexible Communication**: Voice and video calls

#### For Professionals
- **Monetization**: Earn from expertise through consultations
- **Flexible Schedule**: Set availability and rates
- **Global Reach**: Connect with clients worldwide
- **Professional Tools**: Calendar, analytics, earnings tracking

### Project Goals
- Provide seamless professional consultation experiences
- Build trust through verification and rating systems
- Enable global knowledge exchange
- Create sustainable income for professionals

---

## 2. High-Level Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                       │
│                  (React Native + Expo)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │   Calling    │  │   Payment    │      │
│  │    Module    │  │    Module    │  │    Module    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Discovery   │  │   Profile    │  │  Scheduling  │      │
│  │    Module    │  │    Module    │  │    Module    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │    Twilio    │  │   Payment    │      │
│  │     Auth     │  │     Voice    │  │   Gateway    │      │
│  │  Firestore   │  │    Video     │  │(Stripe/etc.) │      │
│  │   Storage    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Module Breakdown

#### A. Authentication Module
**Location:** `/app/auth/`

**Components:**
- Login screen
- Registration flow
- OTP verification
- Password recovery
- Account setup

**Services:**
- Firebase Authentication
- User profile creation
- Session management

#### B. Discovery & Search Module
**Location:** `/app/(tabs)/`, `/components/listings/`

**Features:**
- Home feed with promotions
- Professional search with filters
- Category browsing (12 categories)
- Featured professionals
- Favorites management

**Components:**
- `CategoryGrid.tsx`
- `ProfessionalCard.tsx`
- `SearchBar.tsx`
- `FilterModal.tsx`
- `PromotionCarousel.tsx`

#### C. Calling System
**Location:** `/app/call/[id].tsx`, `/components/recordings/`

**Features:**
- Real-time voice calls
- Video calling
- Call controls (mute, speaker, video toggle)
- Duration tracking
- Recording playback

**Integration:**
- Twilio Voice SDK
- WebRTC for peer-to-peer
- Firebase for call metadata

#### D. Payment & Credits Module
**Location:** `/app/(tabs)/wallet.tsx`, `/components/payment/`

**Features:**
- Credit purchase flow
- Wallet balance display
- Transaction history
- Earnings tracking (for professionals)
- Payment method management

**Components:**
- `AddCardModal.tsx`
- Wallet transaction list
- Credit selection UI

#### E. Professional Profile Module
**Location:** `/app/professional/[id].tsx`

**Features:**
- Detailed professional profiles
- Ratings and reviews
- Specialties and languages
- Availability status
- Response time indicators
- Badges and verifications

#### F. User Profile & Settings
**Location:** `/app/(tabs)/profile.tsx`, `/app/settings/*`

**Screens:**
- Profile overview
- Language settings
- Theme preferences
- Notification settings
- Password management
- Availability settings (for professionals)
- Account management

#### G. Appointments & History
**Location:** `/app/appointments-calendar.tsx`, `/app/call-history/`

**Features:**
- Calendar view for appointments
- Call history with filters
- Blocked users management
- Favorites list
- Appointment reminders

#### H. UI Component Library
**Location:** `/components/ui/`

**Components:**
- `Button.tsx` - Primary/secondary buttons
- `Input.tsx` - Form inputs
- `Card.tsx` - Content cards
- `Header.tsx` - Screen headers
- `PrimaryHeader.tsx` - Navigation header
- `SearchBar.tsx` - Search interface
- `TabButtons.tsx` - Tab navigation
- `ToastStack.tsx` - Toast notifications

#### I. Cross-Cutting Concerns

**Internationalization:**
- **Location:** `/lib/i18n.ts`, `/locales/`
- **Languages:** English, Turkish, Spanish, French, German
- **Implementation:** i18next with React Native

**Theming:**
- **Location:** `/contexts/ThemeContext.tsx`, `/themes/`
- **Features:** Light/Dark mode, system preference detection
- **Implementation:** NativeWind (Tailwind CSS)

**Storage:**
- **Location:** `/lib/storage.ts`
- **Implementation:** AsyncStorage wrapper
- **Use Cases:** User preferences, cache, offline data

**Notifications:**
- **Location:** `/lib/toastService.ts`
- **Types:** Success, error, info, warning
- **Implementation:** react-native-toast-message

### Data Flow

```
User Action
    │
    ▼
App Interface (React Native)
    │
    ▼
Context/State Management
    │
    ├─────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
Firebase Services                    Twilio Services
│                                          │
├─ Authentication                          ├─ Voice Calls
├─ Firestore (User/Professional data)      ├─ Video Calls
├─ Storage (Recordings, Photos)            └─ Call Routing
└─ Cloud Functions (Future)
    │
    ▼
Payment Gateway
│
└─ Credit Transactions
    │
    ▼
Update UI
```

---

## 3. Initial Feature Set

### P0 - MVP Features (✅ Implemented)
- User authentication (Login, Register, OTP)
- Professional browsing (Search, Categories, Profiles)
- Credit system (Wallet, Purchase flow)
- Call history and favorites
- Multi-language support (i18n)
- Theme system (Light/Dark mode)
- Profile management and settings
- Category-based navigation
- Professional profile views
- User blocking functionality

### P1 - Core Features (🟡 In Progress/Verification Needed)
- Real-time calling (Twilio integration)
- Recording playback
- Calendar/Appointments scheduling
- Payment processing (Stripe/Payment gateway)
- Push notifications (Firebase Cloud Messaging)
- In-app notifications

### P2 - Enhancement Features (🔴 Planned)
- In-app messaging system
- Advanced search filters (price range, availability, ratings)
- Professional verification workflow
- Referral and rewards system
- Analytics dashboard (for professionals)
- Review and rating system
- Smart booking/scheduling system
- Platform fees and payout management
- Professional onboarding flow
- KYC/verification for professionals

### P3 - Polish & Optimization (🔴 Future)
- Offline mode support
- Performance optimization (lazy loading, caching)
- Accessibility improvements (WCAG 2.1)
- Advanced analytics and insights
- A/B testing framework
- Video recording support
- Screen sharing during calls
- AI-powered professional recommendations
- Chat transcription and summaries

---

## 4. Directory Layout

### Current Structure

```
/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Bottom tab navigation
│   │   ├── index.tsx             # Home feed
│   │   ├── search.tsx            # Search screen
│   │   ├── people.tsx            # People/connections
│   │   ├── categories.tsx        # Category browser
│   │   ├── wallet.tsx            # Wallet & transactions
│   │   ├── profile.tsx           # User profile
│   │   └── _layout.tsx           # Tab layout
│   ├── auth/                     # Authentication screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── otp.tsx
│   │   ├── forgot-password.tsx
│   │   ├── setup-account.tsx
│   │   └── _layout.tsx
│   ├── settings/                 # Settings screens
│   │   ├── language.tsx
│   │   ├── theme.tsx
│   │   ├── notifications.tsx
│   │   ├── change-password.tsx
│   │   ├── availability.tsx
│   │   └── account.tsx
│   ├── call/
│   │   └── [id].tsx              # Dynamic call screen
│   ├── professional/
│   │   └── [id].tsx              # Professional profile
│   ├── call-history/
│   │   └── index.tsx             # Call history
│   ├── favorites/
│   │   └── index.tsx             # Favorites list
│   ├── index.tsx                 # Root redirect
│   ├── credit-selection.tsx      # Credit packages
│   ├── purchase.tsx              # Purchase flow
│   ├── appointments-calendar.tsx # Calendar view
│   ├── become-professional.tsx   # Professional signup
│   ├── how-it-works.tsx         # Onboarding/info
│   └── +not-found.tsx           # 404 page
│
├── components/                   # React components
│   ├── ui/                       # UI primitives
│   │   ├── headers/
│   │   │   └── PrimaryHeader.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── TabButtons.tsx
│   │   └── ToastStack.tsx
│   ├── listings/                 # Professional listings
│   │   ├── CategoryGrid.tsx
│   │   └── ProfessionalCard.tsx
│   ├── payment/
│   │   └── AddCardModal.tsx
│   ├── filters/
│   │   └── FilterModal.tsx
│   ├── campaigns/
│   │   └── CampaignBanner.tsx
│   ├── recordings/
│   │   └── RecordingPlaybackModal.tsx
│   ├── carousel/
│   │   └── PromotionCarousel.tsx
│   └── profile/
│       └── ShareProfileModal.tsx
│
├── contexts/                     # React contexts
│   └── ThemeContext.tsx          # Theme state management
│
├── hooks/                        # Custom React hooks
│   ├── useFrameworkReady.ts
│   └── useIsMounted.ts
│
├── lib/                          # Services & utilities
│   ├── firebase.ts               # Firebase initialization
│   ├── i18n.ts                   # i18n configuration
│   ├── storage.ts                # AsyncStorage wrapper
│   └── toastService.ts           # Toast notifications
│
├── locales/                      # i18n translations
│   ├── en.json                   # English
│   ├── tr.json                   # Turkish
│   ├── es.json                   # Spanish
│   ├── fr.json                   # French
│   └── de.json                   # German
│
├── mockData/                     # Development mock data
│   ├── professionals.ts          # Professional data & types
│   └── user.ts                   # User mock data
│
├── themes/                       # Theme configuration
│   └── index.ts                  # Theme definitions
│
├── assets/                       # Static assets
│   └── images/                   # App images & icons
│
├── firebase/                     # Firebase config files
│   ├── android/
│   │   └── google-services.json
│   └── ios/
│       └── GoogleService-Info.plist
│
├── android/                      # Android native code
├── ios/                          # iOS native code
│
├── docs/                         # 📁 Documentation
│   ├── BLUEPRINT.md              # This file (EN)
│   ├── BLUEPRINT.tr.md           # This file (TR)
│   ├── DESIGN.md                 # Design system (EN)
│   ├── DESIGN.tr.md              # Design system (TR)
│   ├── session-notes/            # Development session logs
│   │   ├── 2025-11-15-init.md    # Initial session (EN)
│   │   └── 2025-11-15-init.tr.md # Initial session (TR)
│   └── architecture/             # (Future) Architecture docs
│
├── tasks/                        # 📁 Task management
│   ├── todo.md                   # Active tasks (EN)
│   └── todo.tr.md                # Active tasks (TR)
│
├── CLAUDE.md                     # AI assistant rules (EN)
├── CLAUDE.tr.md                  # AI assistant rules (TR)
│
├── readme/                       # Setup guides
│   ├── README.md
│   ├── EAS_SETUP.md
│   ├── FIREBASE_SETUP.md
│   ├── IOS_DISTRIBUTION.md
│   ├── TWILIO_VOICE_SETUP.md
│   ├── I18N_SETUP.md
│   └── ANDROID_APK.md
│
├── .vscode/                      # VS Code settings
├── .bolt/                        # Bolt.new config
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config
├── babel.config.js               # Babel config
├── metro.config.js               # Metro bundler config
├── eas.json                      # EAS build config
└── app.json                      # Expo config
```

### Recommended Future Additions

```
├── types/                        # 📁 TypeScript type definitions
│   ├── api.ts                    # API response types
│   ├── models.ts                 # Data models
│   ├── navigation.ts             # Navigation types
│   └── index.ts                  # Type exports
│
├── services/                     # 📁 Service layer (extracted from /lib)
│   ├── api/                      # API clients
│   │   ├── professionals.ts
│   │   ├── calls.ts
│   │   └── payments.ts
│   ├── twilio/                   # Twilio integration
│   │   ├── voice.ts
│   │   └── video.ts
│   └── firebase/                 # Firebase services
│       ├── auth.ts
│       ├── firestore.ts
│       └── storage.ts
│
├── constants/                    # 📁 App-wide constants
│   ├── categories.ts             # Category definitions
│   ├── routes.ts                 # Route constants
│   ├── config.ts                 # App configuration
│   └── colors.ts                 # Color palette
│
└── utils/                        # 📁 Utility functions
    ├── validation.ts             # Form validation
    ├── formatting.ts             # Date, currency formatting
    └── helpers.ts                # General helpers
```

---

## 5. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.79.6 | Mobile app framework |
| **React** | 19.0.0 | UI library |
| **Expo** | 53.0.0 | Development platform |
| **expo-router** | 5.1.7 | File-based routing |
| **TypeScript** | 5.8.3 | Type safety |
| **NativeWind** | 4.1.23 | Tailwind CSS for RN |
| **Tailwind CSS** | 3.3.2 | Utility-first CSS |

### State Management & Hooks

| Technology | Purpose |
|------------|---------|
| **React Context API** | Global state (theme, user) |
| **React Hooks** | Component state & side effects |
| **AsyncStorage** | Local persistence |

### UI & Styling

| Technology | Purpose |
|------------|---------|
| **Lucide React Native** | Icon library |
| **Expo Vector Icons** | Additional icons |
| **React Native Gesture Handler** | Touch gestures |
| **React Native Reanimated** | Smooth animations |
| **React Native SVG** | SVG rendering |
| **Expo Linear Gradient** | Gradient backgrounds |
| **Expo Blur** | Blur effects |

### Backend & Services

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | User auth (email, phone, OAuth) |
| **Firestore** | Real-time database |
| **Firebase Storage** | File storage (recordings, photos) |
| **Firebase Cloud Messaging** | Push notifications (planned) |
| **Twilio Voice/Video** | WebRTC calling |

### Internationalization

| Technology | Purpose |
|------------|---------|
| **i18next** | Translation framework |
| **react-i18next** | React integration |
| **expo-localization** | Device locale detection |

### Development & Build Tools

| Tool | Purpose |
|------|---------|
| **Metro** | JavaScript bundler |
| **Babel** | JavaScript transpiler |
| **EAS (Expo Application Services)** | Cloud builds |
| **TypeScript Compiler** | Type checking |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |

### Native Features

| Feature | Library |
|---------|---------|
| **Camera** | expo-camera |
| **Calendar** | react-native-calendars |
| **QR Codes** | react-native-qrcode-svg |
| **Date/Time Picker** | @react-native-community/datetimepicker |
| **Haptics** | expo-haptics |
| **Web Browser** | expo-web-browser |
| **Splash Screen** | expo-splash-screen |
| **Status Bar** | expo-status-bar |

### Platform Support

- **iOS:** 13.0+
- **Android:** API 24+ (Android 7.0)
- **Node.js:** 18+

---

## 6. Data Models

### Professional

```typescript
interface Professional {
  id: string;
  name: string;
  title: string;
  category: string;
  ratePerMinute: number;
  avatar: string;
  bio: string;
  rating: number;
  totalCalls: number;
  isOnline: boolean;
  isVerified: boolean;
  specialties: string[];
  languages: string[];
  responseTime: string;
  badges: string[];
  isBlocked?: boolean;
}
```

### Category

```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  professionalCount: number;
}
```

**Available Categories:**
1. Business
2. Technology
3. Health
4. Finance
5. Lifestyle
6. Education
7. Design
8. Entertainment
9. Sports
10. Automotive
11. Photography
12. Gaming

### Call History

```typescript
interface CallHistory {
  id: string;
  professionalId: string;
  professional: Professional;
  duration: number; // seconds
  cost: number;
  date: string; // ISO 8601
  type: 'voice' | 'video';
  status: 'completed' | 'missed' | 'cancelled';
  direction?: 'incoming' | 'outgoing';
  isBlocked?: boolean;
}
```

### Wallet Transaction

```typescript
interface WalletTransaction {
  id: string;
  type: 'income' | 'expenses';
  amount: number;
  description: string;
  timestamp: string; // ISO 8601
  professionalId?: string;
  professional?: Professional;
  callerId?: string;
  caller?: Professional;
  status?: 'completed' | 'pending' | 'failed';
  duration?: number; // seconds
}
```

### Notification

```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'call' | 'message' | 'appointment' | 'promotion' | 'payment' | 'system';
  timestamp: string; // ISO 8601
  isRead: boolean;
  professionalId?: string;
  professional?: Professional;
  actionUrl?: string;
}
```

### Blocked User

```typescript
interface BlockedUser {
  id: string;
  userId: string;
  user: Professional;
  blockedAt: string; // ISO 8601
  lastCallDate?: string;
  lastCallDuration?: number; // seconds
}
```

### Promotion

```typescript
interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string; // URL
  ctaText: string;
  gradient: string[]; // RGBA colors
}
```

---

## 7. Development Roadmap

### Phase 1: Foundation & Audit (Week 1-2)
**Status:** 🟡 In Progress

- [x] Create project documentation structure
- [x] Establish Claude Code scaffolding
- [ ] Audit Firebase integration
- [ ] Verify Twilio Voice SDK status
- [ ] Document all API endpoints
- [ ] Create comprehensive TypeScript types
- [ ] Identify mock vs. real data usage

### Phase 2: Core Features (Week 3-6)
**Status:** 🔴 Planned

- [ ] Complete Twilio calling implementation
- [ ] Integrate payment gateway (Stripe)
- [ ] Implement push notifications (FCM)
- [ ] Build recording upload/download system
- [ ] Create appointment scheduling
- [ ] Professional onboarding workflow
- [ ] Review and rating system

### Phase 3: Localization & UX (Week 7-8)
**Status:** 🔴 Planned

- [ ] Complete all translations (ES, FR, DE)
- [ ] Add advanced search filters
- [ ] Implement loading states & skeletons
- [ ] Error boundaries & retry mechanisms
- [ ] Offline mode support
- [ ] Image optimization (lazy loading)
- [ ] Accessibility improvements

### Phase 4: Testing & Quality (Week 9-10)
**Status:** 🔴 Planned

- [ ] Unit tests for utilities
- [ ] Integration tests for critical flows
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Performance testing
- [ ] Security audit
- [ ] Load testing (Firestore)

### Phase 5: Deployment (Week 11-12)
**Status:** 🔴 Planned

- [ ] Configure EAS build profiles
- [ ] iOS App Store setup
- [ ] Google Play Store setup
- [ ] Privacy policy & terms
- [ ] App store assets (screenshots, descriptions)
- [ ] Production testing on devices
- [ ] Soft launch
- [ ] Full public release

### Phase 6: Post-Launch (Ongoing)
**Status:** 🔴 Planned

- [ ] Monitor crash reports
- [ ] User feedback collection
- [ ] Analytics implementation
- [ ] Performance optimization
- [ ] Feature iteration based on usage
- [ ] A/B testing framework

---

## 8. Related Documentation

### Project Documentation
- [Design System](./DESIGN.md) - UI/UX guidelines and design tokens
- [Session Notes](./session-notes/) - Development session logs
- [TODO List](../tasks/todo.md) - Active task tracking

### AI Assistant Guidelines
- [CLAUDE.md](../CLAUDE.md) - Rules and conventions for Claude Code

### Setup Guides (in `/readme/`)
- [README.md](../readme/README.md) - Documentation index
- [EAS Setup](../readme/EAS_SETUP.md) - Expo Application Services
- [Firebase Setup](../readme/FIREBASE_SETUP.md) - Firebase configuration
- [iOS Distribution](../readme/IOS_DISTRIBUTION.md) - iOS build & deploy
- [Android APK](../readme/ANDROID_APK.md) - Android build process
- [Twilio Voice Setup](../readme/TWILIO_VOICE_SETUP.md) - Calling integration
- [i18n Setup](../readme/I18N_SETUP.md) - Internationalization guide

### External Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)
- [NativeWind Documentation](https://www.nativewind.dev/)

---

**Document Maintained By:** Claude Code
**Review Cycle:** Bi-weekly or after major changes
**Feedback:** Update this document as the project evolves
