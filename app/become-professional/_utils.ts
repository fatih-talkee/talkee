import { timeOptions } from './_constants';
import type { Availability } from './_types';

// Time format helper
export const formatTimeInput = (text: string): string => {
  // Remove all non-numeric characters
  const numericValue = text.replace(/[^\d]/g, '');

  // Limit to 4 digits
  const limited = numericValue.slice(0, 4);

  // Format as HH:MM
  if (limited.length === 0) {
    return '';
  } else if (limited.length <= 2) {
    return limited;
  } else {
    // Format as HH:MM
    const hours = limited.slice(0, 2);
    const minutes = limited.slice(2, 4);
    return `${hours}:${minutes}`;
  }
};

export const validateTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Compare two time strings (HH:MM format)
export const compareTimes = (time1: string, time2: string): number => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const total1 = h1 * 60 + m1;
  const total2 = h2 * 60 + m2;
  return total1 - total2;
};

// Get filtered time options based on start/end hour constraints
export const getFilteredTimeOptions = (
  timePickerType: 'start' | 'end' | null,
  startHour?: string,
  endHour?: string
): typeof timeOptions => {
  if (!timePickerType) return timeOptions;

  if (timePickerType === 'start') {
    // For start hour: show all times before end hour (if end hour is set)
    if (endHour) {
      return timeOptions.filter(
        (time) => compareTimes(time.value, endHour) < 0
      );
    }
    return timeOptions;
  } else {
    // For end hour: show all times after start hour (if start hour is set)
    if (startHour) {
      return timeOptions.filter(
        (time) => compareTimes(time.value, startHour) > 0
      );
    }
    return timeOptions;
  }
};

// Validate video call fields
const validateVideoCall = (
  formData: Partial<Availability>
): string | null => {
  // If video call is enabled, rate is required
  if (formData.videoCallEnabled) {
    if (
      !formData.videoCallRatePerMinute ||
      formData.videoCallRatePerMinute.trim() === ''
    ) {
      return 'Please enter video call price per minute';
    }

    const videoPrice = parseFloat(formData.videoCallRatePerMinute);
    if (isNaN(videoPrice) || videoPrice <= 0) {
      return 'Please enter a valid video call price (greater than 0)';
    }
  }

  return null;
};

