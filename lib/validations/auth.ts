import { z } from 'zod';

// Phone number validation (supports international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Login schema - supports both email and phone
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Login schema with phone support (for future use)
export const loginWithPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (val) => phoneRegex.test(val.replace(/\s/g, '')) || emailRegex.test(val),
      {
        message: 'Please enter a valid phone number or email address',
      }
    ),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginWithPhoneFormData = z.infer<typeof loginWithPhoneSchema>;

// Register schema - email based
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// Register schema with phone support (for future use)
export const registerWithPhoneSchema = z
  .object({
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .refine(
        (val) =>
          phoneRegex.test(val.replace(/\s/g, '')) || emailRegex.test(val),
        {
          message: 'Please enter a valid phone number or email address',
        }
      ),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterWithPhoneFormData = z.infer<typeof registerWithPhoneSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// OTP verification schema
export const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only numbers'),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// Setup account schema
export const setupAccountSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Full name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  nickname: z
    .string()
    .max(50, 'Nickname must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s'-]*$/,
      'Nickname can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .optional()
    .or(z.literal('')),
  birthDate: z
    .date()
    .refine((date) => {
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < date.getDate())
      ) {
        return age - 1 >= 13; // Must be at least 13 years old
      }
      return age >= 13;
    }, 'You must be at least 13 years old')
    .refine((date) => {
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < date.getDate())
      ) {
        return age - 1 <= 120; // Reasonable maximum age
      }
      return age <= 120;
    }, 'Please enter a valid birth date'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Please select a gender',
  }),
  selectedInterests: z.array(z.string()).optional(),
  customCategory: z
    .string()
    .min(1, 'Category name is required')
    .max(30, 'Category name must be less than 30 characters')
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Category name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .optional(),
});

export type SetupAccountFormData = z.infer<typeof setupAccountSchema>;

// Step-by-step validation schemas
export const setupAccountStep1Schema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Full name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  nickname: z
    .string()
    .max(50, 'Nickname must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s'-]*$/,
      'Nickname can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .optional()
    .or(z.literal('')),
  birthDate: z
    .date()
    .refine((date) => {
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < date.getDate())
      ) {
        return age - 1 >= 13; // Must be at least 13 years old
      }
      return age >= 13;
    }, 'You must be at least 13 years old')
    .refine((date) => {
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < date.getDate())
      ) {
        return age - 1 <= 120; // Reasonable maximum age
      }
      return age <= 120;
    }, 'Please enter a valid birth date'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Please select a gender',
  }),
});

export const setupAccountStep2Schema = z.object({
  selectedInterests: z.array(z.string()).optional(),
  customCategory: z
    .string()
    .min(1, 'Category name is required')
    .max(30, 'Category name must be less than 30 characters')
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Category name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .optional(),
});
