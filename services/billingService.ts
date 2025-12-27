/**
 * BillingService
 *
 * Manages real-time billing tracking for Twilio calls.
 * Sends local push notifications for billing updates and balance warnings.
 * Works independently from UI - compatible with Twilio native call screens.
 */

import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/logger';
import type { Call } from '@twilio/voice-react-native-sdk';

interface BillingState {
  durationSeconds: number;
  durationMinutes: number;
  currentCost: number;
  remainingBalance: number;
  remainingMinutes: number;
}

class BillingService {
  private billingInterval: ReturnType<typeof setInterval> | null = null;
  private callStartTime: number = 0;
  private ratePerMinute: number = 0;
  private userBalance: number = 0;
  private lastNotificationMinute: number = 0;
  private currentCall: Call | null = null;
  private lowBalanceWarningShown: boolean = false;
  private criticalWarningShown: boolean = false;

  /**
   * Start tracking billing for an active call
   */
  startTracking(call: Call, ratePerMinute: number, userBalance: number) {
    logger.info('[BillingService] 🔧 Starting billing tracking', {
      ratePerMinute,
      userBalance,
      timestamp: new Date().toISOString(),
    });

    this.currentCall = call;
    this.ratePerMinute = ratePerMinute;
    this.userBalance = userBalance;
    this.callStartTime = Date.now();
    this.lastNotificationMinute = 0;
    this.lowBalanceWarningShown = false;
    this.criticalWarningShown = false;

    // Update every 10 seconds
    this.billingInterval = setInterval(async () => {
      await this.updateBilling();
    }, 10000);

    logger.info('[BillingService] ✅ Billing tracking started', {
      updateInterval: '10s',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop billing tracking
   */
  stopTracking() {
    if (this.billingInterval) {
      clearInterval(this.billingInterval);
      this.billingInterval = null;

      logger.info('[BillingService] ⏹️ Billing tracking stopped', {
        timestamp: new Date().toISOString(),
      });
    }

    this.currentCall = null;
    this.lowBalanceWarningShown = false;
    this.criticalWarningShown = false;
  }

  /**
   * Update billing state and send notifications
   */
  private async updateBilling() {
    const state = this.calculateBillingState();

    logger.debug('[BillingService] 💰 Billing state updated', {
      duration: this.formatDuration(state.durationSeconds),
      cost: state.currentCost.toFixed(2),
      balance: state.remainingBalance.toFixed(2),
      remainingMinutes: Math.floor(state.remainingMinutes),
      timestamp: new Date().toISOString(),
    });

    // Send minute-by-minute updates
    await this.sendMinutelyUpdate(state);

    // Send balance warnings
    await this.checkBalanceWarnings(state);

    // Handle balance depletion
    if (state.remainingBalance <= 0) {
      await this.handleBalanceDepleted();
    }
  }

  /**
   * Calculate current billing state
   */
  private calculateBillingState(): BillingState {
    const durationSeconds = Math.floor(
      (Date.now() - this.callStartTime) / 1000
    );
    const durationMinutes = durationSeconds / 60;
    const currentCost = durationMinutes * this.ratePerMinute;
    const remainingBalance = this.userBalance - currentCost;
    const remainingMinutes = remainingBalance / this.ratePerMinute;

    return {
      durationSeconds,
      durationMinutes,
      currentCost,
      remainingBalance,
      remainingMinutes,
    };
  }

  /**
   * Send billing update notification every minute
   */
  private async sendMinutelyUpdate(state: BillingState) {
    const currentMinute = Math.floor(state.durationMinutes);

    // Only send once per minute
    if (currentMinute > this.lastNotificationMinute && currentMinute > 0) {
      this.lastNotificationMinute = currentMinute;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📞 Call in Progress',
          body: `⏱ ${this.formatDuration(
            state.durationSeconds
          )} | 💰 $${state.currentCost.toFixed(
            2
          )} | 💵 Balance: $${state.remainingBalance.toFixed(2)}`,
          data: {
            type: 'billing_update',
            duration: state.durationSeconds,
            cost: state.currentCost,
            balance: state.remainingBalance,
          },
          sound: false, // Silent - don't interrupt call
          priority: Notifications.AndroidNotificationPriority.LOW,
        },
        trigger: null, // Send immediately
      });

      logger.info('[BillingService] 🔔 Minutely billing notification sent', {
        minute: currentMinute,
        duration: this.formatDuration(state.durationSeconds),
        cost: state.currentCost.toFixed(2),
        balance: state.remainingBalance.toFixed(2),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check and send balance warnings
   */
  private async checkBalanceWarnings(state: BillingState) {
    // Low balance warning (5 minutes remaining)
    if (
      state.remainingMinutes <= 5 &&
      state.remainingMinutes > 1 &&
      !this.lowBalanceWarningShown
    ) {
      this.lowBalanceWarningShown = true;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Low Balance Warning',
          body: `Only ${Math.floor(
            state.remainingMinutes
          )} minute(s) of call time remaining. Add credits to continue.`,
          data: {
            type: 'low_balance',
            remainingMinutes: state.remainingMinutes,
          },
          sound: true, // Alert sound
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });

      logger.warn('[BillingService] 🔔 Low balance warning sent', {
        remainingMinutes: Math.floor(state.remainingMinutes),
        timestamp: new Date().toISOString(),
      });
    }

    // Critical balance warning (1 minute remaining)
    if (
      state.remainingMinutes <= 1 &&
      state.remainingMinutes > 0 &&
      !this.criticalWarningShown
    ) {
      this.criticalWarningShown = true;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Balance Critical',
          body: `Call ending in ${Math.floor(
            state.remainingMinutes
          )} minute! Please add credits immediately.`,
          data: {
            type: 'critical_balance',
            remainingMinutes: state.remainingMinutes,
          },
          sound: true, // Alert sound
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });

      logger.error('[BillingService] 🔔 Critical balance warning sent', {
        remainingMinutes: Math.floor(state.remainingMinutes),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle balance depletion - end call
   */
  private async handleBalanceDepleted() {
    logger.error('[BillingService] ❌ Balance depleted - ending call', {
      timestamp: new Date().toISOString(),
    });

    // Send final notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❌ Call Ended',
        body: 'Your balance has been depleted. Please add credits to make more calls.',
        data: {
          type: 'balance_depleted',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });

    // Disconnect call
    try {
      if (this.currentCall) {
        await this.currentCall.disconnect();
        logger.info(
          '[BillingService] 📞 Call disconnected due to depleted balance',
          {
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      logger.error('[BillingService] ❌ Error disconnecting call', error, {
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.stopTracking();
    }
  }

  /**
   * Format duration in MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get current billing state (for external use)
   */
  getCurrentState(): BillingState | null {
    if (!this.currentCall) return null;
    return this.calculateBillingState();
  }

  /**
   * Check if tracking is active
   */
  isTracking(): boolean {
    return this.billingInterval !== null;
  }
}

// Export singleton instance
export default new BillingService();
