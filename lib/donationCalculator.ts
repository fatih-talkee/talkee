export interface EarningsBreakdown {
  grossEarnings: number;
  platformCommission: number;
  platformCommissionRate: number;
  donationAmount: number;
  donationPercentage: number;
  netEarnings: number;
  currency: 'USD' | 'TRY' | 'EUR';
}

export interface SelectedCharity {
  id: string;
  name: string;
  logo: string;
  percentage: number;
}

export interface CharitySettings {
  enabled: boolean;
  donationPercentage: number; // 0-100 (kept for backward compatibility)
  selectedCharities: SelectedCharity[]; // Changed from single selectedCharityId to array
  showPublicBadge: boolean;
  monthlyGoal?: number;
}

/**
 * Calculate complete earnings breakdown including platform commission and charity donation
 *
 * Calculation order:
 * 1. Start with gross earnings
 * 2. Calculate donation from gross (donation is from gross earnings, not net)
 * 3. Calculate platform commission from gross
 * 4. Net earnings = gross - commission - donation
 *
 * @param grossEarnings - Total earnings before any deductions
 * @param platformCommissionRate - Platform commission rate (e.g., 0.20 for 20%)
 * @param donationPercentage - Charity donation percentage (0-100)
 * @param currency - Currency code
 * @returns Complete earnings breakdown
 */
export function calculateEarningsWithDonation(
  grossEarnings: number,
  platformCommissionRate: number,
  donationPercentage: number,
  currency: 'USD' | 'TRY' | 'EUR' = 'USD'
): EarningsBreakdown {
  // Validate inputs
  if (grossEarnings < 0) {
    throw new Error('Gross earnings cannot be negative');
  }
  if (platformCommissionRate < 0 || platformCommissionRate > 1) {
    throw new Error('Platform commission rate must be between 0 and 1');
  }
  if (donationPercentage < 0 || donationPercentage > 100) {
    throw new Error('Donation percentage must be between 0 and 100');
  }

  // Calculate platform commission
  const platformCommission = grossEarnings * platformCommissionRate;

  // Calculate donation (from gross earnings)
  const donationAmount = grossEarnings * (donationPercentage / 100);

  // Calculate net earnings
  const netEarnings = grossEarnings - platformCommission - donationAmount;

  return {
    grossEarnings,
    platformCommission,
    platformCommissionRate,
    donationAmount,
    donationPercentage,
    netEarnings,
    currency,
  };
}

/**
 * Calculate estimated monthly donation based on average daily earnings
 *
 * @param averageDailyEarnings - Average daily gross earnings
 * @param donationPercentage - Charity donation percentage (0-100)
 * @param daysPerMonth - Number of days per month (default: 30)
 * @returns Estimated monthly donation amount
 */
export function estimateMonthlyDonation(
  averageDailyEarnings: number,
  donationPercentage: number,
  daysPerMonth: number = 30
): number {
  if (averageDailyEarnings < 0) {
    throw new Error('Average daily earnings cannot be negative');
  }
  if (donationPercentage < 0 || donationPercentage > 100) {
    throw new Error('Donation percentage must be between 0 and 100');
  }
  if (daysPerMonth <= 0) {
    throw new Error('Days per month must be positive');
  }

  const monthlyEarnings = averageDailyEarnings * daysPerMonth;
  return monthlyEarnings * (donationPercentage / 100);
}

/**
 * Calculate donation amount from a single call
 *
 * @param callEarnings - Gross earnings from the call
 * @param donationPercentage - Charity donation percentage (0-100)
 * @returns Donation amount for this call
 */
export function calculateCallDonation(
  callEarnings: number,
  donationPercentage: number
): number {
  if (callEarnings < 0) {
    throw new Error('Call earnings cannot be negative');
  }
  if (donationPercentage < 0 || donationPercentage > 100) {
    throw new Error('Donation percentage must be between 0 and 100');
  }

  return callEarnings * (donationPercentage / 100);
}

/**
 * Format currency amount for display
 *
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'TRY' | 'EUR'
): string {
  const symbols: Record<'USD' | 'TRY' | 'EUR', string> = {
    USD: '$',
    TRY: '₺',
    EUR: '€',
  };

  const symbol = symbols[currency];
  const formatted = amount.toFixed(2);

  return `${symbol}${formatted}`;
}

/**
 * Calculate estimated annual donation
 *
 * @param monthlyDonation - Monthly donation amount
 * @param monthsPerYear - Number of months (default: 12)
 * @returns Estimated annual donation
 */
export function estimateAnnualDonation(
  monthlyDonation: number,
  monthsPerYear: number = 12
): number {
  if (monthlyDonation < 0) {
    throw new Error('Monthly donation cannot be negative');
  }
  if (monthsPerYear <= 0 || monthsPerYear > 12) {
    throw new Error('Months per year must be between 1 and 12');
  }

  return monthlyDonation * monthsPerYear;
}

/**
 * Calculate call earnings from duration and rate
 * Utility function for calculating earnings
 *
 * @param durationInSeconds - Call duration in seconds
 * @param ratePerMinute - Rate per minute
 * @returns Gross earnings from the call
 */
export function calculateCallEarnings(
  durationInSeconds: number,
  ratePerMinute: number
): number {
  if (durationInSeconds < 0) {
    throw new Error('Duration cannot be negative');
  }
  if (ratePerMinute < 0) {
    throw new Error('Rate per minute cannot be negative');
  }

  const minutes = durationInSeconds / 60;
  return minutes * ratePerMinute;
}

/**
 * Validate donation percentage
 *
 * @param percentage - Percentage to validate
 * @returns True if valid, false otherwise
 */
export function isValidDonationPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100 && !isNaN(percentage);
}

/**
 * Get default charity settings
 *
 * @returns Default charity settings object
 */
export function getDefaultCharitySettings(): CharitySettings {
  return {
    enabled: true,
    donationPercentage: 0,
    selectedCharities: [
      {
        id: '1',
        name: 'Global Education Fund',
        logo: 'https://images.pexels.com/photos/8500398/pexels-photo-8500398.jpeg?auto=compress&cs=tinysrgb&w=100',
        percentage: 15,
      },
      {
        id: '2',
        name: 'Clean Water Initiative',
        logo: 'https://images.pexels.com/photos/2382893/pexels-photo-2382893.jpeg?auto=compress&cs=tinysrgb&w=100',
        percentage: 10,
      },
      {
        id: '3',
        name: 'Rainforest Guardians',
        logo: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=100',
        percentage: 20,
      },
    ],
    showPublicBadge: true,
  };
}

/**
 * Validate charity selections
 *
 * @param charities - Array of selected charities with percentages
 * @returns Validation result with error message if invalid
 */
export function validateCharitySelections(
  charities: SelectedCharity[]
): { valid: boolean; error?: string } {
  if (charities.length === 0) {
    return { valid: false, error: 'At least one organization must be selected' };
  }

  const totalPercentage = charities.reduce((sum, c) => sum + c.percentage, 0);
  if (totalPercentage > 100) {
    return {
      valid: false,
      error: `Total allocation (${totalPercentage}%) cannot exceed 100%`
    };
  }

  if (charities.some(c => c.percentage <= 0)) {
    return { valid: false, error: 'All allocations must be greater than 0%' };
  }

  if (charities.some(c => !c.id || !c.name)) {
    return { valid: false, error: 'Invalid charity data' };
  }

  return { valid: true };
}

/**
 * Format duration from seconds to readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "15m 30s")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    return '0s';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Calculate percentage of total
 *
 * @param part - Part value
 * @param total - Total value
 * @returns Percentage (0-100)
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return (part / total) * 100;
}
