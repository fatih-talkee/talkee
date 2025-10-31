export interface Professional {
  id: string;
  name: string;
  title: string;
  category: string;
  ratePerMinute: number;
  avatar: string;
  bio: string;
  rating: number;
  totalCalls: number;
  isOnline: boolean;
  isVerified: boolean;
  specialties: string[];
  languages: string[];
  responseTime: string;
  badges: string[];
  isBlocked?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  professionalCount: number;
}

export interface CallHistory {
  id: string;
  professionalId: string;
  professional: Professional;
  duration: number;
  cost: number;
  date: string;
  type: 'voice' | 'video';
  status: 'completed' | 'missed' | 'cancelled';
  direction?: 'incoming' | 'outgoing'; // Whether the current user called (outgoing) or was called (incoming)
  isBlocked?: boolean; // Whether this user is currently blocked
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  gradient: string[];
}

// Keep the original array for backward compatibility
const originalProfessionals: Professional[] = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    title: 'Executive Leadership Coach',
    ratePerMinute: 12.00,
    category: 'Business',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Former Fortune 500 CEO with 15+ years of executive experience. I help leaders navigate complex business challenges and accelerate their career growth.',
    rating: 4.9,
    totalCalls: 1247,
    isOnline: true,
    isVerified: true,
    specialties: ['Leadership', 'Strategy', 'Career Growth'],
    languages: ['English', 'Mandarin'],
    responseTime: '< 2 min',
    badges: ['Top Rated', 'Quick Response']
  },
  {
    id: '2',
    name: 'Marcus Thompson',
    title: 'Tech Entrepreneur',
    category: 'Technology',
    ratePerMinute: 12.00,
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Serial entrepreneur who built and sold 3 startups. Currently advising early-stage companies on product development and fundraising.',
    rating: 4.8,
    totalCalls: 892,
    isOnline: false,
    isVerified: true,
    specialties: ['Startups', 'Product Strategy', 'Fundraising'],
    languages: ['English', 'Spanish'],
    responseTime: '< 5 min',
    badges: ['Startup Expert', 'Investor Network']
  },
  {
    id: '3',
    name: 'Emma Rodriguez',
    title: 'Celebrity Lifestyle Coach',
    category: 'Lifestyle',
    ratePerMinute: 15.75,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Personal coach to A-list celebrities and high-net-worth individuals. Specializing in work-life balance and personal transformation.',
    rating: 5.0,
    totalCalls: 567,
    isOnline: true,
    isVerified: true,
    specialties: ['Life Coaching', 'Wellness', 'Mindfulness'],
    languages: ['English', 'French'],
    responseTime: '< 1 min',
    badges: ['Celebrity Coach', 'Premium']
  },
  {
    id: '4',
    name: 'David Park',
    title: 'Investment Strategist',
    category: 'Finance',
    ratePerMinute: 9.25,
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Former hedge fund manager with expertise in portfolio optimization and risk management. Helping individuals build wealth through smart investing.',
    rating: 4.7,
    totalCalls: 1534,
    isOnline: true,
    isVerified: true,
    specialties: ['Investment', 'Portfolio Management', 'Risk Analysis'],
    languages: ['English', 'Korean'],
    responseTime: '< 3 min',
    badges: ['Finance Expert', 'High Volume']
  },
  {
    id: '5',
    name: 'Maria Santos',
    title: 'Relationship Therapist',
    category: 'Health',
    ratePerMinute: 6.50,
    avatar: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Licensed clinical psychologist specializing in couples therapy and relationship counseling. 10+ years of private practice experience.',
    rating: 4.9,
    totalCalls: 2103,
    isOnline: false,
    isVerified: true,
    specialties: ['Couples Therapy', 'Communication', 'Conflict Resolution'],
    languages: ['English', 'Spanish', 'Portuguese'],
    responseTime: '< 10 min',
    badges: ['Licensed Professional', 'Relationship Expert']
  },
  {
    id: '6',
    name: 'James Wilson',
    title: 'Fitness & Nutrition Expert',
    category: 'Health',
    ratePerMinute: 4.75,
    avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Certified personal trainer and nutritionist. Former Olympic athlete helping people achieve their fitness goals and build healthy lifestyles.',
    rating: 4.8,
    totalCalls: 945,
    isOnline: true,
    isVerified: true,
    specialties: ['Personal Training', 'Nutrition', 'Athletic Performance'],
    languages: ['English'],
    responseTime: '< 2 min',
    badges: ['Olympic Athlete', 'Certified Trainer']
  },
  {
    id: '7',
    name: 'Sophia Kim',
    title: 'Creative Director',
    category: 'Design',
    ratePerMinute: 7.25,
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Award-winning creative director with experience at top agencies. Specializing in brand strategy and visual storytelling.',
    rating: 4.9,
    totalCalls: 678,
    isOnline: true,
    isVerified: true,
    specialties: ['Brand Strategy', 'Visual Design', 'Creative Direction'],
    languages: ['English', 'Korean'],
    responseTime: '< 3 min',
    badges: ['Award Winner', 'Creative Expert']
  },
  {
    id: '8',
    name: 'Alex Rivera',
    title: 'Music Producer',
    category: 'Entertainment',
    ratePerMinute: 11.50,
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Grammy-nominated producer who has worked with top artists. Offering guidance on music production and industry insights.',
    rating: 4.8,
    totalCalls: 423,
    isOnline: false,
    isVerified: true,
    specialties: ['Music Production', 'Sound Engineering', 'Industry Insights'],
    languages: ['English', 'Spanish'],
    responseTime: '< 5 min',
    badges: ['Grammy Nominated', 'Industry Pro']
  }
];

