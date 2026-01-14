import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { notificationsService } from '@/services/notifications.service';
import { DurationGetter, LowBalanceCallback } from '../types';
import { BILLING } from '../constants';

/**
 * Utility class for per-minute billing during active calls
 */
export class PerMinuteBilling {
  private perMinuteInterval: ReturnType<typeof setInterval> | null = null;
  private lastChargedMinute: number = 0;
  private ratePerMinute: number = 0;
  private lowBalanceNotificationSent: boolean = false;
  private callId: string | null = null;
  private getDuration: DurationGetter;
  private onLowBalance?: LowBalanceCallback;

  constructor(
    callId: string,
    ratePerMinute: number,
    getDuration: DurationGetter,
    onLowBalance?: LowBalanceCallback
  ) {
    this.callId = callId;
    this.ratePerMinute = ratePerMinute;
    this.getDuration = getDuration;
    this.onLowBalance = onLowBalance;
  }

  /**
   * Start per-minute billing
   */
  start(): void {
    logger.info('[PerMinuteBilling] 💰 Starting per-minute billing', {
      ratePerMinute: this.ratePerMinute,
      callId: this.callId,
      timestamp: new Date().toISOString(),
    });

    if (this.perMinuteInterval) {
      logger.warn('[PerMinuteBilling] ⚠️ Per-minute interval already running', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.lastChargedMinute = 0;
    this.lowBalanceNotificationSent = false; // ✅ Reset low balance notification flag

    this.perMinuteInterval = setInterval(async () => {
      // Calculate current minute (1-based): 0-59s = minute 1, 60-119s = minute 2, etc.
      const currentDuration = this.getDuration();
      const currentMinute = Math.floor(currentDuration / 60) + 1;

      // Charge when entering a new minute (more reliable than exact boundary check)
      // This ensures we don't miss minutes due to timing issues
      if (currentMinute > this.lastChargedMinute) {
        this.lastChargedMinute = currentMinute;

        logger.info('[PerMinuteBilling] 💰 Charging for minute', {
          callId: this.callId,
          minute_number: currentMinute,
          duration: currentDuration,
          timestamp: new Date().toISOString(),
        });

        try {
          const { data, error } = await supabase.functions.invoke(
            'charge-call-minute',
            {
              body: {
                call_id: this.callId,
                minute_number: currentMinute,
              },
            }
          );

          if (error) {
            // Extract more details from the error
            const errorDetails = {
              message: error.message,
              status: (error as any).status,
              context: (error as any).context,
              data: (error as any).data,
            };
            
            logger.error('[PerMinuteBilling] ❌ Per-minute charge failed', error, {
              callId: this.callId,
              minute_number: currentMinute,
              errorMessage: error.message,
              errorDetails,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          logger.info('[PerMinuteBilling] ✅ Minute charged successfully', {
            callId: this.callId,
            minute_number: currentMinute,
            cost: data?.cost,
            new_balance: data?.new_balance,
            next_minute_affordable: data?.next_minute_affordable,
            timestamp: new Date().toISOString(),
          });

          const newBalance = Number(data?.new_balance || 0);
          const twoMinutesCost =
            this.ratePerMinute * BILLING.LOW_BALANCE_THRESHOLD_MULTIPLIER;

          if (newBalance < twoMinutesCost && !this.lowBalanceNotificationSent) {
            await this.handleLowBalance(newBalance, currentMinute);
          }

          // Check if next minute is not affordable
          if (!data?.next_minute_affordable) {
            logger.warn('[PerMinuteBilling] ⚠️ Next minute not affordable', {
              callId: this.callId,
              minute_number: currentMinute,
              new_balance: data?.new_balance,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          logger.error('[PerMinuteBilling] ❌ Per-minute charge error', err, {
            callId: this.callId,
            minute_number: currentMinute,
            errorMessage: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, BILLING.PER_MINUTE_CHECK_INTERVAL_MS);

    logger.info('[PerMinuteBilling] ✅ Per-minute billing started', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop per-minute billing
   */
  stop(): void {
    logger.info('[PerMinuteBilling] 💰 Stopping per-minute billing', {
      timestamp: new Date().toISOString(),
    });

    if (this.perMinuteInterval) {
      clearInterval(this.perMinuteInterval);
      this.perMinuteInterval = null;
      this.lastChargedMinute = 0;
      this.ratePerMinute = 0; // ✅ Reset rate
      this.lowBalanceNotificationSent = false; // ✅ Reset notification flag
      logger.info('[PerMinuteBilling] ✅ Per-minute billing stopped', {
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check if per-minute billing is active
   */
  isActive(): boolean {
    return this.perMinuteInterval !== null;
  }

  /**
   * Handle low balance warning
   */
  private async handleLowBalance(
    newBalance: number,
    currentMinute: number
  ): Promise<void> {
    logger.warn(
      '[PerMinuteBilling] ⚠️ Low balance detected - sending notification',
      {
        callId: this.callId,
        minute_number: currentMinute,
        new_balance: newBalance,
        twoMinutesCost: this.ratePerMinute * 2,
        ratePerMinute: this.ratePerMinute,
        timestamp: new Date().toISOString(),
      }
    );

    const remainingMinutes = Math.floor(newBalance / this.ratePerMinute);

    // ✅ Call callback if provided
    if (this.onLowBalance) {
      try {
        this.onLowBalance(newBalance, remainingMinutes);
      } catch (error) {
        logger.error(
          '[PerMinuteBilling] ❌ Low balance callback error',
          error instanceof Error ? error : undefined,
          {
            callId: this.callId,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    // ✅ Send local push notification for low balance
    try {
      await notificationsService.sendLocalNotification(
        '💰 Low Balance Warning',
        `Your balance is running low. You have approximately ${remainingMinutes} minutes remaining.`,
        {
          type: 'low_balance',
          call_id: this.callId,
          balance: newBalance,
          rate_per_minute: this.ratePerMinute,
          remaining_minutes: remainingMinutes,
        }
      );

      this.lowBalanceNotificationSent = true; // ✅ Mark as sent to avoid spam

      logger.info('[PerMinuteBilling] ✅ Low balance notification sent', {
        callId: this.callId,
        new_balance: newBalance,
        remaining_minutes: remainingMinutes,
        timestamp: new Date().toISOString(),
      });
    } catch (notifError) {
      logger.error(
        '[PerMinuteBilling] ❌ Failed to send low balance notification',
        notifError,
        {
          callId: this.callId,
          errorMessage:
            notifError instanceof Error
              ? notifError.message
              : String(notifError),
          timestamp: new Date().toISOString(),
        }
      );
    }
  }
}

