/**
 * Production-Ready Logger System
 *
 * Centralized logging system with:
 * - Structured JSON logging
 * - Environment-based log levels
 * - Remote logging support (Sentry, etc.)
 * - Breadcrumb tracking for error context
 * - Performance monitoring
 * - Sensitive data filtering
 * - Async log batching
 * - User action tracking
 *
 * @example
 * ```tsx
 * import { logger } from '@/lib/logger';
 *
 * // Basic logging
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch data', error, { endpoint: '/api/users' });
 *
 * // Performance tracking
 * logger.performance('API call', 150, { endpoint: '/api/users' });
 *
 * // User actions
 * logger.userAction('button_click', { button: 'submit', screen: 'login' });
 *
 * // Breadcrumbs for error context
 * logger.breadcrumb('Navigation', { from: 'home', to: 'profile' });
 * ```
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  platform: string;
  appVersion?: string;
  userId?: string;
  sessionId?: string;
  breadcrumbs?: Breadcrumb[];
}

export interface Breadcrumb {
  category: string;
  message: string;
  level: LogLevel;
  timestamp: string;
  data?: LogContext;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  context?: LogContext;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

interface LoggerConfig {
  enabled: boolean;
  logLevel: LogLevel;
  /**
   * Force console logging even in production builds.
   * Useful for short-lived debugging sessions on release/dev-client builds where Metro logs are not available.
   */
  enableConsoleInProd: boolean;
  enableRemoteLogging: boolean;
  enableBreadcrumbs: boolean;
  enablePerformanceTracking: boolean;
  maxBreadcrumbs: number;
  batchSize: number;
  batchInterval: number; // milliseconds
  sensitiveKeys: string[]; // Keys to filter from logs
}

const defaultConfig: LoggerConfig = {
  enabled: true,
  logLevel: __DEV__ ? 'debug' : 'error',
  enableConsoleInProd: false,
  enableRemoteLogging: !__DEV__, // Enable in production
  enableBreadcrumbs: true,
  enablePerformanceTracking: true,
  maxBreadcrumbs: 50,
  batchSize: 10,
  batchInterval: 5000, // 5 seconds
  sensitiveKeys: [
    'password',
    'token',
    'secret',
    'apiKey',
    'authToken',
    'accessToken',
    'refreshToken',
    'authorization',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
  ],
};

// ============================================================================
// REMOTE LOGGING ADAPTER (Extensible for Sentry, etc.)
// ============================================================================

export interface RemoteLogger {
  captureException?(error: Error, context?: LogContext): void;
  captureMessage?(message: string, level: LogLevel, context?: LogContext): void;
  addBreadcrumb?(breadcrumb: Breadcrumb): void;
  setUser?(userId: string, context?: LogContext): void;
  setContext?(key: string, context: LogContext): void;
}

class RemoteLoggingAdapter {
  private adapters: RemoteLogger[] = [];

  /**
   * Register a remote logging service (e.g., Sentry)
   */
  register(adapter: RemoteLogger): void {
    this.adapters.push(adapter);
  }

  /**
   * Send error to remote services
   */
  captureException(error: Error, context?: LogContext): void {
    this.adapters.forEach((adapter) => {
      adapter.captureException?.(error, context);
    });
  }

  /**
   * Send message to remote services
   */
  captureMessage(message: string, level: LogLevel, context?: LogContext): void {
    this.adapters.forEach((adapter) => {
      adapter.captureMessage?.(message, level, context);
    });
  }

  /**
   * Add breadcrumb to remote services
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.adapters.forEach((adapter) => {
      adapter.addBreadcrumb?.(breadcrumb);
    });
  }

  /**
   * Set user context in remote services
   */
  setUser(userId: string, context?: LogContext): void {
    this.adapters.forEach((adapter) => {
      adapter.setUser?.(userId, context);
    });
  }