// Create additional professionals to ensure we have enough for 10 per category
const additionalProfessionals: Professional[] = [
  {
    id: '9',
    name: 'Dr. Michael Torres',
    title: 'Clinical Psychologist',
    category: 'Health',
    ratePerMinute: 7.75,
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Licensed clinical psychologist specializing in anxiety and depression treatment with 12+ years of experience.',
    rating: 4.9,
    totalCalls: 1876,
    isOnline: true,
    isVerified: true,
    specialties: ['Anxiety Treatment', 'Depression', 'Cognitive Therapy'],
    languages: ['English', 'Spanish'],
    responseTime: '< 2 min',
    badges: ['Licensed Professional', 'Top Rated']
  },
  {
    id: '10',
    name: 'Rachel Green',
    title: 'Digital Marketing Strategist',
    category: 'Business',
    ratePerMinute: 9.50,
    avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Digital marketing expert helping businesses grow their online presence and increase revenue through strategic campaigns.',
    rating: 4.8,
    totalCalls: 743,
    isOnline: false,
    isVerified: true,
    specialties: ['Digital Marketing', 'Social Media', 'SEO'],
    languages: ['English'],
    responseTime: '< 5 min',
    badges: ['Marketing Expert', 'Growth Specialist']
  },
  {
    id: '11',
    name: 'Kevin Zhang',
    title: 'Software Architect',
    category: 'Technology',
    ratePerMinute: 13.25,
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Senior software architect with expertise in cloud computing and scalable system design for enterprise applications.',
    rating: 4.9,
    totalCalls: 612,
    isOnline: true,
    isVerified: true,
    specialties: ['System Architecture', 'Cloud Computing', 'Microservices'],
    languages: ['English', 'Mandarin'],
    responseTime: '< 3 min',
    badges: ['Tech Expert', 'Cloud Specialist']
  },
  {
    id: '12',
    name: 'Lisa Anderson',
    title: 'Investment Advisor',
    category: 'Finance',
    ratePerMinute: 11.00,
    avatar: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Certified financial planner helping individuals and families build wealth through strategic investment planning.',
    rating: 4.7,
    totalCalls: 1289,
    isOnline: true,
    isVerified: true,
    specialties: ['Investment Planning', 'Retirement', 'Wealth Management'],
    languages: ['English'],
    responseTime: '< 4 min',
    badges: ['Certified Planner', 'Investment Expert']
  },
  {
    id: '13',
    name: 'Carlos Mendez',
    title: 'Life & Career Coach',
    category: 'Lifestyle',
    ratePerMinute: 8.25,
    avatar: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Certified life coach specializing in career transitions and personal development for young professionals.',
    rating: 4.8,
    totalCalls: 956,
    isOnline: false,
    isVerified: true,
    specialties: ['Career Coaching', 'Personal Development', 'Goal Setting'],
    languages: ['English', 'Spanish'],
    responseTime: '< 6 min',
    badges: ['Certified Coach', 'Career Expert']
  },
  {
    id: '14',
    name: 'Dr. Jennifer Walsh',
    title: 'Nutritionist & Wellness Coach',
    category: 'Health',
    ratePerMinute: 6.75,
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Registered dietitian and wellness coach helping clients achieve optimal health through nutrition and lifestyle changes.',
    rating: 4.9,
    totalCalls: 1432,
    isOnline: true,
    isVerified: true,
    specialties: ['Nutrition Planning', 'Weight Management', 'Wellness Coaching'],
    languages: ['English'],
    responseTime: '< 2 min',
    badges: ['Registered Dietitian', 'Wellness Expert']
  },
  {
    id: '15',
    name: 'Robert Kim',
    title: 'Startup Consultant',
    category: 'Business',
    ratePerMinute: 14.50,
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Serial entrepreneur and startup consultant who has helped launch over 50 successful companies.',
    rating: 4.8,
    totalCalls: 687,
    isOnline: true,
    isVerified: true,
    specialties: ['Startup Strategy', 'Business Planning', 'Fundraising'],
    languages: ['English', 'Korean'],
    responseTime: '< 3 min',
    badges: ['Startup Expert', 'Serial Entrepreneur']
  },
  {
    id: '16',
    name: 'Amanda Foster',
    title: 'UX/UI Design Consultant',
    category: 'Technology',
    ratePerMinute: 10.75,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Senior UX/UI designer with 8+ years of experience creating user-centered designs for Fortune 500 companies.',
    rating: 4.9,
    totalCalls: 834,
    isOnline: false,
    isVerified: true,
    specialties: ['UX Design', 'UI Design', 'User Research'],
    languages: ['English'],
    responseTime: '< 4 min',
    badges: ['Design Expert', 'UX Specialist']
  }
];

