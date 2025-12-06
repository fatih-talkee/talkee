# Talkee Design System

**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Language:** English | [Türkçe](./DESIGN.tr.md)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Components](#5-components)
6. [Icons & Imagery](#6-icons--imagery)
7. [Animations & Transitions](#7-animations--transitions)
8. [Accessibility](#8-accessibility)
9. [Platform-Specific Guidelines](#9-platform-specific-guidelines)

---

## 1. Design Principles

### Core Principles

#### **Clarity**
- Clear visual hierarchy
- Intuitive navigation patterns
- Unambiguous action buttons
- Transparent pricing and information

#### **Consistency**
- Unified design language across all screens
- Predictable interaction patterns
- Consistent spacing and alignment
- Standardized color usage

#### **Accessibility**
- WCAG 2.1 Level AA compliance
- Minimum contrast ratio of 4.5:1 for text
- Touch targets minimum 44x44 pts
- Screen reader support

#### **Performance**
- Fast loading times
- Smooth 60fps animations
- Optimized images and assets
- Minimal re-renders

#### **Trust**
- Professional appearance
- Verified badges clearly visible
- Secure payment indicators
- Privacy-conscious design

---

## 2. Color System

### Theme Support

Talkee supports **4 themes**:
1. **Light** (Default)
2. **Dark**
3. **Nature Green**
4. **Ocean Blue**

All themes follow the same color token structure for consistency.

### Light Theme (Default)

#### Primary Colors
```typescript
background:      #ffffff  // Main background
surface:         #f8fafc  // Card surfaces
card:            #ffffff  // Card backgrounds

primary:         #007AFF  // Primary actions
primaryLight:    #3b82f6  // Hover states
primaryDark:     #1d4ed8  // Active states
```

#### Brand Colors
```typescript
brandPink:       #682d6e  // Brand identity
pink:            #2d2561  // Secondary brand
pinkTwo:         #682d6e  // Accent brand
```

#### Text Colors
```typescript
text:            #2d2561  // Primary text
textSecondary:   #374151  // Secondary text
textMuted:       #64748b  // Muted text
```

#### Status Colors
```typescript
success:         #10b981  // Success states
warning:         #f59e0b  // Warning states
error:           #ef4444  // Error states
info:            #3b82f6  // Info states
```

#### Utility Colors
```typescript
border:          #e6c3ea  // Borders
divider:         #e6c3ea  // Dividers
overlay:         rgba(0, 0, 0, 0.0)  // Modal overlays
disabled:        #9ca3af  // Disabled elements
```

#### Tab Bar Colors
```typescript
tabBarBackground: #ffffff
tabBarBorder:     #e5e7eb
tabBarActive:     #682d6e  // Active tab
tabBarInactive:   #64748b  // Inactive tab
```

### Dark Theme

#### Primary Colors
```typescript
background:      #1C1C1E  // iOS dark gray
surface:         #2C2C2E  // Elevated surface
card:            #2C2C2E  // Card backgrounds

primary:         #007AFF  // iOS blue
primaryLight:    #409CFF
primaryDark:     #0051D5
```

#### Text Colors
```typescript
text:            #FFFFFF  // Primary text
textSecondary:   #E5E5E7  // Secondary text
textMuted:       #9E9E9E  // Muted text
creditColor:     #ffffff  // Credit display
```

#### Status Colors
```typescript
success:         #30D158  // iOS green
warning:         #FFD60A  // iOS yellow
error:           #FF453A  // iOS red
info:            #64D2FF  // iOS blue
```

#### Utility Colors
```typescript
border:          rgba(255, 255, 255, 0.1)
divider:         rgba(255, 255, 255, 0.05)
overlay:         rgba(0, 0, 0, 0.7)
disabled:        #8E8E93
```

### Color Usage Guidelines

#### Do's ✅
- Use `primary` for main CTAs (Call Now, Purchase Credits)
- Use `brandPink` for brand elements (logos, active tabs)
- Use status colors (success, error, warning) consistently
- Maintain sufficient contrast for text readability
- Use `surface` for elevated cards

#### Don'ts ❌
- Don't use brand colors for error/success states
- Don't mix theme colors arbitrarily
- Don't use low contrast color combinations
- Don't hardcode hex values (use theme tokens)

---

## 3. Typography

### Font Family

**Primary Font:** Inter

```typescript
fontFamily: {
  regular: 'Inter-Regular',
  medium:  'Inter-Medium',
  bold:    'Inter-Bold',
}
```

### Type Scale

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **Display** | 32px | Bold | 40px | Page titles |
| **H1** | 28px | Bold | 36px | Section headers |
| **H2** | 24px | Bold | 32px | Card headers |
| **H3** | 20px | Bold | 28px | Subheadings |
| **H4** | 18px | Medium | 24px | List headers |
| **Body Large** | 17px | Regular | 24px | Prominent body text |
| **Body** | 15px | Regular | 22px | Default body text |
| **Body Small** | 13px | Regular | 18px | Secondary info |
| **Caption** | 12px | Regular | 16px | Labels, timestamps |
| **Button** | 16px | Medium | 24px | Button labels |

### Typography Examples

#### Professional Name
```
Font: Inter-Bold
Size: 20px
Color: theme.colors.text
```

#### Professional Title
```
Font: Inter-Regular
Size: 15px
Color: theme.colors.textSecondary
```

#### Rate Display
```
Font: Inter-Bold
Size: 18px
Color: theme.colors.primary
```

#### Category Labels
```
Font: Inter-Medium
Size: 14px
Color: theme.colors.text
```

### Text Hierarchy Best Practices

1. **Maximum 3 levels** of hierarchy per screen
2. **Contrast through size and weight**, not just color
3. **Consistent spacing** between text elements
4. **Left-align** for LTR languages (English, French, German)
5. **Right-align** for RTL languages (future consideration)

---

## 4. Spacing & Layout

### Spacing Scale

Based on **4px** base unit:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Minimal spacing, icon padding |
| `sm` | 8px | Compact element spacing |
| `md` | 16px | Default element spacing |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Large section spacing |
| `2xl` | 48px | Page section spacing |
| `3xl` | 64px | Major section spacing |

### Layout Grid

- **Mobile (< 768px):** 16px side margins
- **Tablet (≥ 768px):** 24px side margins
- **Column gap:** 16px
- **Row gap:** 16px

### Container Widths

```typescript
maxWidth: {
  sm:  640px,  // Small devices
  md:  768px,  // Tablets
  lg:  1024px, // Desktops (future web)
  xl:  1280px, // Large desktops
}
```

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0px | Sharp corners |
| `sm` | 4px | Buttons, inputs |
| `md` | 8px | Cards, modals |
| `lg` | 12px | Large cards |
| `xl` | 16px | Featured cards |
| `2xl` | 24px | Hero elements |
| `full` | 9999px | Circular elements (avatars, badges) |

### Safe Areas

- **iOS:** Respect notch and home indicator
- **Android:** Respect status bar and navigation bar
- Use `SafeAreaView` from `react-native-safe-area-context`

---

## 5. Components

### Button Component

#### Primary Button
```typescript
Background: theme.colors.primary
Text: #FFFFFF
Height: 48px
Padding: 12px 24px
Border Radius: 8px
Font: Inter-Medium, 16px
```

**Usage:** Main CTAs (Call Now, Purchase, Submit)

#### Secondary Button
```typescript
Background: transparent
Border: 1px solid theme.colors.border
Text: theme.colors.text
Height: 48px
Padding: 12px 24px
Border Radius: 8px
```

**Usage:** Cancel, Go Back, Alternative actions

#### Small Button
```typescript
Height: 36px
Padding: 8px 16px
Font Size: 14px
```

**Usage:** Inline actions, filter chips

#### Disabled State
```typescript
Background: theme.colors.disabled
Text: rgba(255, 255, 255, 0.5)
Opacity: 0.5
```

### Card Component

```typescript
Background: theme.colors.card
Border Radius: 12px
Padding: 16px
Shadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3, // Android
}
```

**Variants:**
- **Professional Card:** Includes avatar, name, rating, rate
- **Category Card:** Icon, name, count
- **Transaction Card:** Icon, description, amount

### Input Component

```typescript
Background: theme.colors.surface (light) / theme.colors.card (dark)
Border: 1px solid theme.colors.border
Border Radius: 8px
Height: 48px
Padding: 12px 16px
Font: Inter-Regular, 15px
Placeholder Color: theme.colors.textMuted
```

**States:**
- **Focus:** Border color changes to `theme.colors.primary`
- **Error:** Border color changes to `theme.colors.error`
- **Disabled:** Background opacity 0.5

### Avatar Component

```typescript
Size: {
  sm: 32px,
  md: 48px,
  lg: 64px,
  xl: 96px,
}
Border Radius: full (circular)
Border: 2px solid theme.colors.border (optional)
```

**Online Indicator:**
- Position: Bottom-right
- Size: 12px
- Color: `#30D158` (green)
- Border: 2px solid background

### Badge Component

```typescript
Background: theme.colors.primary / theme.colors.success
Padding: 4px 8px
Border Radius: 12px (pill shape)
Font: Inter-Medium, 11px
Text Color: #FFFFFF
```

**Variants:**
- **Verified:** Blue checkmark icon
- **Top Rated:** Star icon
- **Quick Response:** Lightning icon

### Tab Bar

```typescript
Height: 60px
Background: theme.colors.tabBarBackground
Border Top: 1px solid theme.colors.tabBarBorder
Padding: 8px 0
```

**Tab Item:**
```typescript
Icon Size: 24px
Label Font: Inter-Regular, 11px
Active Color: theme.colors.tabBarActive
Inactive Color: theme.colors.tabBarInactive
```

### Modal Component

```typescript
Background: theme.colors.card
Border Radius: 16px 16px 0 0 (bottom sheet)
Padding: 24px
Max Height: 80% screen height
```

**Backdrop:**
```typescript
Background: theme.colors.overlay
Opacity: 0.7
Blur: 10px (iOS only)
```

### Toast Notification

```typescript
Position: Top (safe area)
Background: {
  success: theme.colors.success,
  error: theme.colors.error,
  info: theme.colors.info,
  warning: theme.colors.warning,
}
Text Color: #FFFFFF
Padding: 16px
Border Radius: 12px
Shadow: elevation 5
Duration: 3000ms (auto-dismiss)
```

---

## 6. Icons & Imagery

### Icon System

**Primary Icon Library:** Lucide React Native

**Icon Sizes:**
- `xs`: 16px
- `sm`: 20px
- `md`: 24px
- `lg`: 32px
- `xl`: 48px

**Icon Colors:**
- Use `theme.colors.text` for default icons
- Use `theme.colors.textMuted` for secondary icons
- Use semantic colors for status icons

### Category Icons

| Category | Icon | Color |
|----------|------|-------|
| Business | `briefcase` | #007AFF |
| Technology | `smartphone` | #5856D6 |
| Health | `heart` | #30D158 |
| Finance | `dollar-sign` | #FFD60A |
| Lifestyle | `star` | #FF9F0A |
| Education | `book` | #64D2FF |
| Design | `palette` | #BF5AF2 |
| Entertainment | `music` | #FF375F |
| Sports | `dumbbell` | #32D74B |
| Automotive | `car` | #8E8E93 |
| Photography | `camera` | #FF6B35 |
| Gaming | `gamepad` | #5AC8FA |

### Avatar Images

**Requirements:**
- Minimum resolution: 256x256px
- Aspect ratio: 1:1 (square)
- Format: JPEG or PNG
- Max file size: 500KB
- Quality: 85%

**Placeholder:**
- Use initials (first letter of first and last name)
- Background: `theme.colors.primary`
- Text: `#FFFFFF`

### Professional Images

**Profile Photos:**
- Minimum resolution: 512x512px
- Professional appearance
- Clear face visibility
- Neutral background preferred

**Promotion Banners:**
- Aspect ratio: 16:9
- Minimum resolution: 800x450px
- Overlay gradient for text readability

---

## 7. Animations & Transitions

### Animation Principles

1. **Purposeful:** Every animation has a reason
2. **Fast:** Transitions should be quick (200-300ms)
3. **Natural:** Use easing functions for organic feel
4. **Consistent:** Same elements animate the same way

### Standard Durations

| Duration | Usage |
|----------|-------|
| **100ms** | Micro-interactions (button press) |
| **200ms** | Standard transitions (page slide) |
| **300ms** | Moderate animations (modal appear) |
| **500ms** | Complex animations (carousel slide) |

### Easing Functions

```typescript
easing: {
  easeOut:    'cubic-bezier(0.0, 0.0, 0.2, 1)',  // Deceleration
  easeIn:     'cubic-bezier(0.4, 0.0, 1, 1)',    // Acceleration
  easeInOut:  'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Standard
  spring:     { damping: 20, stiffness: 300 },   // Spring physics
}
```

### Common Animations

#### Page Transition
```typescript
Type: Slide
Direction: Right to Left (forward), Left to Right (back)
Duration: 200ms
Easing: easeInOut
```

#### Modal Appear
```typescript
Type: Fade + Scale
Initial: opacity 0, scale 0.95
Final: opacity 1, scale 1
Duration: 300ms
Easing: easeOut
```

#### Button Press
```typescript
Type: Scale
Press: scale 0.95
Release: scale 1
Duration: 100ms
```

#### Toast Notification
```typescript
Enter: slideInDown (from top)
Exit: fadeOut
Duration: 300ms
```

#### Loading Spinner
```typescript
Type: Rotate
Duration: 1000ms (continuous)
Easing: linear
```

### Haptic Feedback

Use `expo-haptics` for tactile feedback:

```typescript
import * as Haptics from 'expo-haptics';

// Light tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

**Usage:**
- Button press: Light impact
- Toggle switch: Medium impact
- Purchase success: Success notification
- Error state: Error notification

---

## 8. Accessibility

### WCAG 2.1 Level AA Compliance

#### Color Contrast

**Minimum Ratios:**
- Normal text (< 18px): 4.5:1
- Large text (≥ 18px): 3:1
- UI components: 3:1

**Tools:**
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Test all text/background combinations

#### Touch Targets

**Minimum Size:** 44x44 points (iOS HIG)

**Best Practices:**
- Provide adequate spacing between tappable elements
- Avoid clustering small buttons
- Use padding to increase touch area

#### Screen Reader Support

**Accessibility Labels:**
```typescript
<Button
  accessibilityLabel="Call Dr. Sarah Chen"
  accessibilityHint="Initiates a voice call with Dr. Sarah Chen"
  accessibilityRole="button"
>
  Call Now
</Button>
```

**Image Descriptions:**
```typescript
<Image
  source={{ uri: professional.avatar }}
  accessibilityLabel={`Profile photo of ${professional.name}`}
/>
```

**Dynamic Content:**
```typescript
<Text accessibilityLiveRegion="polite">
  {`Balance: $${balance}`}
</Text>
```

#### Focus Management

- Ensure logical tab order
- Provide visible focus indicators
- Return focus after modal dismissal

#### Reduced Motion

Respect `prefers-reduced-motion`:

```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

// Conditionally disable animations
{!reduceMotion && <AnimatedComponent />}
```

---

## 9. Platform-Specific Guidelines

### iOS Guidelines

#### Navigation
- Use native navigation patterns (swipe to go back)
- Place primary actions in top-right
- Use SF Symbols when appropriate

#### Tab Bar
- Bottom tab bar (iOS standard)
- Icon + label for each tab
- Active state uses brand color

#### Modals
- Bottom sheet style for most modals
- Full screen for critical flows (onboarding)
- Dismiss via swipe down or close button

#### Status Bar
- Light content on dark backgrounds
- Dark content on light backgrounds
- Auto-hide during calls

### Android Guidelines

#### Navigation
- Use Material Design patterns
- Provide back button in header
- Support system back button

#### Tab Bar
- Bottom navigation (Material Design)
- Icon + label (same as iOS for consistency)
- Ripple effect on press

#### Modals
- Center-aligned modals
- Backdrop dismissal
- Scrim overlay (50% opacity)

#### Status Bar
- Translucent status bar
- Respect system navigation bar
- Adjust for different screen sizes

### Cross-Platform Consistency

**Maintain Consistent:**
- Color schemes
- Typography scale
- Component behavior
- Iconography
- Spacing system

**Platform-Specific:**
- Navigation transitions
- Modal presentations
- System UI (status bar, navigation bar)
- Native controls (date picker, action sheet)

---

## Design Resources

### Figma Files
- [To be created] Main design file
- [To be created] Component library
- [To be created] Icon set

### Color Palettes
- Export from `/themes/index.ts`
- Available in Figma and code

### Typography
- Inter font family ([Google Fonts](https://fonts.google.com/specimen/Inter))
- Weights: Regular (400), Medium (500), Bold (700)

### Icons
- Lucide React Native ([Documentation](https://lucide.dev/))
- Expo Vector Icons ([Documentation](https://icons.expo.fyi/))

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-15 | Initial design system documentation |

---

**Maintained By:** Design & Development Team
**Review Cycle:** Monthly or after major UI changes
**Feedback:** Submit design improvement suggestions via GitHub issues
