import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Chrome as Home, Wallet, Search, User } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Android için bottom padding'i safe area inset'e göre ayarla
  // iOS için de safe area inset kullan ama minimum 8px
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 8)
      : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: Platform.OS === 'android' ? 70 + (bottomPadding - 8) : 70,
          // shiny upward shadow/elevation
          ...(Platform.OS === 'web'
            ? { boxShadow: '0px -8px 16px rgba(0,0,0,0.08)' }
            : {
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -8 },
                elevation: 8,
              }),
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Home size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => (
            <Wallet size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <Search size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <User size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
