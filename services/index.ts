// services/index.ts
// Main barrel export for all services

// Export Supabase services (includes professionals, categories, favorites, users)
export * from './supabase';

// Export other service types and functions
// Note: calls, reviews, notifications services may need to be implemented or moved to supabase/
export * from './calls.service';
export * from './notifications.service';
export * from './callRecordLookup.service';
export * from './rateCalculation.service';
export * from './incomingCallDetails.service';
