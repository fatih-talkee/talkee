/**
 * Logger Utility
 * 
 * Centralized logging system that:
 * - Only logs in development mode
 * - Provides structured logging
 * - Can be extended to send logs to error reporting services
 * - Prevents console.log pollution in production
 * 
 * @example
 * ```tsx
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch data', error);
 * logger.warn('Deprecated API used');
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = __DEV__;
  private enabledLevels: LogLevel[] = this.isDevelopment
    ? ['debug', 'info', 'warn', 'error']
    : ['error', 'warn']; // Only errors and warnings in production

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.enabledLevels.includes(level);
  }

  /**
   * Format log message with context
   */
  private formatMessage(message: string, context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return message;
    }
    return `${message} ${JSON.stringify(context, null, 2)}`;
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log info message (only in development)
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning message (always logged)
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  /**
   * Log error message (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] ${message}`, error || '', context || '');
      
      // In production, you might want to send errors to a reporting service
      if (!this.isDevelopment) {
        // TODO: Send to error reporting service (Sentry, Bugsnag, etc.)
        // errorReportingService.captureException(error, { extra: context });
      }
    }
  }

  /**
   * Log group (only in development)
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End log group (only in development)
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Log table (only in development)
   */
  table(data: unknown): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Time a function execution (only in development)
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End timing (only in development)
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Disable all logging (useful for testing)
   */
  disable(): void {
    this.enabledLevels = [];
  }

  /**
   * Enable all logging
   */
  enable(): void {
    this.enabledLevels = this.isDevelopment
      ? ['debug', 'info', 'warn', 'error']
      : ['error', 'warn'];
  }

  /**
   * Set custom log levels
   */
  setLevels(levels: LogLevel[]): void {
    this.enabledLevels = levels;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { LogLevel, LogContext };

