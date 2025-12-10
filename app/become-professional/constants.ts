export const daysOptions = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Generate time options in 15-minute intervals (00:00 to 23:45)
export const generateTimeOptions = (): Array<{ value: string; label: string }> => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const displayTime = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

export const timeOptions = generateTimeOptions();

export const educationLevels = [
  { label: 'High School', value: 'high_school' },
  { label: 'Associate Degree', value: 'associate' },
  { label: "Bachelor's Degree", value: 'bachelor' },
  { label: "Master's Degree", value: 'master' },
  { label: 'Doctorate (PhD)', value: 'doctorate' },
  { label: 'Professional Certificate', value: 'certificate' },
  { label: 'Other', value: 'other' },
];

