// Temporary type declarations to allow className prop until we convert to style props
import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  
  interface TextProps {
    className?: string;
  }
  
  interface ImageProps {
    className?: string;
  }
  
  interface ScrollViewProps {
    className?: string;
  }
  
  interface TouchableOpacityProps {
    className?: string;
  }
  
  interface TextInputProps {
    className?: string;
  }
  
  interface SafeAreaViewProps {
    className?: string;
  }
  
  interface KeyboardAvoidingViewProps {
    className?: string;
  }
}

declare module 'expo-linear-gradient' {
  interface LinearGradientProps {
    className?: string;
  }
}

