import { timeOptions } from './constants';
import type { Availability } from './types';

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

// Validate availability form data
export const validateAvailability = (
  formData: Partial<Availability>
): string | null => {
  // Validate availability type
  if (
    formData.availableAt === 'every' &&
    (!formData.days || formData.days.length === 0)
  ) {
    return 'Please select at least one day';
  }
  if (
    formData.availableAt === 'specific' &&
    !formData.date
  ) {
    return 'Please select a date';
  }

  // Validate required fields
  if (
    !formData.startHour ||
    !formData.endHour ||
    !formData.pricePerMinute
  ) {
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
  const timeComparison = compareTimes(
    formData.startHour,
    formData.endHour
  );

  if (timeComparison >= 0) {
    return 'Start time must be before end time';
  }

  return null;
};

