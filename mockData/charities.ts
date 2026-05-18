export interface CharityOrganization {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  logo: string;
  category: 'education' | 'health' | 'environment' | 'poverty' | 'animals' | 'human_rights' | 'other';
  country: string;
  website?: string;
  verified: boolean;
  featuredImage?: string;
}

export const mockCharities: CharityOrganization[] = [
  {
    id: '1',
    name: 'Global Education Fund',
    shortDescription: 'Providing quality education to children in underserved communities worldwide',
    fullDescription: 'Global Education Fund is dedicated to ensuring every child has access to quality education. We build schools, train teachers, and provide learning materials in over 40 countries. Since 2010, we\'ve helped over 2 million children access education.',
    logo: 'https://images.pexels.com/photos/8500398/pexels-photo-8500398.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'education',
    country: 'United States',
    website: 'https://example.org/education',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/8500398/pexels-photo-8500398.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '2',
    name: 'Clean Water Initiative',
    shortDescription: 'Bringing clean water and sanitation to communities in need',
    fullDescription: 'Clean Water Initiative works to provide sustainable access to clean water and sanitation facilities in developing regions. We\'ve built over 5,000 wells and water systems, impacting 3 million lives across Africa and Asia.',
    logo: 'https://images.pexels.com/photos/2382893/pexels-photo-2382893.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'health',
    country: 'United Kingdom',
    website: 'https://example.org/water',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/2382893/pexels-photo-2382893.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '3',
    name: 'Rainforest Guardians',
    shortDescription: 'Protecting and restoring rainforests and wildlife habitats',
    fullDescription: 'Rainforest Guardians is committed to conserving tropical rainforests and the biodiversity they support. We work with local communities to protect endangered species and restore degraded habitats, having preserved over 1 million acres to date.',
    logo: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'environment',
    country: 'Brazil',
    website: 'https://example.org/rainforest',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '4',
    name: 'Feed the Children',
    shortDescription: 'Ending childhood hunger through food security programs',
    fullDescription: 'Feed the Children fights childhood hunger by providing nutritious meals, teaching sustainable farming, and supporting food security programs in impoverished regions. We serve over 500,000 meals daily across 15 countries.',
    logo: 'https://images.pexels.com/photos/6646917/pexels-photo-6646917.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'poverty',
    country: 'United States',
    website: 'https://example.org/feed',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/6646917/pexels-photo-6646917.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '5',
    name: 'Animal Rescue Network',
    shortDescription: 'Rescuing and rehabilitating abandoned and abused animals',
    fullDescription: 'Animal Rescue Network provides shelter, medical care, and rehabilitation for abandoned, abused, and injured animals. We operate 50 rescue centers worldwide and have found homes for over 100,000 animals since our founding.',
    logo: 'https://images.pexels.com/photos/2558605/pexels-photo-2558605.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'animals',
    country: 'Australia',
    website: 'https://example.org/rescue',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/2558605/pexels-photo-2558605.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '6',
    name: 'Women\'s Empowerment Alliance',
    shortDescription: 'Advancing women\'s rights and economic empowerment globally',
    fullDescription: 'Women\'s Empowerment Alliance works to advance gender equality through education, economic empowerment programs, and advocacy. We support over 200,000 women entrepreneurs and have trained 1 million women in leadership skills.',
    logo: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'human_rights',
    country: 'Canada',
    website: 'https://example.org/women',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '7',
    name: 'Medical Aid International',
    shortDescription: 'Providing emergency medical care and health services in crisis zones',
    fullDescription: 'Medical Aid International delivers emergency medical care, vaccines, and health services to people affected by conflicts and disasters. Our teams of doctors and nurses have treated over 5 million patients in crisis zones worldwide.',
    logo: 'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'health',
    country: 'Switzerland',
    website: 'https://example.org/medical',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '8',
    name: 'Ocean Conservation Society',
    shortDescription: 'Protecting marine ecosystems and ocean wildlife',
    fullDescription: 'Ocean Conservation Society is dedicated to protecting ocean ecosystems through research, advocacy, and direct action. We work to reduce plastic pollution, protect coral reefs, and save endangered marine species.',
    logo: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'environment',
    country: 'United States',
    website: 'https://example.org/ocean',
    verified: false,
    featuredImage: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '9',
    name: 'Youth Mentorship Program',
    shortDescription: 'Mentoring at-risk youth and providing career guidance',
    fullDescription: 'Youth Mentorship Program connects at-risk young people with mentors who provide guidance, support, and opportunities. We\'ve mentored over 50,000 youth, helping them build skills and achieve their educational and career goals.',
    logo: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'education',
    country: 'United States',
    website: 'https://example.org/youth',
    verified: false,
    featuredImage: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: '10',
    name: 'Disaster Relief Foundation',
    shortDescription: 'Providing rapid response and recovery support after disasters',
    fullDescription: 'Disaster Relief Foundation provides immediate emergency response and long-term recovery support to communities affected by natural disasters. We\'ve responded to over 200 disasters, helping more than 10 million people rebuild their lives.',
    logo: 'https://images.pexels.com/photos/6995243/pexels-photo-6995243.jpeg?auto=compress&cs=tinysrgb&w=100',
    category: 'other',
    country: 'United States',
    website: 'https://example.org/disaster',
    verified: true,
    featuredImage: 'https://images.pexels.com/photos/6995243/pexels-photo-6995243.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

// Helper function to get charity by ID
export function getCharityById(id: string): CharityOrganization | undefined {
  return mockCharities.find(charity => charity.id === id);
}

// Helper function to get charities by category
export function getCharitiesByCategory(category: CharityOrganization['category'] | 'all'): CharityOrganization[] {
  if (category === 'all') {
    return mockCharities;
  }
  return mockCharities.filter(charity => charity.category === category);
}

// Helper function to get category display name
export function getCategoryDisplayName(category: CharityOrganization['category']): string {
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

// Helper function to get category color (theme-safe)
export function getCategoryColor(category: CharityOrganization['category']): string {
  // These are fallback colors for icons - components should use theme colors
  const colors: Record<CharityOrganization['category'], string> = {
    education: '#3b82f6', // blue
    health: '#ef4444', // red
    environment: '#10b981', // green
    poverty: '#f59e0b', // amber
    animals: '#8b5cf6', // purple
    human_rights: '#ec4899', // pink
    other: '#64748b', // gray
  };
  return colors[category];
}
