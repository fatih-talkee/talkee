import { logger } from '@/lib/logger';
import { DurationUpdateCallback } from '../types';
import { BILLING } from '../constants';

/**
 * Utility class for tracking call duration based on Twilio connected event
 */
export class DurationTracker {
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private connectedAt: number | null = null;
  private onDurationUpdate: DurationUpdateCallback;

  constructor(onDurationUpdate: DurationUpdateCallback) {
    this.onDurationUpdate = onDurationUpdate;
  }

  /**
   * Start duration tracking with Twilio connected event timestamp
   * @param connectedTimestamp - Timestamp when call connected (from Twilio event)
   */
  start(connectedTimestamp?: number): void {
    // ✅ Use provided timestamp (from Twilio connected event) or current time
    const startTime = connectedTimestamp || Date.now();
    this.connectedAt = startTime;

    logger.info('[DurationTracker] ⏱️ Starting duration tracking', {
      connectedAt: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString(),
    });

    if (this.durationInterval) {
      logger.warn('[DurationTracker] ⚠️ Duration interval already running', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.durationInterval = setInterval(() => {
      if (this.connectedAt) {
        const elapsedSeconds = Math.floor(
          (Date.now() - this.connectedAt) / 1000
        );
        this.onDurationUpdate(elapsedSeconds);
      } else {
        // Fallback: This shouldn't happen, but handle gracefully
        logger.warn(
          '[DurationTracker] ⚠️ connectedAt not set, using fallback',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }
    }, BILLING.DURATION_UPDATE_INTERVAL_MS);

    logger.info('[DurationTracker] ✅ Duration tracking started', {
      connectedAt: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop duration tracking
   * @returns Final duration in seconds
   */
  stop(): number {
    const finalDuration = this.connectedAt
      ? Math.floor((Date.now() - this.connectedAt) / 1000)
      : 0;

    logger.info('[DurationTracker] ⏱️ Stopping duration tracking', {
      connectedAt: this.connectedAt
        ? new Date(this.connectedAt).toISOString()
        : null,
      finalDuration,
      timestamp: new Date().toISOString(),
    });

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    // ✅ Reset connectedAt timestamp
    this.connectedAt = null;

    logger.info('[DurationTracker] ✅ Duration tracking stopped', {
      finalDuration,
      timestamp: new Date().toISOString(),
    });

    return finalDuration;
  }

  /**
   * Check if duration tracking is active
   */
  isActive(): boolean {
    return this.durationInterval !== null;
  }

  /**
   * Get current duration without stopping
   */
  getCurrentDuration(): number {
    if (!this.connectedAt) {
      return 0;
    }
    return Math.floor((Date.now() - this.connectedAt) / 1000);
  }
}
