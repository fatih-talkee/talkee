/**
 * Global Error Handler
 * 
 * Centralized error handling utilities for the app.
 * Handles different types of errors and provides consistent error messages.
 */

import { toastService } from './toastService';
import { logger } from './logger';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: unknown;
}

/**
 * Error types that can occur in the app
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Parse error and return structured error object
 */
export function parseError(error: unknown): AppError {
  // Supabase/PostgREST error
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as { 
      message: string; 
      code?: string; 
      status?: number;
      details?: string;
      hint?: string;
    };
    return {
      message: supabaseError.message || 'An error occurred',
      code: supabaseError.code,
      statusCode: supabaseError.status,
      originalError: error,
    };
  }

  // React Query error
  if (error && typeof error === 'object' && 'response' in error) {
    const queryError = error as { 
      response?: { 
        status?: number; 
        data?: { message?: string; error?: string } 
      };
      message?: string;
    };
    return {
      message: queryError.response?.data?.message || 
               queryError.response?.data?.error || 
               queryError.message || 
               'An error occurred',
      statusCode: queryError.response?.status,
      originalError: error,
    };
  }

  // Standard Error object
  if (error instanceof Error) {
    return {
      message: error.message || 'An error occurred',
      originalError: error,
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      message: error,
      originalError: error,
    };
  }

  // Unknown error
  return {
    message: 'An unexpected error occurred',
    originalError: error,
  };
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(error: AppError): string {
  const { message, code, statusCode } = error;

  // Network errors
  if (code === 'PGRST301' || message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (code === 'PGRST301' || statusCode === 401 || message.includes('authentication')) {
    return 'Authentication failed. Please log in again.';
  }

  // Authorization errors
  if (statusCode === 403 || message.includes('permission') || message.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }

  // Not found errors
  if (statusCode === 404 || message.includes('not found')) {
    return 'The requested resource was not found.';
  }

  // Server errors
  if (statusCode && statusCode >= 500) {
    return 'Server error. Please try again later.';
  }

  // Validation errors (usually already user-friendly)
  if (code === 'PGRST116' || message.includes('validation')) {
    return message;
  }

  // Default: return original message or generic message
  return message || 'Something went wrong. Please try again.';
}

/**
 * Get error type from error object
 */
export function getErrorType(error: AppError): ErrorType {
  const { code, statusCode, message } = error;

  if (code === 'PGRST301' || message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK;
  }

  if (statusCode === 401 || message.includes('authentication')) {
    return ErrorType.AUTHENTICATION;
  }

  if (statusCode === 403 || message.includes('permission') || message.includes('unauthorized')) {
    return ErrorType.AUTHORIZATION;
  }

  if (statusCode === 404 || message.includes('not found')) {
    return ErrorType.NOT_FOUND;
  }

  if (statusCode && statusCode >= 500) {
    return ErrorType.SERVER;
  }

  if (code === 'PGRST116' || message.includes('validation')) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Handle error and show appropriate toast notification
 */
export function handleError(error: unknown, options?: { showToast?: boolean; title?: string }): AppError {
  const appError = parseError(error);
  const errorMessage = getErrorMessage(appError);
  const errorType = getErrorType(appError);

  // Log error
  logger.error('Error handled', appError.originalError, {
    type: errorType,
    message: errorMessage,
  });

  // Show toast notification if enabled (default: true)
  if (options?.showToast !== false) {
    const title = options?.title || getErrorTitle(errorType);
    
    toastService.error({
      title,
      message: errorMessage,
    });
  }

  return appError;
}

/**
 * Get error title based on error type
 */
function getErrorTitle(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Network Error';
    case ErrorType.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorType.AUTHORIZATION:
      return 'Access Denied';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.SERVER:
      return 'Server Error';
    case ErrorType.VALIDATION:
      return 'Validation Error';
    default:
      return 'Error';
  }
}

/**
 * Safe async wrapper - catches errors and handles them automatically
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  options?: { showToast?: boolean; title?: string }
): Promise<T | null> {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Safe async wrapper that returns error instead of null
 */
export async function safeAsyncWithError<T>(
  asyncFn: () => Promise<T>,
  options?: { showToast?: boolean; title?: string }
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await asyncFn();
    return { data, error: null };
  } catch (error) {
    const appError = handleError(error, options);
    return { data: null, error: appError };
  }
}

