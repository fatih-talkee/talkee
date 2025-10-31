/**
 * ToastService - Centralized toast notification service
 *
 * This service provides a consistent way to display toast notifications
 * throughout the app with themed styling.
 *
 * @example
 * ```tsx
 * import { useToast } from '@/lib/toastService';
 *
 * const toast = useToast();
 *
 * // Show success toast
 * toast.success({
 *   title: 'Success',
 *   message: 'Your changes have been saved',
 * });
 *
 * // Show error toast
 * toast.error({
 *   title: 'Error',
 *   message: 'Something went wrong',
 *   duration: 5000,
 * });
 * ```
 */

import Toast from 'react-native-toast-message';

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

class ToastService {
  /**
   * Show a success toast notification
   */
  success(options: ToastOptions): void {
    Toast.show({
      type: ToastType.SUCCESS,
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3000,
      position: options.position || 'top',
      onPress: options.onPress,
    });
  }

  /**
   * Show an error toast notification
   */
  error(options: ToastOptions): void {
    Toast.show({
      type: ToastType.ERROR,
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 4000,
      position: options.position || 'top',
      onPress: options.onPress,
    });
  }

  /**
   * Show a warning toast notification
   */
  warning(options: ToastOptions): void {
    Toast.show({
      type: ToastType.WARNING,
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3000,
      position: options.position || 'top',
      onPress: options.onPress,
    });
  }

  /**
   * Show an info toast notification
   */
  info(options: ToastOptions): void {
    Toast.show({
      type: ToastType.INFO,
      text1: options.title,
      text2: options.message,
      visibilityTime: options.duration || 3000,
      position: options.position || 'top',
      onPress: options.onPress,
    });
  }

  /**
   * Generic method to show any type of toast
   */
  show(type: ToastType, options: ToastOptions): void {
    switch (type) {
      case ToastType.SUCCESS:
        this.success(options);
        break;
      case ToastType.ERROR:
        this.error(options);
        break;
      case ToastType.WARNING:
        this.warning(options);
        break;
      case ToastType.INFO:
        this.info(options);
        break;
    }
  }

  /**
   * Hide the currently visible toast
   */
  hide(): void {
    Toast.hide();
  }
}

// Export a singleton instance
export const toastService = new ToastService();

// Export a hook that can be used in components
export const useToast = () => {
  return toastService;
};
