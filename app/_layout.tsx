import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useFonts } from 'expo-font';
import Toast from 'react-native-toast-message';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { initI18n } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

// Toast configuration component that uses theme
function ToastConfig() {
  const { theme } = useTheme();

  const toastConfig = {
    success: ({ text1, text2 }: any) => (
      <View style={{
        minHeight: 50,
        width: '92%',
        backgroundColor: theme.colors.success,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter-Bold' }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4, lineHeight: 18 }}>
              {text2}
            </Text>
          )}
        </View>
      </View>
    ),
    error: ({ text1, text2 }: any) => (
      <View style={{
        minHeight: 50,
        width: '92%',
        backgroundColor: theme.colors.error,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter-Bold' }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4, lineHeight: 18 }}>
              {text2}
            </Text>
          )}
        </View>
      </View>
    ),
    warning: ({ text1, text2 }: any) => (
      <View style={{
        minHeight: 50,
        width: '92%',
        backgroundColor: theme.colors.warning,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#1C1C1E', fontSize: 15, fontFamily: 'Inter-Bold' }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{ color: '#1C1C1E', fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4, lineHeight: 18 }}>
              {text2}
            </Text>
          )}
        </View>
      </View>
    ),
    info: ({ text1, text2 }: any) => (
      <View style={{
        minHeight: 50,
        width: '92%',
        backgroundColor: theme.colors.info,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter-Bold' }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4, lineHeight: 18 }}>
              {text2}
            </Text>
          )}
        </View>
      </View>
    ),
  };

  return <Toast config={toastConfig} />;
}

export default function RootLayout() {
  useFrameworkReady();
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initI18n();
      if (mounted) setI18nReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="become-professional" />
        <Stack.Screen name="appointments-calendar" />
        <Stack.Screen name="call-review/[id]" />
        <Stack.Screen name="credit-selection" />
        <Stack.Screen name="purchase" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="wallet-history" />
        <Stack.Screen name="blocked-users" />
        <Stack.Screen name="how-it-works" />
        <Stack.Screen name="help" />
        <Stack.Screen name="settings/theme" />
        <Stack.Screen name="settings/language" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/change-password" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" translucent={false} />
      <ToastConfig />
    </ThemeProvider>
  );
}
