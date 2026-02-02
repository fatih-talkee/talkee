/**
 * Mock data for call donation organizations
 * Used in call-donation screen for selecting donation targets
 */

export interface DonationOrganization {
  id: string;
  name: string;
  percentage: number;
}

export const mockDonationOrganizations: DonationOrganization[] = [
  {
    id: '1',
    name: 'Çağdaş Yaşamı Destekleme Derneği',
    percentage: 20,
  },
  {
    id: '2',
    name: 'LÖSEV',
    percentage: 20,
  },
  {
    id: '3',
    name: 'ÖÇEV',
    percentage: 5,
  },
];
