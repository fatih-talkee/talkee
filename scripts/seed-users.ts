import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ⚠️ IMPORTANT: Use SERVICE ROLE KEY (not anon key!)
// Get from: Supabase Dashboard → Settings → API → service_role key
// Set these in your .env file:
// EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please set the following in your .env file:');
  console.error(
    '  EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co'
  );
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
  console.error(
    '\nGet your service role key from: Supabase Dashboard → Settings → API → service_role key'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUser {
  email: string;
  password: string;
  phone: string;
  name: string;
  avatar_url: string;
  wallet_balance: number;
  bio: string;
}

const testUsers: TestUser[] = [
  {
    email: 'mila@talkee.com',
    password: 'Ab123456',
    phone: '+905551234501',
    name: 'Mila Victoria',
    avatar_url:
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    wallet_balance: 150.0,
    bio: 'Technology consultant and entrepreneur',
  },
  {
    email: 'john@talkee.com',
    password: 'Ab123456',
    phone: '+905551234502',
    name: 'John Doe',
    avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg',
    wallet_balance: 50.0,
    bio: 'Business consultant with 15 years experience',
  },
  {
    email: 'sarah@talkee.com',
    password: 'Ab123456',
    phone: '+905551234503',
    name: 'Sarah Smith',
    avatar_url: 'https://randomuser.me/api/portraits/women/2.jpg',
    wallet_balance: 75.0,
    bio: 'Digital marketing specialist',
  },
  {
    email: 'mike@talkee.com',
    password: 'Ab123456',
    phone: '+905551234504',
    name: 'Mike Johnson',
    avatar_url: 'https://randomuser.me/api/portraits/men/3.jpg',
    wallet_balance: 100.0,
    bio: 'Full-stack software developer',
  },
  {
    email: 'emily@talkee.com',
    password: 'Ab123456',
    phone: '+905551234505',
    name: 'Emily Brown',
    avatar_url: 'https://randomuser.me/api/portraits/women/4.jpg',
    wallet_balance: 200.0,
    bio: 'Corporate lawyer and legal advisor',
  },
  {
    email: 'alex@talkee.com',
    password: 'Ab123456',
    phone: '+905551234506',
    name: 'Alex Turner',
    avatar_url: 'https://randomuser.me/api/portraits/men/5.jpg',
    wallet_balance: 80.0,
    bio: 'Financial advisor and investment strategist',
  },
  {
    email: 'lisa@talkee.com',
    password: 'Ab123456',
    phone: '+905551234507',
    name: 'Lisa Anderson',
    avatar_url: 'https://randomuser.me/api/portraits/women/6.jpg',
    wallet_balance: 120.0,
    bio: 'Health and wellness coach',
  },
  {
    email: 'david@talkee.com',
    password: 'Ab123456',
    phone: '+905551234508',
    name: 'David Martinez',
    avatar_url: 'https://randomuser.me/api/portraits/men/7.jpg',
    wallet_balance: 90.0,
    bio: 'Education specialist and tutor',
  },
  {
    email: 'emma@talkee.com',
    password: 'Ab123456',
    phone: '+905551234509',
    name: 'Emma Wilson',
    avatar_url: 'https://randomuser.me/api/portraits/women/8.jpg',
    wallet_balance: 110.0,
    bio: 'Career coach and HR consultant',
  },
  {
    email: 'james@talkee.com',
    password: 'Ab123456',
    phone: '+905551234510',
    name: 'James Taylor',
    avatar_url: 'https://randomuser.me/api/portraits/men/9.jpg',
    wallet_balance: 95.0,
    bio: 'Real estate advisor and investor',
  },
];

async function createUser(user: TestUser) {
  try {
    console.log(`\n📝 Creating user: ${user.name} (${user.email})...`);

    // Step 1: Create auth user with Admin API
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name,
          phone: user.phone,
        },
      });

    if (authError) {
      console.error(`   ❌ Auth error:`, authError.message);
      return null;
    }

    console.log(
      `   ✅ Auth user created (ID: ${authData.user.id.substring(0, 8)}...)`
    );

    // Step 2: Wait for trigger to create profile
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 3: Update profile with additional data
    const { error: updateError } = await supabase
      .from('talkee.users')
      .update({
        phone: user.phone,
        avatar_url: user.avatar_url,
        wallet_balance: user.wallet_balance,
        bio: user.bio,
      })
      .eq('auth_id', authData.user.id);

    if (updateError) {
      console.error(`   ❌ Profile update error:`, updateError.message);
    } else {
      console.log(`   ✅ Profile updated`);
    }

    return authData.user;
  } catch (error: any) {
    console.error(`   ❌ Unexpected error:`, error.message);
    return null;
  }
}

async function seedUsers() {
  console.log('🚀 Starting bulk user creation...');
  console.log('━'.repeat(50));

  let successCount = 0;
  let errorCount = 0;

  for (const user of testUsers) {
    const result = await createUser(user);
    if (result) {
      successCount++;
    } else {
      errorCount++;
    }

    // Small delay between users
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n' + '━'.repeat(50));
  console.log('✅ Bulk user creation completed!');
  console.log(`   Success: ${successCount} users`);
  console.log(`   Errors: ${errorCount} users`);
  console.log('\n📋 All users have password: Ab123456');
  console.log('📱 Phone numbers: +905551234501 to +905551234510');
}

// Run the script
seedUsers().catch(console.error);
