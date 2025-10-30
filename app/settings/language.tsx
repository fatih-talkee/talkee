import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { setLanguage } from '@/lib/i18n';
import { ChevronLeft, Languages, Check } from 'lucide-react-native';

export default function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <Header showLogo />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Languages size={20} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('language.choose_title')}
            </Text>
          </View>
          <Text
            style={[
              styles.sectionDescription,
              { color: theme.colors.textMuted },
            ]}
          >
            {t('language.choose_description')}
          </Text>
        </View>
        <Card style={styles.sectionCard}>
          <View
            style={[styles.langList, { backgroundColor: theme.colors.card }]}
          >
            {(() => {
              const resources = (i18n.options?.resources as any) || {};
              const codes = Object.keys(resources);
              const labels =
                (t('language.names', { returnObjects: true }) as Record<
                  string,
                  string
                >) || {};
              return codes.map((code, idx) => {
                const selected = i18n.language.startsWith(code);
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[
                      styles.langRow,
                      idx < codes.length - 1 && {
                        borderBottomColor: theme.colors.border,
                        borderBottomWidth: 2,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.langLabel, { color: theme.colors.text }]}
                    >
                      {labels[code] ?? code.toUpperCase()}
                    </Text>
                    {selected ? (
                      <View
                        style={[
                          styles.checkFilled,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Check size={16} color={'#ffffff'} />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.radio,
                          { borderColor: theme.colors.border },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              });
            })()}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    borderRadius: 16,
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
  helper: {
    fontSize: 12,
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
  },
  langList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  langRow: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  checkFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginTop: 16,
  },
  previewText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
