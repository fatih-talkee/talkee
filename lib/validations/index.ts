import { z } from 'zod';

// Central export for all validation schemas
export * from './auth';

// Helper function to validate API inputs
export function validateApiInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const firstError = result.error.issues[0];
  return {
    success: false,
    error: firstError?.message || 'Validation failed',
  };
}