// Combine original and additional professionals
export const mockProfessionals: Professional[] = [...originalProfessionals, ...additionalProfessionals];

export const mockCategories: Category[] = [
  { id: '1', name: 'Business', icon: 'briefcase', color: '#007AFF', professionalCount: 1247 },
  { id: '2', name: 'Technology', icon: 'smartphone', color: '#5856D6', professionalCount: 892 },
  { id: '3', name: 'Health', icon: 'heart', color: '#30D158', professionalCount: 1534 },
  { id: '4', name: 'Finance', icon: 'dollar-sign', color: '#FFD60A', professionalCount: 687 },
  { id: '5', name: 'Lifestyle', icon: 'star', color: '#FF9F0A', professionalCount: 456 },
  { id: '6', name: 'Education', icon: 'book', color: '#64D2FF', professionalCount: 789 },
  { id: '7', name: 'Design', icon: 'palette', color: '#BF5AF2', professionalCount: 345 },
  { id: '8', name: 'Entertainment', icon: 'music', color: '#FF375F', professionalCount: 234 },
  { id: '9', name: 'Sports', icon: 'dumbbell', color: '#32D74B', professionalCount: 567 },
  { id: '10', name: 'Automotive', icon: 'car', color: '#8E8E93', professionalCount: 123 },
  { id: '11', name: 'Photography', icon: 'camera', color: '#FF6B35', professionalCount: 298 },
  { id: '12', name: 'Gaming', icon: 'gamepad', color: '#5AC8FA', professionalCount: 445 }
];

