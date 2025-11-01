export interface Theme {
  name: string;
  displayName: string;
  colors: {
    // Background colors
    background: string;
    surface: string;
    card: string;

    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;

    // Primary colors
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Accent colors
    accent: string;
    accentLight: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Border and divider colors
    border: string;
    divider: string;

    // Interactive states
    overlay: string;
    disabled: string;

    // Tab bar
    tabBarBackground: string;
    tabBarBorder: string;
    tabBarActive: string;
    tabBarInactive: string;

    // Brand colors
    brandPink: string;

    // Additional colors
    pink?: string;
    pinkTwo?: string;
    creditColor?: string;
  };
}

export const lightTheme: Theme = {
  name: 'light',
  displayName: 'Light',
  colors: {
    background: '# ',
    surface: '#f8fafc',

    card: '#ffffff',

    text: '#2d2561',
    textSecondary: '#374151',
    textMuted: '#64748b',

    primary: '#007AFF',
    primaryLight: '#3b82f6',
    primaryDark: '#1d4ed8',

    pink: '#2d2561',
    pinkTwo: '#682d6e',

    accent: '#f59e0b',
    accentLight: '#fef3c7',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    border: '#e6c3ea',
    divider: '#e6c3ea',

    overlay: 'rgba(0, 0, 0, 0.0)',
    disabled: '#9ca3af',

    tabBarBackground: '#ffffff',
    tabBarBorder: '#e5e7eb',
    tabBarInactive: '#64748b',

    brandPink: '#d60f83',
    tabBarActive: '#d60f83', // Same as brandPink
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  displayName: 'Dark',
  colors: {
    background: '#000000',
    surface: '#2C2C2E',
    card: '#2C2C2E',

    creditColor: '#ffffff',

    text: '#FFFFFF',
    textSecondary: '#E5E5E7',
    textMuted: '#9E9E9E',

    primary: '#007AFF',
    primaryLight: '#409CFF',
    primaryDark: '#0051D5',

    pinkTwo: '#007AFF',

    accent: '#FFD60A',
    accentLight: '#FFF3CD',

    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
    info: '#64D2FF',

    border: 'rgba(255, 255, 255, 0.1)',
    divider: 'rgba(255, 255, 255, 0.05)',

    overlay: 'rgba(0, 0, 0, 0.7)',
    disabled: '#8E8E93',

    tabBarBackground: '#2C2C2E',
    tabBarBorder: 'rgb(216, 216, 216)',
    tabBarActive: '#007AFF',
    tabBarInactive: '#8E8E93',

    brandPink: '#d60f83',
  },
};

export const greenTheme: Theme = {
  name: 'green',
  displayName: 'Nature Green',
  colors: {
    background: '#f0fdf4',
    surface: '#dcfce7',
    card: '#ffffff',

    creditColor: '#ffffff',

    text: '#14532d',
    textSecondary: '#166534',
    textMuted: '#4ade80',

    primary: '#16a34a',
    primaryLight: '#22c55e',
    primaryDark: '#15803d',

    accent: '#eab308',
    accentLight: '#fef3c7',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    border: '#bbf7d0',
    divider: '#f0fdf4',

    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#9ca3af',

    tabBarBackground: '#ffffff',
    tabBarBorder: '#bbf7d0',
    tabBarActive: '#16a34a',
    tabBarInactive: '#4ade80',

    brandPink: '#d60f83',
  },
};

export const blueTheme: Theme = {
  name: 'blue',
  displayName: 'Ocean Blue',
  colors: {
    background: '#f0f9ff',
    surface: '#e0f2fe',
    card: '#ffffff',

    text: '#0c4a6e',
    textSecondary: '#075985',
    textMuted: '#0284c7',

    primary: '#0284c7',
    primaryLight: '#0ea5e9',
    primaryDark: '#0369a1',

    accent: '#f59e0b',
    accentLight: '#fef3c7',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    border: '#bae6fd',
    divider: '#f0f9ff',

    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#9ca3af',

    tabBarBackground: '#ffffff',
    tabBarBorder: '#bae6fd',
    tabBarActive: '#0284c7',
    tabBarInactive: '#0284c7',

    brandPink: '#d60f83',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  green: greenTheme,
  blue: blueTheme,
};

export type ThemeName = keyof typeof themes;