// Check if two availabilities overlap
// Returns true if they overlap, false otherwise
export const checkAvailabilityOverlap = (
  availability1: Availability,
  availability2: Availability
): boolean => {
  // Urgent calls don't overlap with scheduled ones (they're always available)
  if (
    availability1.availableAt === 'urgent' ||
    availability2.availableAt === 'urgent'
  ) {
    return false;
  }

  // Both must be scheduled (not urgent)
  if (
    availability1.availableAt === 'urgent' ||
    availability2.availableAt === 'urgent'
  ) {
    return false;
  }

  // Check if one is 'specific' (one-time date) and the other is 'every' (periodic)
  const isSpecific1 = availability1.availableAt === 'specific';
  const isSpecific2 = availability2.availableAt === 'specific';
  const isEvery1 = availability1.availableAt === 'every';
  const isEvery2 = availability2.availableAt === 'every';

  // Case 1: Both are 'specific' (one-time dates)
  if (isSpecific1 && isSpecific2) {
    if (!availability1.date || !availability2.date) {
      return false;
    }

    // Check if dates are the same
    const date1 = new Date(availability1.date);
    const date2 = new Date(availability2.date);
    const sameDate =
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();

    if (!sameDate) {
      return false; // Different dates, no overlap
    }

    // Same date, check time overlap
    if (
      !availability1.startHour ||
      !availability1.endHour ||
      !availability2.startHour ||
      !availability2.endHour
    ) {
      return false;
    }

    // Check if time ranges overlap
    const start1 = compareTimes(availability1.startHour, availability2.startHour);
    const end1 = compareTimes(availability1.endHour, availability2.endHour);
    const start2 = compareTimes(availability2.startHour, availability1.startHour);
    const end2 = compareTimes(availability2.endHour, availability1.endHour);

    // Overlap if: (start1 <= start2 < end1) OR (start2 <= start1 < end2)
    return (
      (start1 <= 0 && compareTimes(availability2.startHour, availability1.endHour) < 0) ||
      (start2 <= 0 && compareTimes(availability1.startHour, availability2.endHour) < 0)
    );
  }

  // Case 2: One is 'specific' and the other is 'every' (periodic)
  if ((isSpecific1 && isEvery2) || (isEvery1 && isSpecific2)) {
    const specific = isSpecific1 ? availability1 : availability2;
    const periodic = isEvery1 ? availability1 : availability2;

    if (!specific.date || !periodic.days || periodic.days.length === 0) {
      return false;
    }

    // Get day of week for specific date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const specificDate = new Date(specific.date);
    const dayOfWeek = specificDate.getDay();
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const specificDayName = dayNames[dayOfWeek];

    // Check if specific date's day matches any day in periodic availability
    const dayMatch = periodic.days.some(
      (day) => day.toLowerCase() === specificDayName.toLowerCase()
    );

    if (!dayMatch) {
      return false; // Different days, no overlap
    }

    // Same day, check time overlap
    if (
      !specific.startHour ||
      !specific.endHour ||
      !periodic.startHour ||
      !periodic.endHour
    ) {
      return false;
    }

    // Check if time ranges overlap
    const start1 = compareTimes(specific.startHour, periodic.startHour);
    const end1 = compareTimes(specific.endHour, periodic.endHour);
    const start2 = compareTimes(periodic.startHour, specific.startHour);
    const end2 = compareTimes(periodic.endHour, specific.endHour);

    // Overlap if: (start1 <= start2 < end1) OR (start2 <= start1 < end2)
    return (
      (start1 <= 0 && compareTimes(periodic.startHour, specific.endHour) < 0) ||
      (start2 <= 0 && compareTimes(specific.startHour, periodic.endHour) < 0)
    );
  }

  // Case 3: Both are 'every' (periodic)
  if (isEvery1 && isEvery2) {
    if (
      !availability1.days ||
      availability1.days.length === 0 ||
      !availability2.days ||
      availability2.days.length === 0
    ) {
      return false;
    }

    // Check if they share any common days
    const days1 = availability1.days.map((d) => d.toLowerCase());
    const days2 = availability2.days.map((d) => d.toLowerCase());
    const commonDays = days1.filter((d) => days2.includes(d));

    if (commonDays.length === 0) {
      return false; // No common days, no overlap
    }

    // Check if time ranges overlap
    if (
      !availability1.startHour ||
      !availability1.endHour ||
      !availability2.startHour ||
      !availability2.endHour
    ) {
      return false;
    }

    const start1 = compareTimes(availability1.startHour, availability2.startHour);
    const end1 = compareTimes(availability1.endHour, availability2.endHour);
    const start2 = compareTimes(availability2.startHour, availability1.startHour);
    const end2 = compareTimes(availability2.endHour, availability1.endHour);

    // Overlap if: (start1 <= start2 < end1) OR (start2 <= start1 < end2)
    return (
      (start1 <= 0 && compareTimes(availability2.startHour, availability1.endHour) < 0) ||
      (start2 <= 0 && compareTimes(availability1.startHour, availability2.endHour) < 0)
    );
  }

  return false;
};

// Check if a new availability overlaps with existing ones
export const checkAvailabilityOverlaps = (
  newAvailability: Availability,
  existingAvailabilities: Availability[]
): Availability[] => {
  const overlapping: Availability[] = [];

  for (const existing of existingAvailabilities) {
    // Skip if it's the same availability (when editing)
    if (existing.id === newAvailability.id) {
      continue;
    }

    if (checkAvailabilityOverlap(newAvailability, existing)) {
      overlapping.push(existing);
    }
  }

  return overlapping;
};

// Validate availability form data
export const validateAvailability = (
  formData: Partial<Availability>
): string | null => {
  // Validate price (required for all types)
  if (!formData.pricePerMinute || formData.pricePerMinute.trim() === '') {
    return 'Please enter price per minute';
  }

  const price = parseFloat(formData.pricePerMinute);
  if (isNaN(price) || price <= 0) {
    return 'Please enter a valid price (greater than 0)';
  }

  // Validate video call fields
  const videoCallError = validateVideoCall(formData);
  if (videoCallError) {
    return videoCallError;
  }

  // For urgent calls, only price is required
  if (formData.availableAt === 'urgent') {
    return null;
  }

  // Validate availability type for scheduled availabilities
  if (
    formData.availableAt === 'every' &&
    (!formData.days || formData.days.length === 0)
  ) {
    return 'Please select at least one day';
  }
  if (formData.availableAt === 'specific' && !formData.date) {
    return 'Please select a date';
  }

  // Validate time fields for scheduled availabilities
  if (!formData.startHour || !formData.endHour) {
    return 'Please fill in all required fields';
  }

  // Validate time format
  if (
    !validateTimeFormat(formData.startHour) ||
    !validateTimeFormat(formData.endHour)
  ) {
    return 'Please enter time in HH:MM format (e.g., 09:00)';
  }

  // Validate start hour is before end hour
  const timeComparison = compareTimes(formData.startHour, formData.endHour);

  if (timeComparison >= 0) {
    return 'Start time must be before end time';
  }

  return null;
};

// Default export to prevent Expo Router from treating this as a route
