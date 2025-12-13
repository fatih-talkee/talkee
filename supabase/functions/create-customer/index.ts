// supabase/functions/create-customer/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, email, name } = await req.json();

    console.log('Creating Stripe customer:', { userId, email, name });

    // Check if customer already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (existingUser?.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          customerId: existingUser.stripe_customer_id,
          message: 'Customer already exists',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        user_id: userId,
      },
    });

    console.log('Stripe customer created:', customer.id);

    // Update user with customer ID
    const { error: updateError } = await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        customerId: customer.id,
        message: 'Customer created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating customer:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create customer',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
