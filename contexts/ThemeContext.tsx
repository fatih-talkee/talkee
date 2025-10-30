import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, Theme, ThemeName } from '@/themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  toggleTheme: () => void;
  availableThemes: { name: ThemeName; displayName: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('dark');

  const availableThemes = Object.entries(themes).map(([name, theme]) => ({
    name: name as ThemeName,
    displayName: theme.displayName,
  }));

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && savedTheme in themes) {
        setCurrentTheme(savedTheme as ThemeName);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const saveTheme = async (themeName: ThemeName) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const setTheme = (themeName: ThemeName) => {
    setCurrentTheme(themeName);
    saveTheme(themeName);
  };

  const toggleTheme = () => {
    const themeNames = Object.keys(themes) as ThemeName[];
    const currentIndex = themeNames.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    setTheme(themeNames[nextIndex]);
  };

  const value: ThemeContextType = {
    theme: themes[currentTheme],
    themeName: currentTheme,
    setTheme,
    toggleTheme,
    availableThemes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}