export const mockCallHistory: CallHistory[] = [
  {
    id: '1',
    professionalId: '1',
    professional: mockProfessionals[0],
    duration: 25,
    cost: 212.50,
    date: '2025-01-20T10:30:00Z',
    type: 'video',
    status: 'completed',
    direction: 'outgoing',
    isBlocked: false
  },
  {
    id: '2',
    professionalId: '2',
    professional: mockProfessionals[1],
    duration: 15,
    cost: 180.00,
    date: '2025-01-19T14:15:00Z',
    type: 'voice',
    status: 'completed',
    direction: 'incoming',
    isBlocked: true
  },
  {
    id: '3',
    professionalId: '3',
    professional: mockProfessionals[2],
    duration: 0,
    cost: 0,
    date: '2025-01-18T09:00:00Z',
    type: 'video',
    status: 'missed',
    direction: 'outgoing',
    isBlocked: true
  },
  {
    id: '4',
    professionalId: '4',
    professional: mockProfessionals[3],
    duration: 20,
    cost: 185.00,
    date: '2025-01-17T11:00:00Z',
    type: 'video',
    status: 'completed',
    direction: 'outgoing',
    isBlocked: false
  },
  {
    id: '5',
    professionalId: '5',
    professional: mockProfessionals[4],
    duration: 30,
    cost: 315.00,
    date: '2025-01-16T15:30:00Z',
    type: 'voice',
    status: 'completed',
    direction: 'incoming',
    isBlocked: false
  }
];

export const mockPromotions: Promotion[] = [
  {
    id: '1',
    title: 'Join Our Experts',
    subtitle: 'Share your experience with others',
    image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
    ctaText: 'Get Started',
    gradient: ['rgba(0, 122, 255, 0.8)', 'rgba(0, 122, 255, 0.4)']
  },
  {
    id: '2',
    title: 'New Year, New Career',
    subtitle: 'Get expert career advice from industry leaders',
    image: 'https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&cs=tinysrgb&w=800',
    ctaText: 'Explore Now',
    gradient: ['rgba(255, 214, 10, 0.8)', 'rgba(255, 214, 10, 0.4)']
  },
  {
    id: '3',
    title: 'Health & Wellness',
    subtitle: 'Connect with certified health professionals',
    image: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=800',
    ctaText: 'Book Session',
    gradient: ['rgba(48, 209, 88, 0.8)', 'rgba(48, 209, 88, 0.4)']
  },
  {
    id: '4',
    title: 'Tech Innovation',
    subtitle: 'Learn from Silicon Valley entrepreneurs',
    image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800',
    ctaText: 'Connect',
    gradient: ['rgba(88, 86, 214, 0.8)', 'rgba(88, 86, 214, 0.4)']
  }
];

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'call' | 'message' | 'appointment' | 'promotion' | 'payment' | 'system';
  timestamp: string;
  isRead: boolean;
  professionalId?: string;
  professional?: Professional;
  actionUrl?: string;
}

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Incoming Call',
    message: 'Dr. Sarah Chen is calling you',
    type: 'call',
    timestamp: '2025-01-20T10:45:00Z',
    isRead: false,
    professionalId: '1',
    professional: mockProfessionals[0],
    actionUrl: '/call/1'
  },
  {
    id: '2',
    title: 'New Message',
    message: 'Marcus Thompson sent you a message: "Let\'s discuss the project strategy"',
    type: 'message',
    timestamp: '2025-01-20T09:30:00Z',
    isRead: false,
    professionalId: '2',
    professional: mockProfessionals[1],
    actionUrl: '/professional/2'
  },
  {
    id: '3',
    title: 'Appointment Reminder',
    message: 'Your appointment with Emma Rodriguez is in 30 minutes',
    type: 'appointment',
    timestamp: '2025-01-20T08:00:00Z',
    isRead: true,
    professionalId: '3',
    professional: mockProfessionals[2],
    actionUrl: '/professional/3'
  },
  {
    id: '4',
    title: 'Payment Processed',
    message: 'Your payment of $212.50 for the session with Dr. Sarah Chen has been processed',
    type: 'payment',
    timestamp: '2025-01-20T10:35:00Z',
    isRead: true,
    actionUrl: '/call-history'
  },
  {
    id: '5',
    title: 'Special Promotion',
    message: '50% off your first session with any Finance expert. Limited time offer!',
    type: 'promotion',
    timestamp: '2025-01-19T15:00:00Z',
    isRead: false,
    actionUrl: '/categories'
  },
  {
    id: '6',
    title: 'Appointment Confirmed',
    message: 'Your appointment with David Park has been confirmed for tomorrow at 2:00 PM',
    type: 'appointment',
    timestamp: '2025-01-19T14:20:00Z',
    isRead: true,
    professionalId: '4',
    professional: mockProfessionals[3],
    actionUrl: '/professional/4'
  },
  {
    id: '7',
    title: 'System Update',
    message: 'New features added! Check out the latest improvements to your app including enhanced call quality, new notification preferences, improved search functionality with filters, and a redesigned professional profiles with detailed ratings and reviews.',
    type: 'system',
    timestamp: '2025-01-19T10:00:00Z',
    isRead: true,
    actionUrl: '/profile'
  },
  {
    id: '8',
    title: 'Call Ended',
    message: 'Your call with Maria Santos has ended. Session duration: 25 minutes',
    type: 'call',
    timestamp: '2025-01-18T16:30:00Z',
    isRead: true,
    professionalId: '5',
    professional: mockProfessionals[4],
    actionUrl: '/call-history'
  }
];

