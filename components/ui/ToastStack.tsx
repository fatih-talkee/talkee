import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom';
  onPress?: () => void;
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  translateY: Animated.Value;
  opacity: Animated.Value;
}

class ToastStackManager {
  private listeners: Array<(toasts: ToastItem[]) => void> = [];
  private toasts: ToastItem[] = [];
  private toastIdCounter = 0;

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show(type: ToastType, options: ToastOptions) {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: ToastItem = {
      ...options,
      id,
      type,
      translateY: new Animated.Value(-100), // Start above screen
      opacity: new Animated.Value(0),
    };

    // Calculate initial positions for existing toasts (they'll slide down)
    const existingCount = this.toasts.length;
    const slideDownOffset = 80; // Height of a toast + margin

    // Add to stack at the beginning (top)
    this.toasts.unshift(toast);

    // Slide existing toasts down
    this.toasts.slice(1).forEach((t, index) => {
      const newOffset = (index + 1) * slideDownOffset;
      Animated.spring(t.translateY, {
        toValue: newOffset,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    });

    this.notify();

    // Animate new toast in at the top
    Animated.parallel([
      Animated.spring(toast.translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(toast.opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const duration = options.duration || (type === ToastType.ERROR ? 4000 : 3000);
    setTimeout(() => {
      this.hide(id);
    }, duration);

    return id;
  }

  hide(id: string) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index === -1) return;

    const toast = this.toasts[index];

    // Animate out
    Animated.parallel([
      Animated.timing(toast.translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toast.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Remove from stack
      this.toasts = this.toasts.filter(t => t.id !== id);
      
      // Slide remaining toasts up to fill the gap
      this.toasts.forEach((t, i) => {
        const newOffset = i * 80;
        Animated.spring(t.translateY, {
          toValue: newOffset,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      });

      this.notify();
    });
  }

  getToasts() {
    return [...this.toasts];
  }
}

export const toastStackManager = new ToastStackManager();

export function ToastStack() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toastStackManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const getToastStyles = (typeColor: string) => {
    const isDark = theme.name === 'dark';
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return {
      container: {
        minHeight: 64,
        width: Dimensions.get('window').width * 0.92,
        maxWidth: 420,
        backgroundColor: isDark ? '#000000' : theme.colors.card,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : theme.colors.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: 16,
        elevation: 12,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginBottom: 12,
      },
      iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: hexToRgba(typeColor, 0.2),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexShrink: 0,
        marginRight: 12,
      },
      content: {
        flex: 1,
      },
      title: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: theme.colors.text,
        marginBottom: 2,
      },
      message: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: theme.colors.textSecondary,
        lineHeight: 18,
      },
      closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexShrink: 0,
        marginLeft: 8,
      },
    };
  };

  const renderToast = (toast: ToastItem, index: number) => {
    const styles = getToastStyles(
      toast.type === ToastType.SUCCESS
        ? theme.colors.success
        : toast.type === ToastType.ERROR
        ? theme.colors.error
        : toast.type === ToastType.WARNING
        ? theme.colors.warning
        : theme.colors.info
    );

    const IconComponent =
      toast.type === ToastType.SUCCESS
        ? CheckCircle2
        : toast.type === ToastType.ERROR
        ? AlertCircle
        : toast.type === ToastType.WARNING
        ? AlertTriangle
        : Info;

    const iconColor =
      toast.type === ToastType.SUCCESS
        ? theme.colors.success
        : toast.type === ToastType.ERROR
        ? theme.colors.error
        : toast.type === ToastType.WARNING
        ? theme.colors.warning
        : theme.colors.info;

    const baseTop = insets.top + 12;

    return (
      <Animated.View
        key={toast.id}
        style={[
          styles.container,
          {
            position: 'absolute',
            top: baseTop,
            alignSelf: 'center',
            transform: [
              {
                translateY: toast.translateY,
              },
            ],
            opacity: toast.opacity,
            zIndex: 1000 - index,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toast.onPress}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.iconContainer}>
          <IconComponent size={20} color={iconColor} strokeWidth={2.5} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{toast.title}</Text>
          {toast.message && <Text style={styles.message}>{toast.message}</Text>}
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => toastStackManager.hide(toast.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {toasts.map((toast, index) => renderToast(toast, index))}
    </View>
  );
}

