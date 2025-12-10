// ============================================================================
// EDUCATION & EXPERIENCE TYPES
// ============================================================================

/**
 * Education degree level options
 */
export type DegreeLevel =
  | 'high_school'
  | 'associate'
  | 'bachelor'
  | 'master'
  | 'doctorate'
  | 'certificate'
  | 'other';

/**
 * Education form data structure
 */
export interface EducationFormData {
  degree_level: DegreeLevel;
  field_of_study?: string;
  institution?: string;
  start_year?: string | number;
  end_year?: string | number;
  is_current?: boolean;
}

/**
 * Experience form data structure
 */
export interface ExperienceFormData {
  title?: string;
  company?: string;
  location?: string;
  start_year?: string | number;
  end_year?: string | number;
  is_current?: boolean;
}

// ============================================================================
// EDUCATION CONSTANTS & HELPERS
// ============================================================================

/**
 * Education level options (for dropdowns)
 */
export const EDUCATION_LEVELS = [
  { label: 'High School', value: 'high_school' as DegreeLevel },
  { label: 'Associate Degree', value: 'associate' as DegreeLevel },
  { label: "Bachelor's Degree", value: 'bachelor' as DegreeLevel },
  { label: "Master's Degree", value: 'master' as DegreeLevel },
  { label: 'Doctorate (PhD)', value: 'doctorate' as DegreeLevel },
  { label: 'Professional Certificate', value: 'certificate' as DegreeLevel },
  { label: 'Other', value: 'other' as DegreeLevel },
] as const;

/**
 * Helper function to get degree label
 */
export function getDegreeLevelLabel(degree: DegreeLevel): string {
  const found = EDUCATION_LEVELS.find((item) => item.value === degree);
  return found?.label || degree;
}

/**
 * Format year range for education display
 */
export function formatYearRange(
  startYear: string | number | null,
  endYear: string | number | null,
  isCurrent: boolean
): string {
  if (!startYear && !endYear) return '';

  const start = startYear ? String(startYear) : '';
  const end = isCurrent ? 'Present' : endYear ? String(endYear) : '';

  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return start;
  } else if (end) {
    return end;
  }

  return '';
}

// ============================================================================
// EXPERIENCE HELPERS
// ============================================================================

/**
 * Format date range for experience display
 */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): string {
  if (!startDate && !endDate) return '';

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const start = formatDate(startDate);
  const end = isCurrent ? 'Present' : formatDate(endDate);

  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return start;
  } else if (end) {
    return end;
  }

  return '';
}

/**
 * Calculate duration in months between two dates
 */
export function calculateDurationMonths(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): number {
  if (!startDate) return 0;

  try {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const totalMonths = years * 12 + months;

    return Math.max(0, totalMonths);
  } catch {
    return 0;
  }
}

/**
 * Format duration in months to human-readable string
 */
export function formatDuration(months: number): string {
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
}

