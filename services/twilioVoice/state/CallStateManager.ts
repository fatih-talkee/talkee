import { logger } from '@/lib/logger';
import { CallState, CallStatus } from '../types';

export class CallStateManager {
  private state: CallState;
  private listeners: Map<string, Set<(state: CallState) => void>> = new Map();
  private stateUpdateTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor(initialState?: Partial<CallState>) {
    this.state = {
      status: 'idle',
      call: null,
      callInvite: null,
      isMuted: false,
      isOnHold: false,
      duration: 0,
      error: null,
      ...initialState,
    };
  }

  getState(): CallState {
    logger.debug('[CallStateManager] 🔍 getState called', {
      status: this.state.status,
      hasCall: !!this.state.call,
      hasCallInvite: !!this.state.callInvite,
      isMuted: this.state.isMuted,
      isOnHold: this.state.isOnHold,
      duration: this.state.duration,
      hasError: !!this.state.error,
      timestamp: new Date().toISOString(),
    });
    return this.state;
  }

  updateState(updates: Partial<CallState>): void {
    const updateStartTime = Date.now();
    const previousStatus = this.state.status;
    const previousState = { ...this.state };

    logger.debug('[CallStateManager] 🔄 updateState called', {
      previousStatus,
      updates: Object.keys(updates),
      updateDetails: updates,
      timestamp: new Date().toISOString(),
    });

    this.state = { ...this.state, ...updates };
    const newStatus = this.state.status;

    logger.info('[CallStateManager] ✅ State updated', {
      previousStatus,
      newStatus,
      statusChanged: previousStatus !== newStatus,
      updates: Object.keys(updates),
      stateChanges: {
        status:
          previousStatus !== newStatus
            ? { from: previousStatus, to: newStatus }
            : undefined,
        call:
          previousState.call !== this.state.call
            ? { from: !!previousState.call, to: !!this.state.call }
            : undefined,
        callInvite:
          previousState.callInvite !== this.state.callInvite
            ? {
                from: !!previousState.callInvite,
                to: !!this.state.callInvite,
              }
            : undefined,
        isMuted:
          previousState.isMuted !== this.state.isMuted
            ? { from: previousState.isMuted, to: this.state.isMuted }
            : undefined,
        isOnHold:
          previousState.isOnHold !== this.state.isOnHold
            ? { from: previousState.isOnHold, to: this.state.isOnHold }
            : undefined,
        duration:
          previousState.duration !== this.state.duration
            ? { from: previousState.duration, to: this.state.duration }
            : undefined,
        error:
          previousState.error !== this.state.error
            ? {
                from: previousState.error?.message,
                to: this.state.error?.message,
              }
            : undefined,
      },
      timestamp: new Date().toISOString(),
    });

    // ✅ FIX: Notify all listeners asynchronously to prevent blocking
    // Use setTimeout to ensure state update completes before notifying
    const timeoutId = setTimeout(() => {
      this.stateUpdateTimeouts.delete(timeoutId);
      this.notifyListeners();
    }, 0);
    this.stateUpdateTimeouts.add(timeoutId);

    const updateElapsed = Date.now() - updateStartTime;
    logger.debug('[CallStateManager] ✅ State update completed', {
      elapsed: `${updateElapsed}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  subscribe(callback: (state: CallState) => void): () => void {
    const id = Math.random().toString(36);
    logger.info('[CallStateManager] 📡 subscribe called', {
      listenerId: id,
      currentListenersCount: this.listeners.get('stateChange')?.size || 0,
      timestamp: new Date().toISOString(),
    });

    if (!this.listeners.has('stateChange')) {
      this.listeners.set('stateChange', new Set());
    }
    this.listeners.get('stateChange')!.add(callback);

    logger.debug('[CallStateManager] ✅ Listener added', {
      listenerId: id,
      totalListeners: this.listeners.get('stateChange')?.size || 0,
      timestamp: new Date().toISOString(),
    });

    return () => {
      logger.info('[CallStateManager] 🔚 Unsubscribing listener', {
        listenerId: id,
        timestamp: new Date().toISOString(),
      });

      this.listeners.get('stateChange')?.delete(callback);

      logger.debug('[CallStateManager] ✅ Listener removed', {
        listenerId: id,
        remainingListeners: this.listeners.get('stateChange')?.size || 0,
        timestamp: new Date().toISOString(),
      });
    };
  }

  private notifyListeners(): void {
    const listeners = this.listeners.get('stateChange');
    if (!listeners || listeners.size === 0) {
      logger.debug('[CallStateManager] ℹ️ No listeners to notify', {
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.debug('[CallStateManager] 📢 Notifying listeners', {
      listenerCount: listeners.size,
      state: {
        status: this.state.status,
        hasCall: !!this.state.call,
        hasCallInvite: !!this.state.callInvite,
        isMuted: this.state.isMuted,
        isOnHold: this.state.isOnHold,
        duration: this.state.duration,
        hasError: !!this.state.error,
      },
      timestamp: new Date().toISOString(),
    });

    const notifyStartTime = Date.now();
    let notifiedCount = 0;
    let errorCount = 0;

    for (const callback of listeners) {
      try {
        callback(this.state);
        notifiedCount++;
      } catch (error) {
        errorCount++;
        logger.error(
          '[CallStateManager] ❌ Error in state change listener',
          error,
          {
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    const notifyElapsed = Date.now() - notifyStartTime;
    logger.info('[CallStateManager] ✅ Listeners notified', {
      notifiedCount,
      errorCount,
      totalListeners: listeners.size,
      elapsed: `${notifyElapsed}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  clearStateUpdateTimeouts(): void {
    logger.debug('[CallStateManager] 🧹 Clearing state update timeouts', {
      timeoutCount: this.stateUpdateTimeouts.size,
      timestamp: new Date().toISOString(),
    });
    for (const timeoutId of this.stateUpdateTimeouts) {
      clearTimeout(timeoutId);
    }
    this.stateUpdateTimeouts.clear();
  }

  clearListeners(): void {
    logger.debug('[CallStateManager] 🗑️ Clearing listeners', {
      listenersCount: this.listeners.get('stateChange')?.size || 0,
      timestamp: new Date().toISOString(),
    });
    this.listeners.clear();
  }
}

