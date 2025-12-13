// services/stripe.service.ts
import { supabase } from '@/lib/supabase';

export class StripeService {
  /**
   * Create payment intent for credit purchase
   */
  async createPaymentIntent(amount: number, userId: string) {
    try {
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

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create Stripe customer for user
   */
  async createCustomer(userId: string, email: string, name: string) {
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-customer',
        {
          body: { userId, email, name },
        }
      );

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Get user credits balance
   */
  async getUserCredits(userId: string) {
    try {
      const { data, error } = await supabase.rpc('get_user_credits', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error getting credits:', error);
      throw error;
    }
  }

  /**
   * Get credit transactions history
   */
  async getCreditTransactions(userId: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
