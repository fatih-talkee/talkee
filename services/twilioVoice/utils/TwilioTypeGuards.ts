import { Call, CallInvite } from '@twilio/voice-react-native-sdk';

/**
 * Type guards and utilities for safely accessing Twilio SDK internal properties
 * Note: Uses type assertions to access internal/private properties of Twilio SDK
 */

/**
 * Safely get call state from a Call object
 */
export function getCallState(call: Call): string | undefined {
  const callAny = call as any;
  return callAny?.state || callAny?._state || callAny?.getState?.();
}

/**
 * Safely check if call is connected
 */
export function isCallConnected(call: Call): boolean {
  const state = getCallState(call);
  return state === 'connected' || state === 'CONNECTED' || state === 'open';
}

/**
 * Safely accept a call invite
 */
export async function acceptCallInvite(
  callInvite: CallInvite,
  options?: { contactHandle?: string }
): Promise<Call> {
  const inviteAny = callInvite as any;
  if (inviteAny?.accept && typeof inviteAny.accept === 'function') {
    return await inviteAny.accept(options);
  }
  throw new Error('CallInvite.accept is not available');
}

/**
 * Safely reject a call invite
 */
export async function rejectCallInvite(callInvite: CallInvite): Promise<void> {
  const inviteAny = callInvite as any;
  if (inviteAny?.reject && typeof inviteAny.reject === 'function') {
    return await inviteAny.reject();
  }
  throw new Error('CallInvite.reject is not available');
}

/**
 * Safely get caller ID from call invite
 */
export function getCallInviteFrom(callInvite: CallInvite): string | undefined {
  const inviteAny = callInvite as any;
  return inviteAny?._from || inviteAny?.from;
}

/**
 * Safely add event listener to call invite
 */
export function addCallInviteEventListener(
  callInvite: CallInvite,
  event: string,
  handler: (err?: any) => void
): void {
  const inviteAny = callInvite as any;
  if (inviteAny?.on && typeof inviteAny.on === 'function') {
    inviteAny.on(event, handler);
  }
}

/**
 * Safely remove event listener from call invite
 */
export function removeCallInviteEventListener(
  callInvite: CallInvite,
  event: string,
  handler: (err?: any) => void
): void {
  const inviteAny = callInvite as any;
  if (inviteAny?.off && typeof inviteAny.off === 'function') {
    inviteAny.off(event, handler);
  }
}

/**
 * Get CallInvite event names (handles SDK version differences)
 */
export function getCallInviteEventNames(): string[] {
  // Try to get from CallInvite.Event enum if available
  const CallInviteAny = CallInvite as any;
  const typedEvents = CallInviteAny?.Event ?? {};

  return [
    typedEvents.Cancelled,
    typedEvents.Canceled,
    typedEvents.Rejected,
    typedEvents.Failed,
    'cancelled',
    'canceled',
    'rejected',
    'failed',
    'cancel',
  ].filter(Boolean) as string[];
}
