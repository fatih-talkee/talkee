import React from 'react';
import { Stack } from 'expo-router';
import { StandardProfileView } from '@/components/profile/StandardProfileView';

export default function ProfileSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StandardProfileView showBack={true} />
    </>
  );
}
