/**
 * IMPROVED DATABASE TYPES - TALKEE APP
 * Enhanced with enums, better type safety, and consistent structure
 */

// ============================================================================
// ENUMS (For better type safety and autocomplete)
// ============================================================================

export enum UserRole {
  USER = 'user',
  PROFESSIONAL = 'professional',
  ADMIN = 'admin',
}

export enum CallStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MISSED = 'missed',
}

export enum CallType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum NotificationType {
  CALL_REQUEST = 'call_request',
  CALL_STARTED = 'call_started',
  CALL_ENDED = 'call_ended',
  REVIEW = 'review',
  PAYMENT = 'payment',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSES = 'expenses',
  CREDIT_PURCHASE = 'credit_purchase',
  CALL_EARNING = 'call_earning',
  CALL_EXPENSE = 'call_expense',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed',
}

export enum Currency {
  USD = 'USD',
  TRY = 'TRY',
  EUR = 'EUR',
}

export enum CharityCategory {
  EDUCATION = 'education',
  HEALTH = 'health',
  ENVIRONMENT = 'environment',
  POVERTY = 'poverty',
  ANIMALS = 'animals',
  HUMAN_RIGHTS = 'human_rights',
  OTHER = 'other',
}

export enum DegreeLevel {
  HIGH_SCHOOL = 'high_school',
  ASSOCIATE = 'associate',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  DOCTORATE = 'doctorate',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

// ============================================================================
// BASE DATABASE TYPES (Direct from DB schema)
// ============================================================================

/**
 * Users table - Core user entity
 */
export interface User {
  id: string;
  auth_id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  wallet_balance: number;
  role: UserRole;

  // Email fields (OAuth support)
  primary_email: string | null;
  oauth_emails: Record<string, string>;
  oauth_providers: string[];

  // Account linking
  linked_accounts: string[];
  is_primary_account: boolean;
  merged_from: string[] | null;
  merged_into: string | null;

  // Verification
  is_verified: boolean;
  verification_method: string | null;
  verification_date: string | null;

  // App preferences
  theme_preference: 'light' | 'dark' | 'system';
  language_preference: 'en' | 'tr' | 'fr' | 'es' | 'de';

