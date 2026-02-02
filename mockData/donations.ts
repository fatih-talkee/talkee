export interface DonationRecord {
  id: string;
  callId: string;
  charityId: string;
  charityName: string;
  amount: number;
  currency: 'USD' | 'TRY' | 'EUR';
  date: Date;
  callDuration: number; // in seconds
  grossEarnings: number;
  donationPercentage: number;
}

// Helper function to create date relative to today
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export const mockDonations: DonationRecord[] = [
  {
    id: '1',
    callId: 'call_001',
    charityId: '1',
    charityName: 'Global Education Fund',
    amount: 12.50,
    currency: 'USD',
    date: daysAgo(2),
    callDuration: 900, // 15 minutes
    grossEarnings: 125.00,
    donationPercentage: 10,
  },
  {
    id: '2',
    callId: 'call_002',
    charityId: '1',
    charityName: 'Global Education Fund',
    amount: 8.00,
    currency: 'USD',
    date: daysAgo(5),
    callDuration: 600, // 10 minutes
    grossEarnings: 80.00,
    donationPercentage: 10,
  },
  {
    id: '3',
    callId: 'call_003',
    charityId: '1',
    charityName: 'Global Education Fund',
    amount: 15.00,
    currency: 'USD',
    date: daysAgo(8),
    callDuration: 1200, // 20 minutes
    grossEarnings: 150.00,
    donationPercentage: 10,
  },
  {
    id: '4',
    callId: 'call_004',
    charityId: '1',
    charityName: 'Global Education Fund',
    amount: 10.00,
    currency: 'USD',
    date: daysAgo(12),
    callDuration: 720, // 12 minutes
    grossEarnings: 100.00,
    donationPercentage: 10,
  },
  {
    id: '5',
    callId: 'call_005',
    charityId: '1',
    charityName: 'Global Education Fund',
    amount: 6.50,
    currency: 'USD',
    date: daysAgo(15),
    callDuration: 480, // 8 minutes
    grossEarnings: 65.00,
    donationPercentage: 10,
  },
  {
    id: '6',
    callId: 'call_006',
    charityId: '2',
    charityName: 'Clean Water Initiative',
    amount: 7.50,
    currency: 'USD',
    date: daysAgo(18),
    callDuration: 540, // 9 minutes
    grossEarnings: 75.00,
    donationPercentage: 10,
  },
  {
    id: '7',
    callId: 'call_007',
    charityId: '2',
    charityName: 'Clean Water Initiative',
    amount: 9.00,
    currency: 'USD',
    date: daysAgo(22),
    callDuration: 660, // 11 minutes
    grossEarnings: 90.00,
    donationPercentage: 10,
  },
  {
    id: '8',
    callId: 'call_008',
    charityId: '2',
    charityName: 'Clean Water Initiative',
    amount: 12.00,
    currency: 'USD',
    date: daysAgo(25),
    callDuration: 840, // 14 minutes
    grossEarnings: 120.00,
    donationPercentage: 10,
  },
  {
    id: '9',
    callId: 'call_009',
    charityId: '2',
    charityName: 'Clean Water Initiative',
    amount: 8.50,
    currency: 'USD',
    date: daysAgo(30),
    callDuration: 630, // 10.5 minutes
    grossEarnings: 85.00,
    donationPercentage: 10,
  },
  {
    id: '10',
    callId: 'call_010',
    charityId: '2',
    charityName: 'Clean Water Initiative',
    amount: 11.00,
    currency: 'USD',
    date: daysAgo(35),
    callDuration: 780, // 13 minutes
    grossEarnings: 110.00,
    donationPercentage: 10,
  },
  {
    id: '11',
    callId: 'call_011',
    charityId: '3',
    charityName: 'Rainforest Guardians',
    amount: 13.50,
    currency: 'USD',
    date: daysAgo(40),
    callDuration: 960, // 16 minutes
    grossEarnings: 135.00,
    donationPercentage: 10,
  },
  {
    id: '12',
    callId: 'call_012',
    charityId: '3',
    charityName: 'Rainforest Guardians',
    amount: 7.00,
    currency: 'USD',
    date: daysAgo(45),
    callDuration: 510, // 8.5 minutes
    grossEarnings: 70.00,
    donationPercentage: 10,
  },
  {
    id: '13',
    callId: 'call_013',
    charityId: '3',
    charityName: 'Rainforest Guardians',
    amount: 9.50,
    currency: 'USD',
    date: daysAgo(50),
    callDuration: 690, // 11.5 minutes
    grossEarnings: 95.00,
    donationPercentage: 10,
  },
  {
    id: '14',
    callId: 'call_014',
    charityId: '3',
    charityName: 'Rainforest Guardians',
    amount: 14.00,
    currency: 'USD',
    date: daysAgo(55),
    callDuration: 1020, // 17 minutes
    grossEarnings: 140.00,
    donationPercentage: 10,
  },
  {
    id: '15',
    callId: 'call_015',
    charityId: '3',
    charityName: 'Rainforest Guardians',
    amount: 10.50,
    currency: 'USD',
    date: daysAgo(60),
    callDuration: 750, // 12.5 minutes
    grossEarnings: 105.00,
    donationPercentage: 10,
  },
  {
    id: '16',
    callId: 'call_016',
    charityId: '4',
    charityName: 'Feed the Children',
    amount: 8.00,
    currency: 'USD',
    date: daysAgo(65),
    callDuration: 600, // 10 minutes
    grossEarnings: 80.00,
    donationPercentage: 10,
  },
  {
    id: '17',
    callId: 'call_017',
    charityId: '4',
    charityName: 'Feed the Children',
    amount: 11.50,
    currency: 'USD',
    date: daysAgo(70),
    callDuration: 810, // 13.5 minutes
    grossEarnings: 115.00,
    donationPercentage: 10,
  },
  {
    id: '18',
    callId: 'call_018',
    charityId: '4',
    charityName: 'Feed the Children',
    amount: 9.00,
    currency: 'USD',
    date: daysAgo(75),
    callDuration: 660, // 11 minutes
    grossEarnings: 90.00,
    donationPercentage: 10,
  },
  {
    id: '19',
    callId: 'call_019',
    charityId: '4',
    charityName: 'Feed the Children',
    amount: 12.50,
    currency: 'USD',
    date: daysAgo(80),
    callDuration: 900, // 15 minutes
    grossEarnings: 125.00,
    donationPercentage: 10,
  },
  {
    id: '20',
    callId: 'call_020',
    charityId: '4',
    charityName: 'Feed the Children',
    amount: 15.50,
    currency: 'USD',
    date: daysAgo(85),
    callDuration: 1110, // 18.5 minutes
    grossEarnings: 155.00,
    donationPercentage: 10,
  },
];