  /**
   * Set additional context in remote services
   */
  setContext(key: string, context: LogContext): void {
    this.adapters.forEach((adapter) => {
      adapter.setContext?.(key, context);
    });
  }
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private _config: LoggerConfig = { ...defaultConfig };
  private breadcrumbs: Breadcrumb[] = [];
  private logQueue: LogEntry[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string = this.generateSessionId();
  private userId: string | null = null;
  private remoteLogger = new RemoteLoggingAdapter();

  /**
   * Get current config (read-only)
   */
  get config(): Readonly<LoggerConfig> {
    return this._config;
  }

  constructor() {
    // Start batch processing if enabled
    if (this._config.enableRemoteLogging) {
      this.startBatchProcessing();
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Configure logger settings
   */
  configure(config: Partial<LoggerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Register remote logging adapter (e.g., Sentry)
   */
  registerRemoteLogger(adapter: RemoteLogger): void {
    this.remoteLogger.register(adapter);
  }

  /**
   * Set current user ID for context
   */
  setUser(userId: string | null, context?: LogContext): void {
    this.userId = userId;
    if (userId) {
      this.remoteLogger.setUser(userId, context);
    }
  }

  /**
   * Set additional context
   */
  setContext(key: string, context: LogContext): void {
    this.remoteLogger.setContext(key, context);
  }

  // ============================================================================
  // CORE LOGGING METHODS
  // ============================================================================

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Filter sensitive data from context
   */
  private filterSensitiveData(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const filtered = { ...context };
    this._config.sensitiveKeys.forEach((key) => {
      if (key in filtered) {
        filtered[key] = '[FILTERED]';
      }
    });

    return filtered;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext
  ): LogEntry {
    const filteredContext = this.filterSensitiveData(context);

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: filteredContext,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      breadcrumbs:
        this._config.enableBreadcrumbs && this.breadcrumbs.length > 0
          ? [...this.breadcrumbs]
          : undefined,
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      } else {
        entry.error = {
          message: String(error),
        };
      }
    }

    return entry;
  }

  /**
   * Log to console (development only)
   */
  private logToConsole(entry: LogEntry): void {
    if (!__DEV__ && !this._config.enableConsoleInProd) return;

    const { level, message, context, error } = entry;
    const prefix = `[${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.log(prefix, message, context || '');
        break;
      case 'info':
        console.log(prefix, message, context || '');
        break;
      case 'warn':
        console.warn(prefix, message, context || '');
        break;
      case 'error':
        console.error(prefix, message, error || '', context || '');
        break;
    }
  }

  /**
   * Send to remote logging service
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this._config.enableRemoteLogging) return;

    try {
      if (entry.error) {
        const error = new Error(entry.error.message);
        error.stack = entry.error.stack;
        error.name = entry.error.name || 'Error';
        this.remoteLogger.captureException(error, entry.context);
      } else {
        this.remoteLogger.captureMessage(
          entry.message,
          entry.level,
          entry.context
        );
      }
    } catch (err) {
      // Silently fail to avoid logging loops
      if (__DEV__) {
        console.warn('[Logger] Failed to send to remote service:', err);
      }
    }
  }

  /**
   * Add log entry to queue for batching
   */
  private queueLog(entry: LogEntry): void {
    if (!this._config.enableRemoteLogging) return;

    this.logQueue.push(entry);

    // Flush if batch size reached
    if (this.logQueue.length >= this._config.batchSize) {
      this.flushLogs();
    }
  }

  /**
   * Flush queued logs
   */
  private flushLogs(): void {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    // Send logs asynchronously
    logs.forEach((entry) => {
      this.sendToRemote(entry);
    });
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      this.flushLogs();
    }, this._config.batchInterval);
  }

  /**
   * Stop batch processing
   */
  private stopBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushLogs(); // Flush remaining logs
  }

  // ============================================================================
  // PUBLIC LOGGING METHODS
  // ============================================================================

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, undefined, context);
    this.logToConsole(entry);
    this.queueLog(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, undefined, context);
    this.logToConsole(entry);
    this.queueLog(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, undefined, context);
    this.logToConsole(entry);
    this.queueLog(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const entry = this.createLogEntry('error', message, error, context);
    this.logToConsole(entry);
    this.queueLog(entry);
  }

  // ============================================================================
  // BREADCRUMBS
  // ============================================================================

  /**
   * Add breadcrumb for error context tracking
   */
  breadcrumb(
    category: string,
    message: string,
    data?: LogContext,
    level: LogLevel = 'info'
  ): void {
    if (!this._config.enableBreadcrumbs) return;

    const breadcrumb: Breadcrumb = {
      category,
      message,
      level,
      timestamp: new Date().toISOString(),
      data: this.filterSensitiveData(data),
    };

    this.breadcrumbs.push(breadcrumb);

    // Limit breadcrumb count
    if (this.breadcrumbs.length > this._config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // Send to remote services
    this.remoteLogger.addBreadcrumb(breadcrumb);
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  // ============================================================================
  // PERFORMANCE TRACKING
  // ============================================================================

  /**
   * Track performance metric
   */
  performance(name: string, duration: number, context?: LogContext): void {
    if (!this._config.enablePerformanceTracking) return;

    const metric: PerformanceMetric = {
      name,
      duration,
      context: this.filterSensitiveData(context),
    };

    if (__DEV__) {
      console.log(`[PERF] ${name}: ${duration}ms`, context || '');
    }

    // Log as info with performance context
    this.info(`Performance: ${name}`, {
      ...context,
      duration,
      metric: 'performance',
    });
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.performance(name, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.performance(name, duration, { ...context, error: true });
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(name: string, fn: () => T, context?: LogContext): T {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;
      this.performance(name, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.performance(name, duration, { ...context, error: true });
      throw error;
    }
  }

  // ============================================================================
  // USER ACTION TRACKING
  // ============================================================================

  /**
   * Track user action (for analytics)
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, {
      ...context,
      action,
      metric: 'user_action',
    });
  }

  // ============================================================================
  // NETWORK REQUEST LOGGING
  // ============================================================================

  /**
   * Log network request
   */
  networkRequest(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    error?: Error,
    context?: LogContext
  ): void {
    const level: LogLevel =
      error || (statusCode && statusCode >= 400) ? 'error' : 'info';

    const logContext = {
      ...context,
      method,
      url,
      statusCode,
      duration,
      metric: 'network',
    };

    if (level === 'error') {
      this.error(`Network Request: ${method} ${url}`, error, logContext);
    } else {
      this.info(`Network Request: ${method} ${url}`, logContext);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start new session
   */
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.clearBreadcrumbs();
  }

  /**
   * Disable all logging
   */
  disable(): void {
    this._config.enabled = false;
    this.stopBatchProcessing();
  }

  /**
   * Enable logging
   */
  enable(): void {
    this._config.enabled = true;
    if (this._config.enableRemoteLogging) {
      this.startBatchProcessing();
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this._config.logLevel = level;
  }

  /**
   * Cleanup (call on app unmount)
   */
  cleanup(): void {
    this.stopBatchProcessing();
    this.clearBreadcrumbs();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const logger = new Logger();
