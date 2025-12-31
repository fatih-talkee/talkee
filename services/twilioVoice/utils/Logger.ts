import { logger } from '@/lib/logger';

/**
 * Centralized logging utility for Twilio Voice service
 * Provides consistent logging patterns and reduces verbosity
 */

export class TwilioLogger {
  private static readonly CONTEXT = '[TwilioVoice]';

  static info(message: string, meta?: Record<string, any>): void {
    logger.info(`${this.CONTEXT} ${message}`, {
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  static debug(message: string, meta?: Record<string, any>): void {
    logger.debug(`${this.CONTEXT} ${message}`, {
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  static warn(message: string, meta?: Record<string, any>): void {
    logger.warn(`${this.CONTEXT} ${message}`, {
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  static error(
    message: string,
    error?: Error | unknown,
    meta?: Record<string, any>
  ): void {
    logger.error(`${this.CONTEXT} ${message}`, error, {
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log with timing information
   */
  static timed(
    message: string,
    startTime: number,
    meta?: Record<string, any>
  ): void {
    const elapsed = Date.now() - startTime;
    this.info(message, {
      ...meta,
      elapsed: `${elapsed}ms`,
    });
  }

  /**
   * Log call operation (with callId/debugId context)
   */
  static callOperation(
    operation: string,
    callId?: string,
    debugId?: string,
    meta?: Record<string, any>
  ): void {
    this.info(`📞 ${operation}`, {
      callId,
      debugId,
      ...meta,
    });
  }

  /**
   * Log state change
   */
  static stateChange(
    from: string,
    to: string,
    meta?: Record<string, any>
  ): void {
    this.debug('🔄 State change', {
      from,
      to,
      ...meta,
    });
  }
}

