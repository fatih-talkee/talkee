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
  // Webhook'lar public olmalı - Stripe Authorization header göndermez
  // Sadece signature verification ile güvenlik sağlanır

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.text();

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return new Response(
      JSON.stringify({ error: 'Webhook secret not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature (this is the security mechanism for webhooks)
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(
      JSON.stringify({ error: 'Webhook signature verification failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
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

  // Structured logging
  const logContext = {
    event: 'payment_success',
    user_id,
    payment_intent_id: paymentIntent.id,
    amount,
    type,
    currency: paymentIntent.currency,
    timestamp: new Date().toISOString(),
  };

  console.log('Payment succeeded:', logContext);

  // Idempotency check: Check if this payment intent was already processed
  const { data: existingTransaction } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (existingTransaction) {
    console.log('Payment intent already processed (idempotency):', {
      ...logContext,
      existing_transaction_id: existingTransaction.id,
    });
    return; // Already processed, skip
  }

  if (type === 'credit_purchase') {
    try {
      // Get user info (for customer ID and email)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, primary_email, name, stripe_customer_id')
        .eq('id', user_id)
        .single();

      if (userError || !user) {
        throw new Error(`User not found: ${user_id}`);
      }

      // Ensure Stripe customer exists
      let customerId = user.stripe_customer_id;
      if (!customerId && user.primary_email) {
        // Create Stripe customer if doesn't exist
        const customer = await stripe.customers.create({
          email: user.primary_email,
          name: user.name || 'User',
          metadata: {
            user_id: user.id,
          },
        });
        customerId = customer.id;

        // Update user with customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user_id);

        console.log('Stripe customer created:', {
          ...logContext,
          customer_id: customerId,
        });
      }

      // Create Stripe invoice (optional but recommended)
      let stripeInvoiceId: string | null = null;
      let invoicePdfUrl: string | null = null;
      try {
        if (customerId) {
          const invoice = await stripe.invoices.create({
            customer: customerId,
            payment_intent: paymentIntent.id,
            description: `Credit purchase - $${amount.toFixed(2)}`,
            metadata: {
              user_id: user_id,
              type: 'credit_purchase',
            },
          });

          // Finalize invoice
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            invoice.id
          );
          stripeInvoiceId = finalizedInvoice.id;
          invoicePdfUrl = finalizedInvoice.hosted_invoice_url || null;

          console.log('Stripe invoice created:', {
            ...logContext,
            invoice_id: stripeInvoiceId,
          });
        }
      } catch (invoiceError: any) {
        // Invoice creation is optional, log but don't fail
        console.warn('Failed to create Stripe invoice:', {
          ...logContext,
          error: invoiceError.message,
        });
      }

      // Add credits to user (creates credit_transactions record and updates wallet_balance)
      const { error: creditsError } = await supabase.rpc('add_user_credits', {
        p_user_id: user_id,
        p_amount: amount,
        p_type: 'purchase',
        p_description: 'Credit purchase',
        p_stripe_payment_intent_id: paymentIntent.id,
      });

      if (creditsError) {
        console.error('Error adding credits:', {
          ...logContext,
          error: creditsError.message,
        });
        throw creditsError;
      }

      // Verify wallet_balance was updated
      const { data: updatedUser, error: verifyError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user_id)
        .single();

      if (verifyError) {
        console.warn('Warning: Could not verify wallet balance update:', {
          ...logContext,
          error: verifyError.message,
        });
      } else {
        console.log('Wallet balance updated successfully:', {
          ...logContext,
          new_balance: updatedUser.wallet_balance,
        });
      }

      // Create transaction record (for wallet history)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user_id,
          type: 'credit_purchase',
          amount: amount,
          description: `Credit purchase - $${amount.toFixed(2)}`,
          status: 'completed',
        });

      if (transactionError) {
        console.error('Error creating transaction:', {
          ...logContext,
          error: transactionError.message,
        });
        // Don't throw - credits already added, transaction is secondary
      }

      // Create notification
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id,
          type: 'payment',
          title: 'Credits Added 💰',
          message: `Your account has been credited with $${amount.toFixed(2)}.`,
          data: {
            amount,
            payment_intent_id: paymentIntent.id,
            invoice_id: stripeInvoiceId,
            invoice_url: invoicePdfUrl,
            type: 'credit_purchase',
          },
        })
        .select()
        .single();

      if (notificationError) {
        console.error('Error creating notification:', {
          ...logContext,
          error: notificationError.message,
        });
      } else {
        // Send push notification
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

          // First, check if user has active device tokens
          const { data: devices, error: devicesError } = await supabase
            .from('user_devices')
            .select('push_token, platform, is_active')
            .eq('user_id', user_id)
            .eq('is_active', true)
            .limit(1);

          if (devicesError) {
            console.error('Error checking device tokens:', {
              ...logContext,
              error: devicesError.message,
            });
          } else if (!devices || devices.length === 0) {
            console.warn('No active device tokens found for user:', {
              ...logContext,
              message:
                'User may not have granted notification permissions or app not initialized',
            });
          } else {
            // User has active devices, send push notification
            const pushResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-push`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${Deno.env.get(
                    'SUPABASE_SERVICE_ROLE_KEY'
                  )}`,
                },
                body: JSON.stringify({
                  user_id,
                  title: 'Credits Added 💰',
                  body: `Your account has been credited with $${amount.toFixed(
                    2
                  )}.`,
                  data: {
                    notification_id: notification.id,
                    type: 'payment',
                    amount,
                    payment_intent_id: paymentIntent.id,
                  },
                  sound: 'default',
                  priority: 'high',
                }),
              }
            );

            if (!pushResponse.ok) {
              const pushError = await pushResponse.text();
              console.warn('Failed to send push notification:', {
                ...logContext,
                error: pushError,
                status: pushResponse.status,
              });
            } else {
              const pushResult = await pushResponse.json();
              console.log('Push notification sent successfully:', {
                ...logContext,
                result: pushResult,
              });
            }
          }
        } catch (pushError: any) {
          // Push notification is optional, log but don't fail
          console.warn('Error sending push notification:', {
            ...logContext,
            error: pushError.message,
            stack: pushError.stack,
          });
        }
      }

      // Success log
      console.log('Payment processed successfully:', {
        ...logContext,
        customer_id: customerId,
        invoice_id: stripeInvoiceId,
        invoice_url: invoicePdfUrl,
      });
    } catch (error: any) {
      // Detailed error logging
      console.error('Error processing payment:', {
        ...logContext,
        error: error.message,
        stack: error.stack,
      });

      // Create failure notification
      await supabase.from('notifications').insert({
        user_id,
        type: 'system',
        title: 'Payment Processing Error',
        message:
          'Your payment was received but there was an error processing it. Please contact support.',
        data: {
          payment_intent_id: paymentIntent.id,
          error: error.message,
        },
      });

      throw error;
    }
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { user_id } = paymentIntent.metadata;

  const logContext = {
    event: 'payment_failed',
    user_id,
    payment_intent_id: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
    error_type: paymentIntent.last_payment_error?.type,
    timestamp: new Date().toISOString(),
  };

  console.log('Payment failed:', logContext);

  // Create failed transaction record
  try {
    await supabase.from('transactions').insert({
      user_id: user_id,
      type: 'credit_purchase',
      amount: paymentIntent.amount / 100,
      description: `Failed credit purchase - $${(
        paymentIntent.amount / 100
      ).toFixed(2)}`,
      status: 'failed',
    });
  } catch (error: any) {
    console.error('Error creating failed transaction:', {
      ...logContext,
      error: error.message,
    });
  }

  // Send notification
  await supabase.from('notifications').insert({
    user_id,
    type: 'system',
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again.',
    data: {
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
      error_type: paymentIntent.last_payment_error?.type,
    },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  const refundAmount = charge.amount_refunded / 100;

  const logContext = {
    event: 'refund_processed',
    payment_intent_id: paymentIntentId,
    charge_id: charge.id,
    refund_amount: refundAmount,
    timestamp: new Date().toISOString(),
  };

  console.log('Processing refund:', logContext);

  // Find the original transaction
  const { data: transaction } = await supabase
    .from('credit_transactions')
    .select('user_id, amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!transaction) {
    console.log('No transaction found for refund:', logContext);
    return;
  }

  try {
    // Deduct credits (refund)
    const { error: creditsError } = await supabase.rpc('add_user_credits', {
      p_user_id: transaction.user_id,
      p_amount: -refundAmount, // Negative to deduct
      p_type: 'refund',
      p_description: `Refund for payment ${paymentIntentId}`,
      p_stripe_payment_intent_id: paymentIntentId,
    });

    if (creditsError) {
      console.error('Error processing refund credits:', {
        ...logContext,
        user_id: transaction.user_id,
        error: creditsError.message,
      });
      throw creditsError;
    }

    // Create refund transaction record
    await supabase.from('transactions').insert({
      user_id: transaction.user_id,
      type: 'credit_purchase', // Keep same type for tracking
      amount: -refundAmount, // Negative amount for refund
      description: `Refund for payment ${paymentIntentId} - $${refundAmount.toFixed(
        2
      )}`,
      status: 'completed',
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
        charge_id: charge.id,
      },
    });

    console.log('Refund processed successfully:', {
      ...logContext,
      user_id: transaction.user_id,
    });
  } catch (error: any) {
    console.error('Error processing refund:', {
      ...logContext,
      user_id: transaction.user_id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
