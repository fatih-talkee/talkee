import * as Sentry from '@sentry/react-native';
import { RemoteLogger, LogLevel, LogContext, Breadcrumb } from './logger';

/**
 * Sentry Adapter for Logger System
 * Connects our custom logger to Sentry SDK
 */
export class SentryAdapter implements RemoteLogger {
  
  captureException(error: Error, context?: LogContext): void {
    Sentry.captureException(error, { extra: context as Record<string, any> });
  }

  captureMessage(message: string, level: LogLevel, context?: LogContext): void {
    Sentry.captureMessage(message, {
      level: this.mapLogLevel(level),
      extra: context as Record<string, any>,
    });
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: this.mapLogLevel(breadcrumb.level),
      data: breadcrumb.data as Record<string, any>,
      timestamp: new Date(breadcrumb.timestamp).getTime() / 1000,
    });
  }

  setUser(userId: string, context?: LogContext): void {
    Sentry.setUser({
      id: userId,
      ...context,
    });
  }

  setContext(key: string, context: LogContext): void {
    Sentry.setContext(key, context as Record<string, any>);
  }

  private mapLogLevel(level: LogLevel): Sentry.SeverityLevel {
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
