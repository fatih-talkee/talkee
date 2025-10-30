import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';

type InputVariant = 'light' | 'dark';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: InputVariant;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  variant = 'dark',
  style,
  ...props
}: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          variant === 'light' ? styles.containerLight : styles.containerDark,
          error ? styles.inputError : undefined,
          style as any,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            variant === 'light' ? styles.inputTextLight : styles.inputTextDark,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style as any,
            styles.inputBGTransparent,
          ]}
          placeholderTextColor={variant === 'light' ? '#6B7280' : '#6B7280'}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1.5,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#2C2C2E',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  inputBGTransparent: {
    backgroundColor: 'transparent',
  },
  inputWithLeftIcon: {
    paddingLeft: 48,
  },
  inputWithRightIcon: {
    paddingRight: 48,
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FF6B6B',
    marginTop: 4,
  },
  inputTextLight: {
    color: '#000000',
  },
  inputTextDark: {
    color: '#FFFFFF',
  },
  inputText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  inputTextError: {
    color: '#FF6B6B',
  },
});