// Helper functions for donation data

export function getTotalDonated(donations: DonationRecord[] = mockDonations): number {
  return donations.reduce((total, donation) => total + donation.amount, 0);
}

export function getDonationsByCharity(donations: DonationRecord[] = mockDonations): Record<string, { name: string; total: number; count: number }> {
  const byCharity: Record<string, { name: string; total: number; count: number }> = {};

  donations.forEach(donation => {
    if (!byCharity[donation.charityId]) {
      byCharity[donation.charityId] = {
        name: donation.charityName,
        total: 0,
        count: 0,
      };
    }
    byCharity[donation.charityId].total += donation.amount;
    byCharity[donation.charityId].count += 1;
  });

  return byCharity;
}

export function getDonationsByPeriod(
  donations: DonationRecord[] = mockDonations,
  days: number
): DonationRecord[] {
  const cutoffDate = daysAgo(days);
  return donations.filter(donation => donation.date >= cutoffDate);
}

export function groupDonationsByMonth(donations: DonationRecord[] = mockDonations): Record<string, DonationRecord[]> {
  const grouped: Record<string, DonationRecord[]> = {};

  donations.forEach(donation => {
    const monthKey = `${donation.date.getFullYear()}-${String(donation.date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(donation);
  });

  return grouped;
}

export function getMonthDisplayName(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