  // Soft delete
  is_deleted: boolean;
  deleted_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface UserInsert
  extends Omit<
    User,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'wallet_balance'
    | 'role'
    | 'is_verified'
    | 'oauth_emails'
    | 'oauth_providers'
    | 'linked_accounts'
    | 'is_primary_account'
    | 'theme_preference'
    | 'language_preference'
  > {
  id?: string;
  wallet_balance?: number;
  role?: UserRole;
  is_verified?: boolean;
  oauth_emails?: Record<string, string>;
  oauth_providers?: string[];
  linked_accounts?: string[];
  is_primary_account?: boolean;
  theme_preference?: 'light' | 'dark' | 'system';
  language_preference?: 'en' | 'tr' | 'fr' | 'es' | 'de';
}

export interface UserUpdate
  extends Partial<Omit<User, 'id' | 'auth_id' | 'created_at' | 'updated_at'>> {}

/**
 * Category Groups table - Organizational groups for categories
 */
export interface CategoryGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string | null;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Categories table - Professional service categories
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  emoji: string | null;
  group_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Professionals table - Professional profiles
 * UPDATED: Removed rating, experience_years, response_time_minutes, education
 */
export interface Professional {
  id: string;
  user_id: string;
  category_id: string;
  title: string | null;
  profession: string | null;
  bio: string;
  specialties: string[];
  languages: string[];
  skills_certifications: string[];
  rate_per_minute: number;
  total_calls: number;
  total_minutes: number;
  is_available: boolean;
  is_active: boolean;
  is_public: boolean;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalInsert
  extends Omit<
    Professional,
    | 'id'
    | 'total_calls'
    | 'total_minutes'
    | 'created_at'
    | 'updated_at'
    | 'is_available'
    | 'is_verified'
    | 'is_featured'
    | 'is_active'
  > {
  id?: string;
  is_available?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  total_calls?: number;
  is_featured?: boolean;
  total_minutes?: number;
}

export interface ProfessionalUpdate
  extends Partial<
    Omit<Professional, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  > {}

/**
 * Professional Categories - Junction table for multiple categories per professional
 */
export interface ProfessionalCategory {
  id: string;
  professional_id: string;
  category_id: string;
  created_at: string;
}

export interface ProfessionalCategoryInsert
  extends Omit<ProfessionalCategory, 'id' | 'created_at'> {
  id?: string;
}

/**
 * Availabilities table - Professional availability schedules
 */
export interface Availability {
  id: string;
  professional_id: string;
  available_at: 'every' | 'specific';
  days: string[] | null;
  date: string | null;
  start_hour: string;
  end_hour: string;
  currency: string;
  price_per_minute: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityInsert
  extends Omit<Availability, 'id' | 'created_at' | 'updated_at' | 'currency'> {
  id?: string;
  currency?: string;
}

export interface AvailabilityUpdate
  extends Partial<
    Omit<Availability, 'id' | 'professional_id' | 'created_at' | 'updated_at'>
  > {}

/**
 * Professional Educations table - Education history
 * NEW: Replaces single education field with multiple entries
 */
export interface ProfessionalEducation {
  id: string;
  professional_id: string;
  degree_level: DegreeLevel;
  institution: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalEducationInsert
  extends Omit<
    ProfessionalEducation,
    'id' | 'created_at' | 'updated_at' | 'is_current' | 'sort_order'
  > {
  id?: string;
  is_current?: boolean;
  sort_order?: number;
}

export interface ProfessionalEducationUpdate
  extends Partial<
    Omit<
      ProfessionalEducation,
      'id' | 'professional_id' | 'created_at' | 'updated_at'
    >
  > {}

/**
 * Professional Experiences table - Work experience history
 * NEW: Replaces experience_years with detailed experience entries
 */
export interface ProfessionalExperience {
  id: string;
  professional_id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalExperienceInsert
  extends Omit<
    ProfessionalExperience,
    'id' | 'created_at' | 'updated_at' | 'is_current' | 'sort_order'
  > {
  id?: string;
  is_current?: boolean;
  sort_order?: number;
}

export interface ProfessionalExperienceUpdate
  extends Partial<
    Omit<
      ProfessionalExperience,
      'id' | 'professional_id' | 'created_at' | 'updated_at'
    >
  > {}

/**
 * Favorites table - User favorites
 */
export interface Favorite {
  id: string;
  user_id: string;
  professional_id: string;
  created_at: string;
}

export interface FavoriteInsert extends Omit<Favorite, 'id' | 'created_at'> {
  id?: string;
}

/**
 * Calls table - Call records
 */
export interface Call {
  id: string;
  caller_id: string;
  professional_id: string;
  status: CallStatus;
  call_type: CallType;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  rate_per_minute: number;
  total_cost: number;
  rating: number | null;
  notes: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallInsert
  extends Omit<
    Call,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'status'
    | 'call_type'
    | 'duration_minutes'
    | 'total_cost'
  > {
  id?: string;
  status?: CallStatus;
  call_type?: CallType;
  duration_minutes?: number;
  total_cost?: number;
}

export interface CallUpdate
  extends Partial<
    Omit<
      Call,
      'id' | 'caller_id' | 'professional_id' | 'created_at' | 'updated_at'
    >
  > {}

/**
 * Reviews table - Call reviews
 */
export interface Review {
  id: string;
  call_id: string;
  professional_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewInsert
  extends Omit<Review, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export interface ReviewUpdate
  extends Partial<
    Omit<
      Review,
      | 'id'
      | 'call_id'
      | 'professional_id'
      | 'reviewer_id'
      | 'created_at'
      | 'updated_at'
    >
  > {}

/**
 * Notifications table - User notifications
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert
  extends Omit<Notification, 'id' | 'created_at' | 'data' | 'is_read'> {
  id?: string;
  data?: Record<string, any>;
  is_read?: boolean;
}

export interface NotificationUpdate
  extends Partial<Omit<Notification, 'id' | 'user_id' | 'created_at'>> {}

/**
 * Transactions table - Financial transactions
 */
export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  call_id: string | null;
  status: TransactionStatus;
  created_at: string;
}

export interface TransactionInsert
  extends Omit<Transaction, 'id' | 'created_at' | 'status'> {
  id?: string;
  status?: TransactionStatus;
}

/**
 * Charities table - Charity organizations
 */
export interface Charity {
  id: string;
  name: string;
  short_description: string;
  full_description: string;
  logo: string;
  category: CharityCategory;
  country: string;
  website: string | null;
  verified: boolean;
  featured_image: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Donations table - Donation records
 */
export interface Donation {
  id: string;
  user_id: string;
  call_id: string;
  charity_id: string;
  amount: number;
  currency: Currency;
  transaction_id: string | null;
  created_at: string;
}

export interface DonationInsert
  extends Omit<Donation, 'id' | 'created_at' | 'currency'> {
  id?: string;
  currency?: Currency;
}

/**
 * User charity settings table
 */
export interface UserCharitySetting {
  id: string;
  user_id: string;
  enabled: boolean;
  show_public_badge: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCharitySettingInsert
  extends Omit<
    UserCharitySetting,
    'id' | 'created_at' | 'updated_at' | 'enabled' | 'show_public_badge'
  > {
  id?: string;
  enabled?: boolean;
  show_public_badge?: boolean;
}

export interface UserCharitySettingUpdate
  extends Partial<
    Omit<UserCharitySetting, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  > {}

/**
 * User charity allocations table
 */
export interface UserCharityAllocation {
  id: string;
  user_id: string;
  charity_id: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface UserCharityAllocationInsert
  extends Omit<UserCharityAllocation, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export interface UserCharityAllocationUpdate
  extends Partial<
    Omit<
      UserCharityAllocation,
      'id' | 'user_id' | 'charity_id' | 'created_at' | 'updated_at'
    >
  > {}

/**
 * Blocked users table
 */
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface BlockedUserInsert
  extends Omit<BlockedUser, 'id' | 'created_at'> {
  id?: string;
}

// ============================================================================
// PROFESSIONAL FEEDS (ONE-WAY COMMUNICATION)
// ============================================================================

export interface ProfessionalFeed {
  id: string;
  professional_id: string;
  content: string;
  is_active: boolean;
  is_pinned: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProfessionalFeedWithDetails extends ProfessionalFeed {
  professional_title: string;
  professional_name: string;
  professional_avatar: string | null;
  category_id: string;
  category_name: string;
  category_emoji: string | null;
}

export interface CreateFeedRequest {
  content: string;
  is_pinned?: boolean;
}

export interface UpdateFeedRequest {
  content?: string;
  is_pinned?: boolean;
  is_active?: boolean;
}

export interface FeedQueryParams {
  professional_id?: string;
  limit?: number;
  offset?: number;
  include_deleted?: boolean;
  only_pinned?: boolean;
}

export interface FeedResponse {
  success: boolean;
  feed?: ProfessionalFeedWithDetails;
  feeds?: ProfessionalFeedWithDetails[];
  error?: string;
  total_count?: number;
}

export const FEED_CONTENT_MIN_LENGTH = 10;
export const FEED_CONTENT_MAX_LENGTH = 1000;

// ============================================================================
// EDUCATION & EXPERIENCE HELPERS
// ============================================================================

/**
 * Education level options (for dropdowns)
 */
export const EDUCATION_LEVELS = [
  { label: 'High School', value: 'high_school' },
  { label: 'Associate Degree', value: 'associate' },
  { label: "Bachelor's Degree", value: 'bachelor' },
  { label: "Master's Degree", value: 'master' },
  { label: 'Doctorate (PhD)', value: 'doctorate' },
  { label: 'Professional Certificate', value: 'certificate' },
  { label: 'Other', value: 'other' },
] as const;

/**
 * Helper function to get degree label
 */
export function getDegreeLevelLabel(degree: DegreeLevel): string {
  const found = EDUCATION_LEVELS.find((item) => item.value === degree);
  return found?.label || degree;
}

/**
 * Helper function to format year range
 */
export function formatYearRange(
  startYear: number | null,
  endYear: number | null,
  isCurrent: boolean
): string {
  if (!startYear) return 'N/A';
  if (isCurrent) return `${startYear} - Present`;
  if (!endYear) return `${startYear}`;
  return `${startYear} - ${endYear}`;
}

/**
 * Helper function to format date range
 */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): string {
  if (!startDate) return 'N/A';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const start = formatDate(startDate);
  if (isCurrent) return `${start} - Present`;
  if (!endDate) return start;
  return `${start} - ${formatDate(endDate)}`;
}

/**
 * Helper function to calculate duration in months
 */
export function calculateDurationMonths(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): number {
  if (!startDate) return 0;

  const start = new Date(startDate);
  const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date();

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();

  return years * 12 + months;
}

/**
 * Helper function to format duration
 */
export function formatDuration(months: number): string {
  if (months < 1) return 'Less than a month';
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${
    remainingMonths === 1 ? 'month' : 'months'
  }`;
}

// ============================================================================
// UI FORM TYPES (for become professional flow)
// ============================================================================

/**
 * Education form data (for UI)
 */
export interface EducationFormData {
  id?: string; // For editing existing entries
  degree_level: DegreeLevel;
  institution?: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_current?: boolean;
  description?: string;
}

/**
 * Experience form data (for UI)
 */
export interface ExperienceFormData {
  id?: string; // For editing existing entries
  title?: string;
  company?: string;
  location?: string;
  start_date?: Date | string;
  end_date?: Date | string;
  is_current?: boolean;
  description?: string;
}

/**
 * Validate education entry
 */
export function validateEducation(data: EducationFormData): string | null {
  if (!data.degree_level) {
    return 'Degree level is required';
  }

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 10;

  // Validate start_year
  if (data.start_year !== undefined && data.start_year !== null) {
    if (data.start_year < 1900 || data.start_year > maxYear) {
      return `Start year must be between 1900 and ${maxYear}`;
    }
  }

  // Validate end_year
  if (
    data.end_year !== undefined &&
    data.end_year !== null &&
    !data.is_current
  ) {
    if (data.end_year < 1900 || data.end_year > maxYear) {
      return `End year must be between 1900 and ${maxYear}`;
    }

    // Check year order
    if (data.start_year && data.end_year < data.start_year) {
      return 'End year must be after start year';
    }
  }

  return null;
}

/**
 * Validate experience entry
 */
export function validateExperience(data: ExperienceFormData): string | null {
  // Validate date order
  if (data.start_date && data.end_date && !data.is_current) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);

    // Check if dates are valid
    if (isNaN(start.getTime())) {
      return 'Invalid start date';
    }
    if (isNaN(end.getTime())) {
      return 'Invalid end date';
    }

    // Check date order
    if (end < start) {
      return 'End date must be after start date';
    }
  }

  // Validate start_date range (not before 1900)
  if (data.start_date) {
    const start = new Date(data.start_date);
    const minDate = new Date('1900-01-01');

    if (start < minDate) {
      return 'Start date cannot be before year 1900';
    }
  }

  return null;
}

// ============================================================================
// JOINED/EXTENDED TYPES (For queries with relations)
// ============================================================================

/**
 * Professional with joined user and category data
 */
export interface ProfessionalWithRelations extends Professional {
  users?: Pick<User, 'id' | 'name' | 'avatar_url' | 'is_verified'>;
  categories?: Pick<Category, 'id' | 'name' | 'slug' | 'icon_name'>;
  reviews?: Array<ReviewWithUser>;
  educations?: ProfessionalEducation[];
  experiences?: ProfessionalExperience[];
  total_years_experience?: number;
  highest_degree?: DegreeLevel | null;
}

/**
 * Review with reviewer info
 */
export interface ReviewWithUser extends Review {
  users?: Pick<User, 'id' | 'name' | 'avatar_url' | 'is_verified'>;
}

/**
 * Call with caller and professional info
 */
export interface CallWithRelations extends Call {
  caller?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  professional?: {
    id: string;
    user_id: string;
    rate_per_minute: number;
    users?: Pick<User, 'id' | 'name' | 'avatar_url'>;
    categories?: Pick<Category, 'id' | 'name' | 'icon_name'>;
  };
}

/**
 * Favorite with professional details
 */
export interface FavoriteWithProfessional extends Favorite {
  professional?: ProfessionalWithRelations;
}

/**
 * Donation with charity info
 */
export interface DonationWithCharity extends Donation {
  charity?: Pick<Charity, 'id' | 'name' | 'logo'>;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ProfessionalFilters {
  categoryId?: string;
  minRating?: number;
  maxRatePerMinute?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  languages?: string[];
  searchQuery?: string;
}

export interface CallFilters {
  status?: CallStatus;
  callType?: CallType;
  startDate?: string;
  endDate?: string;
}

export interface TransactionFilters {
  type?: TransactionType | 'all';
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
}

export interface ReviewFilters {
  minRating?: number;
  professionalId?: string;
  reviewerId?: string;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// NOTIFICATION SETTINGS (UI Types)
// ============================================================================

export interface NotificationSettings {
  push_enabled: boolean;
  call_notifications: boolean;
  review_notifications: boolean;
  payment_notifications: boolean;
  message_notifications: boolean;
  promotional_notifications: boolean;
}

// ============================================================================
// LEGACY TYPES (For backward compatibility - can be removed later)
// ============================================================================

/**
 * @deprecated Use Transaction instead
 */
export interface WalletTransaction extends Transaction {
  timestamp?: string;
  professionalId?: string;
  professional?: ProfessionalWithRelations;
  callerId?: string;
  caller?: ProfessionalWithRelations;
  duration?: number;
}

/**
 * @deprecated Use CallWithRelations instead
 */
export interface CallHistory {
  id: string;
  professionalId: string;
  professional?: ProfessionalWithRelations;
  duration: number;
  cost: number;
  date: string;
  type: CallType;
  status: 'completed' | 'missed' | 'cancelled';
  direction?: 'incoming' | 'outgoing';
  isBlocked?: boolean;
}

/**
 * @deprecated Use Donation instead
 */
export interface DonationRecord {
  id: string;
  callId: string;
  charityId: string;
  charityName: string;
  amount: number;
  currency: Currency;
  date: Date | string;
  callDuration: number;
  grossEarnings: number;
  donationPercentage: number;
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

export interface CharityOrganization extends Charity {}

export interface SelectedCharity {
  id: string;
  name: string;
  logo: string;
  percentage: number;
}

export interface CharitySettings {
  enabled: boolean;
  showPublicBadge: boolean;
  selectedCharities: SelectedCharity[];
  donationPercentage?: number;
}

export interface MenuSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    badge?: string;
  }[];
}

export interface FilterState {
  priceRange: [number, number];
  availability: 'all' | 'online' | 'offline' | 'quick-response';
  languages: string[];
  categories: string[];
  minimumCallTime: number;
  verifiedOnly: boolean;
  minimumSuccessfulCalls: number;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  gradient: string[];
}

// ============================================================================
// INVOICE TYPES (Profile page - invoices)
// ============================================================================

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface Invoice {
  id: string;
  call_id: string;
  caller_id: string;
  professional_id: string;
  invoice_number: string;
  subtotal: number;
  service_fee: number;
  tax: number;
  total_amount: number;
  currency: string;
  call_duration_minutes: number;
  rate_per_minute: number;
  call_date: string;
  invoice_date: string;
  due_date: string | null;
  paid_at: string | null;
  status: InvoiceStatus;
  pdf_url: string | null;
  image_url: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert
  extends Omit<
    Invoice,
    | 'id'
    | 'invoice_number'
    | 'created_at'
    | 'updated_at'
    | 'status'
    | 'metadata'
    | 'invoice_date'
  > {
  id?: string;
  invoice_number?: string;
  status?: InvoiceStatus;
  metadata?: Record<string, any>;
}

export interface InvoiceUpdate
  extends Partial<
    Omit<
      Invoice,
      'id' | 'call_id' | 'invoice_number' | 'created_at' | 'updated_at'
    >
  > {}

export interface InvoiceWithRelations extends Invoice {
  caller?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  professional?: {
    id: string;
    user_id: string;
    users?: Pick<User, 'id' | 'name' | 'avatar_url'>;
    categories?: Pick<Category, 'id' | 'name'>;
  };
  call?: Pick<Call, 'id' | 'status' | 'call_type' | 'start_time' | 'end_time'>;
}

// ============================================================================
// PROFILE STATS TYPES
// ============================================================================

export interface UserProfileStats {
  total_calls: number;
  favorites_count: number;
  blocked_users_count: number;
  invoices_count: number;
  total_spent: number;
  member_since: string;
}

export interface UserProfileData {
  user: User;
  stats: UserProfileStats;
  is_professional: boolean;
  professional?: Professional;
}

// ============================================================================
// TYPE GUARDS (For runtime type checking)
// ============================================================================

export function isCallStatus(value: string): value is CallStatus {
  return Object.values(CallStatus).includes(value as CallStatus);
}

export function isCallType(value: string): value is CallType {
  return Object.values(CallType).includes(value as CallType);
}

export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export function isNotificationType(value: string): value is NotificationType {
  return Object.values(NotificationType).includes(value as NotificationType);
}

export function isDegreeLevel(value: string): value is DegreeLevel {
  return Object.values(DegreeLevel).includes(value as DegreeLevel);
}
