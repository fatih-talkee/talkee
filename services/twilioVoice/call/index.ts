export { OutgoingCallHandler } from './OutgoingCallHandler';
export { IncomingCallHandler } from './IncomingCallHandler';

// Re-export types for convenience (they're defined in ../types but used by call handlers)
export type {
  MakeCallParams,
  AcceptIncomingCallParams,
  RejectIncomingCallParams,
} from '../types';
