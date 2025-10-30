import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function AuthLayout() {
  return (
    <>
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Sign Up',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="otp"
        options={{
          title: 'OTP',
          headerShown: false,
        }}
      />
    </Stack>
    <Toast />
    </>
  );
}
