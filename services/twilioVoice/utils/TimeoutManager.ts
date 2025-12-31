import { logger } from '@/lib/logger';
import { OUTGOING_CALL_TIMEOUT_MS } from '../constants';

/**
 * Utility class for managing timeouts
 */
export class TimeoutManager {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private readonly onTimeout: () => void;
  private readonly debugId?: string;

  constructor(
    timeoutMs: number,
    onTimeout: () => void,
    debugId?: string
  ) {
    this.timeoutMs = timeoutMs;
    this.onTimeout = onTimeout;
    this.debugId = debugId;
  }

  /**
   * Start the timeout
   */
  start(): void {
    if (this.timeoutId) {
      logger.warn('[TimeoutManager] ⚠️ Timeout already running', {
        debugId: this.debugId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.debug('[TimeoutManager] ⏱️ Starting timeout', {
      debugId: this.debugId,
      timeoutMs: this.timeoutMs,
      timestamp: new Date().toISOString(),
    });

    this.timeoutId = setTimeout(() => {
      logger.info('[TimeoutManager] ⏰ Timeout triggered', {
        debugId: this.debugId,
        timeoutMs: this.timeoutMs,
        timestamp: new Date().toISOString(),
      });
      this.onTimeout();
      this.timeoutId = null;
    }, this.timeoutMs);
  }

  /**
   * Clear the timeout
   */
  clear(): void {
    if (this.timeoutId) {
      logger.debug('[TimeoutManager] 🧹 Clearing timeout', {
        debugId: this.debugId,
        timestamp: new Date().toISOString(),
      });
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Check if timeout is active
   */
  isActive(): boolean {
    return this.timeoutId !== null;
  }

  /**
   * Reset the timeout (clear and start again)
   */
  reset(): void {
    this.clear();
    this.start();
  }
}

