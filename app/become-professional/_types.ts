export interface Availability {
  id: string;
  availableAt: 'every' | 'specific' | 'urgent';
  days?: string[];
  date?: Date;
  startHour?: string; // Optional for urgent calls
  endHour?: string; // Optional for urgent calls
  pricePerMinute: string;
}

export interface EducationLevel {
  label: string;
  value: string;
}

export interface TimeOption {
  value: string;
  label: string;
}

// Default export to prevent Expo Router from treating this as a route
export default null;

