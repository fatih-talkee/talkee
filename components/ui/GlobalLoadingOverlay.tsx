import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';

// Global loading state
let globalLoadingState = {
  isLoading: false,
  message: '',
  listeners: new Set<(isLoading: boolean, message: string) => void>(),
};

export function setGlobalLoading(isLoading: boolean, message: string = '') {
  globalLoadingState.isLoading = isLoading;
  globalLoadingState.message = message;
  globalLoadingState.listeners.forEach((listener) => {
    listener(isLoading, message);
  });
  logger.debug('[GlobalLoading] State updated', {
    isLoading,
    message,
    timestamp: new Date().toISOString(),
  });
}

export function GlobalLoadingOverlay() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const listener = (loading: boolean, msg: string) => {
      setIsLoading(loading);
      setMessage(msg);
    };

    // Set initial state
    setIsLoading(globalLoadingState.isLoading);
    setMessage(globalLoadingState.message);

    // Subscribe to changes
    globalLoadingState.listeners.add(listener);

    return () => {
      globalLoadingState.listeners.delete(listener);
    };
  }, []);

  if (!isLoading) {
    return null;
  }

  return (
    <Modal
      visible={isLoading}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          {message ? (
            <View style={styles.messageContainer}>
              <Text style={[styles.message, { color: theme.colors.text }]}>
                {message}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  messageContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

