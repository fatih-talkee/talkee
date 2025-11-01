/**
 * Mock User Data
 * 
 * This file contains mock user profile data for the currently logged-in user (professional)
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  memberSince: string;
  totalCalls: number;
  favoriteCount: number;
  // Urgent call settings
  urgentCallEnabled: boolean;
  urgentCallPrice: number;
  urgentCallCurrency: 'USD' | 'TRY' | 'EUR';
}

export const mockUserProfile: UserProfile = {
  id: 'user-1',
  name: 'Mila Victoria',
  email: 'mila@example.com',
  avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  memberSince: 'January 2024',
  totalCalls: 23,
  favoriteCount: 8,
  urgentCallEnabled: true,
  urgentCallPrice: 15.00,
  urgentCallCurrency: 'USD',
};

