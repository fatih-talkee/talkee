/**
 * ToastService - Centralized toast notification service
 *
 * This service provides a consistent way to display toast notifications
 * throughout the app with themed styling. Supports multiple simultaneous toasts
 * with proper vertical stacking.
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

import { toastStackManager, ToastType, ToastOptions } from '@/components/ui/ToastStack';

export { ToastType, type ToastOptions };

class ToastService {
  /**
   * Show a success toast notification
   */
  success(options: ToastOptions): void {
    toastStackManager.show(ToastType.SUCCESS, options);
  }

  /**
   * Show an error toast notification
   */
  error(options: ToastOptions): void {
    toastStackManager.show(ToastType.ERROR, options);
  }

  /**
   * Show a warning toast notification
   */
  warning(options: ToastOptions): void {
    toastStackManager.show(ToastType.WARNING, options);
  }

  /**
   * Show an info toast notification
   */
  info(options: ToastOptions): void {
    toastStackManager.show(ToastType.INFO, options);
  }

  /**
   * Generic method to show any type of toast
   */
  show(type: ToastType, options: ToastOptions): void {
    toastStackManager.show(type, options);
  }

  /**
   * Hide a specific toast by id (returned from show methods)
   */
  hide(id: string): void {
    toastStackManager.hide(id);
  }
}

// Export a singleton instance
export const toastService = new ToastService();

// Export a hook that can be used in components
export const useToast = () => {
  return toastService;
};
