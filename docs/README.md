# Talkee

**Professional Consultation Marketplace**

[![React Native](https://img.shields.io/badge/React%20Native-0.79.6-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.0-blue.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Language:** English | [Türkçe](./README.tr.md)

---

## About

Talkee is a cross-platform mobile application that connects users with verified professionals for paid voice and video consultations. Built with React Native and Expo, Talkee provides seamless access to expert advice across 12+ professional categories.

### Key Features

- 🔐 **Secure Authentication** - Email, phone, and OAuth login
- 👥 **Professional Marketplace** - Browse and search verified experts
- 💬 **Real-Time Calling** - Voice and video consultations via Twilio
- 💳 **Credit System** - Flexible pay-per-minute pricing
- 🌍 **Multi-Language** - 5 languages supported (EN, TR, ES, FR, DE)
- 🎨 **4 Themes** - Light, Dark, Nature Green, Ocean Blue
- 📅 **Appointment Scheduling** - Book and manage consultations
- ⭐ **Rating & Reviews** - Rate professionals after each call
- 🔔 **Push Notifications** - Stay updated with Firebase Cloud Messaging
- 📊 **Analytics Dashboard** - For professionals to track earnings

---

## Technology Stack

### Frontend
- **React Native** 0.79.6
- **Expo** SDK 53
- **TypeScript** 5.8.3
- **NativeWind** 4.1.23 (Tailwind CSS for React Native)
- **expo-router** 5.1.7 (File-based routing)

### Backend & Services
- **Firebase** (Authentication, Firestore, Storage, Cloud Messaging)
- **Twilio** (Voice & Video calling)
- **Stripe** (Payment processing - planned)

### UI & Styling
- **Lucide React Native** (Icons)
- **React Native Reanimated** (Animations)
- **i18next** (Internationalization)

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Expo CLI** (installed globally)
- **iOS Simulator** (macOS only) or **Android Studio**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nedovich/TalkeeNedovich.git
   cd TalkeeNedovich
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Follow [Firebase Setup Guide](./readme/FIREBASE_SETUP.md)
   - Add `google-services.json` (Android) to `/firebase/android/`
   - Add `GoogleService-Info.plist` (iOS) to `/firebase/ios/`

4. **Set up Twilio** (Optional for development)
   - Follow [Twilio Voice Setup Guide](./readme/TWILIO_VOICE_SETUP.md)

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on platforms**
   ```bash
   # iOS (macOS only)
   npm run ios

   # Android
   npm run android
   ```

---

## Documentation

### Project Documentation
- [📘 BLUEPRINT](./docs/BLUEPRINT.md) - Project architecture and roadmap
- [🎨 DESIGN SYSTEM](./docs/DESIGN.md) - UI/UX guidelines and design tokens
- [🤖 CLAUDE.md](./CLAUDE.md) - AI assistant development guidelines
- [✅ TODO LIST](./tasks/todo.md) - Active tasks and priorities
- [📝 SESSION NOTES](./docs/session-notes/) - Development session logs

### Setup Guides
- [EAS Setup](./readme/EAS_SETUP.md) - Expo Application Services
- [Firebase Setup](./readme/FIREBASE_SETUP.md) - Firebase configuration
- [iOS Distribution](./readme/IOS_DISTRIBUTION.md) - iOS build & deploy
- [Android APK](./readme/ANDROID_APK.md) - Android build process
- [Twilio Voice Setup](./readme/TWILIO_VOICE_SETUP.md) - Calling integration
- [i18n Setup](./readme/I18N_SETUP.md) - Internationalization guide

---

## Project Structure

```
/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Bottom tab navigation
│   ├── auth/              # Authentication screens
│   ├── settings/          # Settings screens
│   └── ...
├── components/            # React components
│   ├── ui/               # UI primitives
│   ├── listings/         # Professional listings
│   └── ...
├── docs/                 # Documentation
│   ├── BLUEPRINT.md      # Project architecture
│   ├── DESIGN.md         # Design system
│   └── session-notes/    # Development logs
├── tasks/                # Task management
│   └── todo.md           # Active tasks
├── lib/                  # Services & utilities
├── locales/              # i18n translations
├── themes/               # Theme configurations
├── mockData/             # Development mock data
└── CLAUDE.md             # AI assistant guidelines
```

---

## Development

### Code Style

- **TypeScript strict mode** enabled
- **NativeWind** for styling (Tailwind CSS)
- **Mandatory i18n** for all user-facing text
- **Path aliases** (@/) for imports
- **Named exports** preferred over default exports

### Coding Guidelines

See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines including:
- Safe edit zones
- Forbidden zones
- Coding conventions
- Testing requirements
- Git workflow

### Running Tests

```bash
# Lint
npm run lint

# TypeScript check
npx tsc --noEmit

# Run on both platforms
npm run ios
npm run android
```

---

## Build & Deploy

### Development Build

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Production Build (EAS)

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

See [EAS Setup Guide](./readme/EAS_SETUP.md) for detailed instructions.

---

## Contributing

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes following [CLAUDE.md](./CLAUDE.md) guidelines
3. Test on both iOS and Android
4. Run linter: `npm run lint`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
6. Push and create a pull request

### Commit Message Format

```
type(scope): subject

feat(auth): add forgot password functionality
fix(payment): resolve credit purchase crash on Android
docs(readme): update Firebase setup instructions
```

---

## Roadmap

### Phase 1: Foundation (✅ Completed)
- [x] Project setup and documentation
- [x] UI/UX design system
- [x] Authentication flow UI
- [x] Professional browsing
- [x] Multi-language support

### Phase 2: Core Features (🚧 In Progress)
- [ ] Firebase integration (Auth, Firestore, Storage)
- [ ] Twilio Voice/Video calling
- [ ] Stripe payment gateway
- [ ] Push notifications (FCM)
- [ ] Appointment scheduling

### Phase 3: Enhancement (📋 Planned)
- [ ] In-app messaging
- [ ] Advanced search filters
- [ ] Professional verification workflow
- [ ] Review & rating system
- [ ] Analytics dashboard

See [TODO.md](./tasks/todo.md) for detailed task list.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation:** [/docs](./docs/)
- **Issues:** [GitHub Issues](https://github.com/Nedovich/TalkeeNedovich/issues)
- **Expo Docs:** [docs.expo.dev](https://docs.expo.dev/)
- **React Native Docs:** [reactnative.dev](https://reactnative.dev/)

---

## Acknowledgments

- Built with [Expo](https://expo.dev/)
- Styled with [NativeWind](https://www.nativewind.dev/)
- Icons from [Lucide](https://lucide.dev/)
- Firebase by [Google](https://firebase.google.com/)
- Calling powered by [Twilio](https://www.twilio.com/)

---

**Made with ❤️ by the Talkee Team**
