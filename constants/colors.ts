/**
 * Color constants for consistent use across the app
 * These match the colors defined in tailwind.config.js
 */

export const colors = {
  // Brand colors
  brand: {
    purple: '#2e2461',
    pink: '#d60f83',
  },

  // Social media colors
  social: {
    google: '#4285F4',
    facebook: '#1877F2',
    linkedin: '#0077B5',
  },

  // Gray scale
  gray: {
    muted: '#9E9E9E',
    light: '#E5E5E5',
    light2: '#E5E5E7',
    '200': '#d1d5db',
    '800': '#1f2937',
    '50': '#f4f3f4',
    border: '#e5e7eb', // Gray-200 equivalent for borders
  },

  // Success colors
  success: {
    green: '#10b981',
    light: '#dcfce7',
  },

  // Error colors
  error: {
    red: '#FF6B6B',
    light: '#fee2e2',
  },
  
  // Warning colors
  warning: {
    orange: '#f59e0b', // Amber-500
    light: '#FFF3CD',
  },
  
  // Blue colors
  blue: {
    '500': '#3b82f6',
  },

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Dark mode specific (iOS)
  dark: {
    surface: '#1C1C1E',
    card: '#000000',
    gray: '#2C2C2E',
  },
  
  // Payment provider colors
  payment: {
    stripe: '#635bff',
    paypal: '#0070ba',
  },
  
  // iOS system colors
  ios: {
    blue: '#007AFF',
    green: '#30D158',
  },
} as const;

