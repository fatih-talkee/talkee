// services/stripe.service.ts
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// ✅ Type definitions for better type safety
interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

interface CustomerResponse {
  customerId: string;
  email: string;
}

interface UserCredits {
  balance: number;
  total_earned?: number;
  total_spent?: number;
}

export class StripeService {
  /**
   * Create payment intent for credit purchase
   * ✅ OPTIMIZED: Added logger, input validation, type safety, better error handling
   */
  async createPaymentIntent(
    amount: number,
    userId: string
  ): Promise<PaymentIntentResponse> {
    const startTime = Date.now();
    logger.info('[StripeService] 💳 Creating payment intent', {
      amount,
      userId,
      timestamp: new Date().toISOString(),
    });

    // ✅ Input validation
    if (!amount || amount <= 0) {
      const error = new Error('Invalid amount: must be greater than 0');
      logger.error('[StripeService] ❌ Invalid amount', error, {
        amount,
        userId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    if (!userId || typeof userId !== 'string') {
      const error = new Error('Invalid userId: must be a non-empty string');
      logger.error('[StripeService] ❌ Invalid userId', error, {
        amount,
        userId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    try {
      const invokeStartTime = Date.now();
      const { data, error } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            amount,
            userId,
            metadata: {
              type: 'credit_purchase',
            },
          },
        }
      );
      const invokeElapsed = Date.now() - invokeStartTime;

      if (error) {
        logger.error(
          '[StripeService] ❌ Error creating payment intent',
          error,
          {
            amount,
            userId,
            errorMessage: error.message,
            errorName: error.name,
            invokeElapsed: `${invokeElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw error;
      }

      if (!data?.clientSecret || !data?.paymentIntentId) {
        const error = new Error('Invalid response: missing clientSecret or paymentIntentId');
        logger.error('[StripeService] ❌ Invalid payment intent response', error, {
          amount,
          userId,
          hasClientSecret: !!data?.clientSecret,
          hasPaymentIntentId: !!data?.paymentIntentId,
          invokeElapsed: `${invokeElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }

      const totalElapsed = Date.now() - startTime;
      logger.info('[StripeService] ✅ Payment intent created', {
        amount,
        userId,
        paymentIntentId: data.paymentIntentId,
        invokeElapsed: `${invokeElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (error) {
      const totalElapsed = Date.now() - startTime;
      logger.error(
        '[StripeService] ❌ Unexpected error creating payment intent',
        error,
        {
          amount,
          userId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Create Stripe customer for user
   * ✅ OPTIMIZED: Added logger, input validation, type safety, better error handling
   */
  async createCustomer(
    userId: string,
    email: string,
    name: string
  ): Promise<CustomerResponse> {
    const startTime = Date.now();
    logger.info('[StripeService] 👤 Creating Stripe customer', {
      userId,
      email,
      name,
      timestamp: new Date().toISOString(),
    });

    // ✅ Input validation
    if (!userId || typeof userId !== 'string') {
      const error = new Error('Invalid userId: must be a non-empty string');
      logger.error('[StripeService] ❌ Invalid userId', error, {
        userId,
        email,
        name,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      const error = new Error('Invalid email: must be a valid email address');
      logger.error('[StripeService] ❌ Invalid email', error, {
        userId,
        email,
        name,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      const error = new Error('Invalid name: must be a non-empty string');
      logger.error('[StripeService] ❌ Invalid name', error, {
        userId,
        email,
        name,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    try {
      const invokeStartTime = Date.now();
      const { data, error } = await supabase.functions.invoke('create-customer', {
        body: { userId, email, name },
      });
      const invokeElapsed = Date.now() - invokeStartTime;

      if (error) {
        logger.error('[StripeService] ❌ Error creating customer', error, {
          userId,
          email,
          name,
          errorMessage: error.message,
          errorName: error.name,
          invokeElapsed: `${invokeElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }

      if (!data?.customerId) {
        const error = new Error('Invalid response: missing customerId');
        logger.error('[StripeService] ❌ Invalid customer response', error, {
          userId,
          email,
          name,
          hasCustomerId: !!data?.customerId,
          invokeElapsed: `${invokeElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }

      const totalElapsed = Date.now() - startTime;
      logger.info('[StripeService] ✅ Stripe customer created', {
        userId,
        email,
        name,
        customerId: data.customerId,
        invokeElapsed: `${invokeElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        customerId: data.customerId,
        email: data.email || email,
      };
    } catch (error) {
      const totalElapsed = Date.now() - startTime;
      logger.error(
        '[StripeService] ❌ Unexpected error creating customer',
        error,
        {
          userId,
          email,
          name,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Get user credits balance
   * ✅ OPTIMIZED: Added logger, input validation, type safety, better error handling
   */
  async getUserCredits(userId: string): Promise<UserCredits> {
    const startTime = Date.now();
    logger.debug('[StripeService] 💰 Getting user credits', {
      userId,
      timestamp: new Date().toISOString(),
    });

    // ✅ Input validation
    if (!userId || typeof userId !== 'string') {
      const error = new Error('Invalid userId: must be a non-empty string');
      logger.error('[StripeService] ❌ Invalid userId', error, {
        userId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    try {
      const rpcStartTime = Date.now();
      const { data, error } = await supabase.rpc('get_user_credits', {
        p_user_id: userId,
      });
      const rpcElapsed = Date.now() - rpcStartTime;

      if (error) {
        logger.error('[StripeService] ❌ Error getting credits', error, {
          userId,
          errorMessage: error.message,
          errorCode: error.code,
          rpcElapsed: `${rpcElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }

      const credits = (data || { balance: 0 }) as UserCredits;
      const totalElapsed = Date.now() - startTime;

      logger.info('[StripeService] ✅ User credits retrieved', {
        userId,
        balance: credits.balance,
        rpcElapsed: `${rpcElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return credits;
    } catch (error) {
      const totalElapsed = Date.now() - startTime;
      logger.error(
        '[StripeService] ❌ Unexpected error getting credits',
        error,
        {
          userId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Get credit transactions history
   * ✅ OPTIMIZED: Added logger, input validation, type safety, better error handling
   * Note: Assumes index exists on credit_transactions(user_id, created_at DESC)
   */
  async getCreditTransactions(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    const startTime = Date.now();
    logger.debug('[StripeService] 📜 Getting credit transactions', {
      userId,
      limit,
      timestamp: new Date().toISOString(),
    });

    // ✅ Input validation
    if (!userId || typeof userId !== 'string') {
      const error = new Error('Invalid userId: must be a non-empty string');
      logger.error('[StripeService] ❌ Invalid userId', error, {
        userId,
        limit,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    if (limit < 1 || limit > 100) {
      logger.warn('[StripeService] ⚠️ Limit out of range, clamping', {
        userId,
        requestedLimit: limit,
        clampedLimit: Math.max(1, Math.min(100, limit)),
        timestamp: new Date().toISOString(),
      });
      limit = Math.max(1, Math.min(100, limit));
    }

    try {
      const queryStartTime = Date.now();
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      const queryElapsed = Date.now() - queryStartTime;

      if (error) {
        logger.error(
          '[StripeService] ❌ Error getting credit transactions',
          error,
          {
            userId,
            limit,
            errorMessage: error.message,
            errorCode: error.code,
            queryElapsed: `${queryElapsed}ms`,
            timestamp: new Date().toISOString(),
          }
        );
        throw error;
      }

      const transactions = data || [];
      const totalElapsed = Date.now() - startTime;

      logger.info('[StripeService] ✅ Credit transactions retrieved', {
        userId,
        limit,
        count: transactions.length,
        queryElapsed: `${queryElapsed}ms`,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return transactions;
    } catch (error) {
      const totalElapsed = Date.now() - startTime;
      logger.error(
        '[StripeService] ❌ Unexpected error getting credit transactions',
        error,
        {
          userId,
          limit,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }
}

export const stripeService = new StripeService();
