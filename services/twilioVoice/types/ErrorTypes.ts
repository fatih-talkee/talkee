/**
 * Base error class for Twilio Voice service errors
 */
export class TwilioVoiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly debugId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'TwilioVoiceError';
    Object.setPrototypeOf(this, TwilioVoiceError.prototype);
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends TwilioVoiceError {
  constructor(message: string = 'User not authenticated', debugId?: string) {
    super(message, 'AUTH_ERROR', debugId);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * SDK initialization errors
 */
export class SdkInitializationError extends TwilioVoiceError {
  constructor(
    message: string = 'Voice SDK not initialized',
    debugId?: string,
    originalError?: Error
  ) {
    super(message, 'SDK_INIT_ERROR', debugId, originalError);
    this.name = 'SdkInitializationError';
    Object.setPrototypeOf(this, SdkInitializationError.prototype);
  }
}

/**
 * Call operation errors
 */
export class CallOperationError extends TwilioVoiceError {
  constructor(
    message: string,
    public readonly operation: string,
    debugId?: string,
    originalError?: Error
  ) {
    super(message, 'CALL_OPERATION_ERROR', debugId, originalError);
    this.name = 'CallOperationError';
    Object.setPrototypeOf(this, CallOperationError.prototype);
  }
}

/**
 * Permission errors
 */
export class PermissionError extends TwilioVoiceError {
  constructor(
    message: string = 'Permission not granted',
    public readonly permission: string,
    debugId?: string
  ) {
    super(message, 'PERMISSION_ERROR', debugId);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends TwilioVoiceError {
  constructor(
    message: string,
    debugId?: string,
    originalError?: Error
  ) {
    super(message, 'NETWORK_ERROR', debugId, originalError);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends TwilioVoiceError {
  constructor(
    message: string,
    public readonly field?: string,
    debugId?: string
  ) {
    super(message, 'VALIDATION_ERROR', debugId);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

