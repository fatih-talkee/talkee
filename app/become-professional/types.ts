export interface Availability {
  id: string;
  availableAt: 'every' | 'specific';
  days?: string[];
  date?: Date;
  startHour: string;
  endHour: string;
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

