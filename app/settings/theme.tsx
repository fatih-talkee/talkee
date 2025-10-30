import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Check, Palette } from 'lucide-react-native';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeSettingsScreen() {
  const { theme, themeName, setTheme, availableThemes } = useTheme();

  const getThemePreview = (name: string) => {
    const themeColors = {
      light: ['#ffffff', '#f8fafc', '#007AFF'],
      dark: ['#1C1C1E', '#2C2C2E', '#007AFF'],
      green: ['#f0fdf4', '#dcfce7', '#16a34a'],
      blue: ['#f0f9ff', '#e0f2fe', '#0284c7'],
    };
    return themeColors[name as keyof typeof themeColors] || themeColors.dark;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Header 
        title="Theme Settings"
        leftButton={
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.colors.card }]}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Choose Theme</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.colors.textMuted }]}>
            Select your preferred color scheme. Your choice will be saved and applied across the entire app.
          </Text>
        </View>

        <Card style={[styles.themesCard, { backgroundColor: theme.colors.card }]}>
          {availableThemes.map((themeOption, index) => {
            const isSelected = themeName === themeOption.name;
            const previewColors = getThemePreview(themeOption.name);
            
            return (
              <TouchableOpacity
                key={themeOption.name}
                style={[
                  styles.themeOption,
                  index === availableThemes.length - 1 && styles.lastThemeOption,
                  { borderBottomColor: theme.colors.divider }
                ]}
                onPress={() => setTheme(themeOption.name)}
              >
                <View style={styles.themeLeft}>
                  <View style={styles.themePreview}>
                    <View style={[styles.previewColor, { backgroundColor: previewColors[0] }]} />
                    <View style={[styles.previewColor, { backgroundColor: previewColors[1] }]} />
                    <View style={[styles.previewColor, { backgroundColor: previewColors[2] }]} />
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeName, { color: theme.colors.text }]}>
                      {themeOption.displayName}
                    </Text>
                    <Text style={[styles.themeDescription, { color: theme.colors.textMuted }]}>
                      {getThemeDescription(themeOption.name)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.themeRight}>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
                      <Check size={16} color="#ffffff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Card style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoHeader}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Theme Information</Text>
          </View>
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            • Themes are automatically saved to your device{'\n'}
            • Changes apply instantly across all screens{'\n'}
            • Your preference syncs when you reinstall the app{'\n'}
            • Some themes may affect readability in different lighting conditions
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function getThemeDescription(themeName: string): string {
  const descriptions = {
    light: 'Clean and bright interface',
    dark: 'Easy on the eyes in low light',
    green: 'Nature-inspired calming colors',
    blue: 'Professional ocean-inspired palette',
  };
  return descriptions[themeName as keyof typeof descriptions] || 'Custom color scheme';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  themesCard: {
    padding: 0,
    marginBottom: 24,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastThemeOption: {
    borderBottomWidth: 0,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themePreview: {
    flexDirection: 'row',
    marginRight: 16,
  },
  previewColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  themeRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginBottom: 40,
  },
  infoHeader: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
});