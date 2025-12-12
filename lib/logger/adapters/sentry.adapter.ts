/**
 * Sentry Adapter for Logger
 *
 * Integrates Sentry error tracking with the logger system.
 * Install: npm install @sentry/react-native
 *
 * @example
 * ```tsx
 * import * as Sentry from '@sentry/react-native';
 * import { logger } from '@/lib/logger';
 * import { SentryAdapter } from '@/lib/logger/adapters/sentry.adapter';
 *
 * // Initialize Sentry
 * Sentry.init({
 *   dsn: 'YOUR_SENTRY_DSN',
 *   environment: __DEV__ ? 'development' : 'production',
 * });
 *
 * // Register adapter
 * logger.registerRemoteLogger(new SentryAdapter(Sentry));
 * ```
 */

import type {
  RemoteLogger,
  LogContext,
  Breadcrumb,
  LogLevel,
} from '../../logger';

interface SentryInstance {
  captureException(error: Error, context?: { extra?: LogContext }): string;
  captureMessage(
    message: string,
    level?: 'debug' | 'info' | 'warning' | 'error'
  ): string;
  addBreadcrumb(breadcrumb: {
    category?: string;
    message?: string;
    level?: 'debug' | 'info' | 'warning' | 'error';
    data?: LogContext;
    timestamp?: number;
  }): void;
  setUser(user: { id?: string; [key: string]: unknown }): void;
  setContext(key: string, context: LogContext): void;
}

export class SentryAdapter implements RemoteLogger {
  private sentry: SentryInstance;

  constructor(sentry: SentryInstance) {
    this.sentry = sentry;
  }

  captureException(error: Error, context?: LogContext): void {
    this.sentry.captureException(error, {
      extra: context,
    });
  }

  captureMessage(message: string, level: LogLevel, context?: LogContext): void {
    const sentryLevel = this.mapLogLevel(level);
    this.sentry.captureMessage(message, sentryLevel);
    if (context) {
      this.sentry.setContext('logContext', context);
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: this.mapLogLevel(breadcrumb.level),
      data: breadcrumb.data,
      timestamp: new Date(breadcrumb.timestamp).getTime() / 1000,
    });
  }

  setUser(userId: string, context?: LogContext): void {
    this.sentry.setUser({
      id: userId,
      ...context,
    });
  }

  setContext(key: string, context: LogContext): void {
    this.sentry.setContext(key, context);
  }

  private mapLogLevel(level: LogLevel): 'debug' | 'info' | 'warning' | 'error' {
    switch (level) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warn':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }
}