export interface WalletTransaction {
  id: string;
  type: 'income' | 'expenses';
  amount: number;
  description: string;
  timestamp: string;
  professionalId?: string;
  professional?: Professional;
  callerId?: string;
  caller?: Professional;
  status?: 'completed' | 'pending' | 'failed';
  duration?: number; // Duration in seconds
}

export interface BlockedUser {
  id: string;
  userId: string;
  user: Professional;
  blockedAt: string;
  lastCallDate?: string;
  lastCallDuration?: number;
}

export const mockWalletTransactions: WalletTransaction[] = [
  {
    id: '1',
    type: 'expenses',
    amount: 21.25,
    description: 'Call with Dr. Sarah Chen',
    timestamp: '2025-01-20T14:30:00Z',
    professionalId: '1',
    professional: mockProfessionals[0],
    duration: 510, // 8min 30sec
    status: 'completed'
  },
  {
    id: '2',
    type: 'income',
    amount: 100.00,
    description: 'Credits Added',
    timestamp: '2025-01-19T16:15:00Z',
    status: 'completed'
  },
  {
    id: '3',
    type: 'expenses',
    amount: 180.00,
    description: 'Call with Marcus Thompson',
    timestamp: '2025-01-19T14:15:00Z',
    professionalId: '2',
    professional: mockProfessionals[1],
    duration: 900, // 15min
    status: 'completed'
  },
  {
    id: '4',
    type: 'income',
    amount: 50.00,
    description: 'Refund for cancelled call',
    timestamp: '2025-01-18T10:20:00Z',
    status: 'completed'
  },
  {
    id: '5',
    type: 'expenses',
    amount: 94.50,
    description: 'Call with Emma Rodriguez',
    timestamp: '2025-01-18T09:45:00Z',
    professionalId: '3',
    professional: mockProfessionals[2],
    duration: 360, // 6min
    status: 'completed'
  },
  {
    id: '6',
    type: 'income',
    amount: 200.00,
    description: 'Credits Added',
    timestamp: '2025-01-17T12:00:00Z',
    status: 'completed'
  },
  {
    id: '7',
    type: 'expenses',
    amount: 87.75,
    description: 'Call with David Park',
    timestamp: '2025-01-17T11:30:00Z',
    professionalId: '4',
    professional: mockProfessionals[3],
    duration: 567, // 9min 27sec
    status: 'completed'
  },
  {
    id: '8',
    type: 'income',
    amount: 150.00,
    description: 'Credits Added',
    timestamp: '2025-01-16T14:00:00Z',
    status: 'completed'
  },
  {
    id: '9',
    type: 'expenses',
    amount: 126.00,
    description: 'Call with Maria Santos',
    timestamp: '2025-01-16T10:15:00Z',
    professionalId: '5',
    professional: mockProfessionals[4],
    duration: 816, // 13min 36sec
    status: 'completed'
  },
  {
    id: '10',
    type: 'expenses',
    amount: 168.75,
    description: 'Call with James Wilson',
    timestamp: '2025-01-15T15:45:00Z',
    professionalId: '6',
    professional: mockProfessionals[5],
    duration: 1017, // 16min 57sec
    status: 'completed'
  },
  {
    id: '11',
    type: 'income',
    amount: 75.00,
    description: 'Credits Added',
    timestamp: '2025-01-14T18:00:00Z',
    status: 'completed'
  },
  {
    id: '12',
    type: 'expenses',
    amount: 56.25,
    description: 'Call with Lisa Anderson',
    timestamp: '2025-01-14T16:30:00Z',
    professionalId: '7',
    professional: mockProfessionals[6],
    duration: 377, // 6min 17sec
    status: 'completed'
  },
  {
    id: '13',
    type: 'income',
    amount: 100.00,
    description: 'Credits Added',
    timestamp: '2025-01-13T09:00:00Z',
    status: 'completed'
  },
  {
    id: '14',
    type: 'expenses',
    amount: 225.00,
    description: 'Call with Robert Martinez',
    timestamp: '2025-01-13T08:00:00Z',
    professionalId: '8',
    professional: mockProfessionals[7],
    duration: 1457, // 24min 17sec
    status: 'completed'
  },
  {
    id: '15',
    type: 'income',
    amount: 180.00,
    description: 'Call earning',
    timestamp: '2025-01-20T16:00:00Z',
    callerId: '2',
    caller: mockProfessionals[1],
    duration: 900, // 15min
    status: 'completed'
  },
  {
    id: '16',
    type: 'income',
    amount: 94.50,
    description: 'Call earning',
    timestamp: '2025-01-18T11:30:00Z',
    callerId: '3',
    caller: mockProfessionals[2],
    duration: 360, // 6min
    status: 'completed'
  },
  {
    id: '17',
    type: 'income',
    amount: 87.75,
    description: 'Call earning',
    timestamp: '2025-01-17T12:45:00Z',
    callerId: '4',
    caller: mockProfessionals[3],
    duration: 567, // 9min 27sec
    status: 'completed'
  },
  {
    id: '18',
    type: 'income',
    amount: 126.00,
    description: 'Call earning',
    timestamp: '2025-01-16T11:00:00Z',
    callerId: '5',
    caller: mockProfessionals[4],
    duration: 816, // 13min 36sec
    status: 'completed'
  }
];

export const mockBlockedUsers: BlockedUser[] = [
  {
    id: '1',
    userId: '2',
    user: mockProfessionals[1],
    blockedAt: '2025-01-20T10:00:00Z',
    lastCallDate: '2025-01-20T09:00:00Z',
    lastCallDuration: 900, // 15min
  },
  {
    id: '2',
    userId: '3',
    user: mockProfessionals[2],
    blockedAt: '2025-01-18T08:00:00Z',
    lastCallDate: '2025-01-18T07:30:00Z',
    lastCallDuration: 300, // 5min
  }
];