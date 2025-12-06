/**
 * Global Error Handler Setup
 *
 * Sets up global error handlers for unhandled errors:
 * - Unhandled promise rejections
 * - Uncaught exceptions
 *
 * Should be called once at app startup in _layout.tsx
 */

import { handleError } from './errorHandler';
import { logger } from './logger';

let isSetup = false;

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  if (isSetup) {
    logger.warn('Global error handlers already setup');
    return;
  }

  // Handle unhandled promise rejections
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as any).addEventListener === 'function'
  ) {
    (globalThis as any).addEventListener('unhandledrejection', (event: any) => {
      // event is of type any to avoid TS error with PromiseRejectionEvent on all platforms
      const reason = event && 'reason' in event ? event.reason : event;
      logger.error('Unhandled promise rejection', reason);
      handleError(reason, {
        title: 'Unexpected Error',
        showToast: true,
      });
      // Prevent default browser error handling
      event.preventDefault();
    });
  }

  // Handle uncaught exceptions (React Native)
  if (typeof ErrorUtils !== 'undefined') {
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logger.error('Uncaught exception', error, { isFatal });

      // Handle the error
      handleError(error, {
        title: isFatal ? 'Fatal Error' : 'Error',
        showToast: !isFatal, // Don't show toast for fatal errors (app will crash)
      });

      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  isSetup = true;
  logger.info('Global error handlers setup complete');
}
