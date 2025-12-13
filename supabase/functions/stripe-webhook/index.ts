// supabase/functions/stripe-webhook/index.ts

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

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(
      JSON.stringify({ error: 'Webhook signature verification failed' }),
      { status: 400 }
    );
  }

  console.log('Webhook event received:', event.type);

  try {
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(paymentIntent);
        break;
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        console.log('Customer created:', customer.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { user_id, type } = paymentIntent.metadata;
  const amount = paymentIntent.amount / 100; // Convert from cents

  console.log('Payment succeeded:', { user_id, amount, type });

  if (type === 'credit_purchase') {
    // Add credits to user
    const { error } = await supabase.rpc('add_user_credits', {
      p_user_id: user_id,
      p_amount: amount,
      p_type: 'purchase',
      p_description: 'Credit purchase',
      p_stripe_payment_intent_id: paymentIntent.id,
    });

    if (error) {
      console.error('Error adding credits:', error);
      throw error;
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id,
      type: 'payment',
      title: 'Credits Added 💰',
      message: `Your account has been credited with $${amount.toFixed(2)}.`,
      data: {
        amount,
        payment_intent_id: paymentIntent.id,
        type: 'credit_purchase',
      },
    });

    console.log('Credits added successfully:', { user_id, amount });
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { user_id } = paymentIntent.metadata;

  console.log('Payment failed:', { user_id, payment_intent: paymentIntent.id });

  // Send notification
  await supabase.from('notifications').insert({
    user_id,
    type: 'system',
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again.',
    data: {
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;

  // Find the original transaction
  const { data: transaction } = await supabase
    .from('credit_transactions')
    .select('user_id, amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!transaction) {
    console.log('No transaction found for refund');
    return;
  }

  const refundAmount = charge.amount_refunded / 100;

  // Deduct credits (refund)
  await supabase.rpc('add_user_credits', {
    p_user_id: transaction.user_id,
    p_amount: -refundAmount, // Negative to deduct
    p_type: 'refund',
    p_description: `Refund for payment ${paymentIntentId}`,
    p_stripe_payment_intent_id: paymentIntentId,
  });

  // Notify user
  await supabase.from('notifications').insert({
    user_id: transaction.user_id,
    type: 'payment',
    title: 'Refund Processed',
    message: `A refund of $${refundAmount.toFixed(2)} has been processed.`,
    data: {
      amount: refundAmount,
      payment_intent_id: paymentIntentId,
    },
  });

  console.log('Refund processed:', {
    user_id: transaction.user_id,
    amount: refundAmount,
  });
}
