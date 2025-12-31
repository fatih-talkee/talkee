import { ValidationError } from '../types/ErrorTypes';
import { CallConnectionInfo } from '../types';

/**
 * Business logic validation for call operations
 */
export class CallValidator {
  /**
   * Validate call connection info
   */
  static validateCallConnectionInfo(
    info: CallConnectionInfo,
    debugId?: string
  ): void {
    if (!info.callerId || typeof info.callerId !== 'string') {
      throw new ValidationError(
        'Caller ID is required and must be a string',
        'callerId',
        debugId
      );
    }

    if (!info.calleeId || typeof info.calleeId !== 'string') {
      throw new ValidationError(
        'Callee ID is required and must be a string',
        'calleeId',
        debugId
      );
    }

    if (info.callerId === info.calleeId) {
      throw new ValidationError(
        'Caller and callee cannot be the same',
        'callerId',
        debugId
      );
    }

    if (!['voice', 'video'].includes(info.callType)) {
      throw new ValidationError(
        `Invalid call type: ${info.callType}. Must be 'voice' or 'video'`,
        'callType',
        debugId
      );
    }

    if (info.ratePerMinute !== undefined) {
      if (typeof info.ratePerMinute !== 'number' || info.ratePerMinute < 0) {
        throw new ValidationError(
          'Rate per minute must be a non-negative number',
          'ratePerMinute',
          debugId
        );
      }
    }
  }

  /**
   * Validate call ID format
   */
  static validateCallId(callId: string, debugId?: string): void {
    if (!callId || typeof callId !== 'string') {
      throw new ValidationError(
        'Call ID is required and must be a string',
        'callId',
        debugId
      );
    }

    if (callId.length === 0) {
      throw new ValidationError('Call ID cannot be empty', 'callId', debugId);
    }
  }

  /**
   * Validate rate per minute
   */
  static validateRatePerMinute(
    rate: number | undefined,
    debugId?: string
  ): void {
    if (rate !== undefined) {
      if (typeof rate !== 'number' || rate < 0) {
        throw new ValidationError(
          'Rate per minute must be a non-negative number',
          'ratePerMinute',
          debugId
        );
      }

      if (rate > 10000) {
        throw new ValidationError(
          'Rate per minute exceeds maximum allowed value',
          'ratePerMinute',
          debugId
        );
      }
    }
  }

  /**
   * Validate user balance
   */
  static validateUserBalance(
    balance: number | undefined,
    ratePerMinute?: number,
    debugId?: string
  ): void {
    if (balance !== undefined) {
      if (typeof balance !== 'number' || balance < 0) {
        throw new ValidationError(
          'User balance must be a non-negative number',
          'userBalance',
          debugId
        );
      }

      if (ratePerMinute && balance < ratePerMinute) {
        throw new ValidationError(
          'User balance is insufficient for the call rate',
          'userBalance',
          debugId
        );
      }
    }
  }
}

