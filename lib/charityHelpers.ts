// lib/charityHelpers.ts
// Helper functions for charity-related operations

import { CharityOrganization } from '../types';

/**
 * Get category display name for charity categories
 */
export function getCategoryDisplayName(
  category: CharityOrganization['category']
): string {
  const names: Record<CharityOrganization['category'], string> = {
    education: 'Education',
    health: 'Health',
    environment: 'Environment',
    poverty: 'Poverty',
    animals: 'Animals',
    human_rights: 'Human Rights',
    other: 'Other',
  };
  return names[category];
}
