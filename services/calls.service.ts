import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import type {
  Call,
  CallWithRelations,
  CallInsert,
  CallUpdate,
  CallType,
  CallFilters,
} from '../types/database.types';
import { CallStatus } from '../types/database.types';

export interface CallStats {
  totalCalls: number;
  totalMinutes: number;
  totalSpent: number;
  averageRating: number;
  completedCalls: number;
  missedCalls: number;
  cancelledCalls: number;
}

export interface ProfessionalEarnings {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalCalls: number;
  averageCallDuration: number;
}

class CallsService {
  /**
   * Initiate a new call
   */
  async initiateCall(
    professionalId: string,
    callType: CallType = 'voice' as CallType
  ): Promise<CallWithRelations | null> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get professional details to get rate
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id, rate_per_minute, is_available')
        .eq('id', professionalId)
        .single();

      if (profError || !professional) {
        throw new Error('Professional not found');
      }

      if (!professional.is_available) {
        throw new Error('Professional is not available');
      }

      // Check if user has sufficient balance
      const estimatedCost = professional.rate_per_minute * 5; // Estimate 5 min minimum
      if (currentUser.wallet_balance < estimatedCost) {
        throw new Error('Insufficient balance');
      }

      // Create call record
      const callData: CallInsert = {
        caller_id: currentUser.id,
        professional_id: professionalId,
        status: CallStatus.PENDING as CallStatus,
        call_type: callType,
        rate_per_minute: professional.rate_per_minute,
        start_time: null,
        end_time: null,
        duration_minutes: 0,
        total_cost: 0,
        rating: null,
        notes: null,
        cancelled_by: null,
      };

      const { data, error } = await supabase
        .from('calls')
        .insert(callData)
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            rate_per_minute,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, icon_name)
          )
        `
        )
        .single();

      if (error) {
        console.error('Error creating call:', error);
        throw new Error(`Failed to create call: ${error.message}`);
      }

      return data as CallWithRelations;
    } catch (error) {
      console.error('Error in initiateCall:', error);
      throw error;
    }
  }

  /**
   * Start call (when both parties connect)
   */
  async startCall(callId: string): Promise<CallWithRelations | null> {
    try {
      const updateData: CallUpdate = {
        status: CallStatus.ACTIVE as CallStatus,
        start_time: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            rate_per_minute,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, icon_name)
          )
        `
        )
        .single();

      if (error) {
        console.error('Error starting call:', error);
        throw new Error(`Failed to start call: ${error.message}`);
      }

      return data as CallWithRelations;
    } catch (error) {
      console.error('Error in startCall:', error);
      throw error;
    }
  }

  /**
   * End call and process payment
   */
  async endCall(callId: string): Promise<CallWithRelations | null> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get call details
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*, professionals!professional_id(user_id, rate_per_minute)')
        .eq('id', callId)
        .single();

      if (callError || !call) {
        throw new Error('Call not found');
      }

      if (call.status !== 'active') {
        throw new Error('Call is not active');
      }

      // Calculate duration and cost
      const startTime = new Date(call.start_time!);
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.ceil(durationMs / (1000 * 60));
      const totalCost = durationMinutes * call.rate_per_minute;

      // Update call record
      const updateData: CallUpdate = {
        status: CallStatus.COMPLETED as CallStatus,
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        total_cost: totalCost,
      };

      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            rate_per_minute,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, icon_name)
          )
        `
        )
        .single();

      if (updateError) {
        console.error('Error updating call:', updateError);
        throw new Error(`Failed to end call: ${updateError.message}`);
      }

      // Process payment - deduct from caller, add to professional
      await this.processCallPayment(
        callId,
        call.caller_id,
        call.professionals.user_id,
        totalCost
      );

      return updatedCall as CallWithRelations;
    } catch (error) {
      console.error('Error in endCall:', error);
      throw error;
    }
  }

  /**
   * Cancel call
   */
  async cancelCall(callId: string, reason?: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const updateData: CallUpdate = {
        status: CallStatus.CANCELLED,
        notes: reason || 'Call cancelled',
        cancelled_by: currentUser.id,
      };

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId);

      if (error) {
        console.error('Error cancelling call:', error);
        throw new Error(`Failed to cancel call: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in cancelCall:', error);
      throw error;
    }
  }

  /**
   * Get call history for current user
   */
  async getCallHistory(
    filters?: CallFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<CallWithRelations[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      let query = supabase
        .from('calls')
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            rate_per_minute,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, icon_name)
          )
        `
        )
        .eq('caller_id', currentUser.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.callType) {
        query = query.eq('call_type', filters.callType);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching call history:', error);
        throw new Error(`Failed to fetch call history: ${error.message}`);
      }

      return (data || []) as CallWithRelations[];
    } catch (error) {
      console.error('Error in getCallHistory:', error);
      return [];
    }
  }

  /**
   * Get call history as professional
   */
  async getProfessionalCallHistory(
    filters?: CallFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<CallWithRelations[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      // Get professional record
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!professional) {
        return [];
      }

      let query = supabase
        .from('calls')
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            rate_per_minute,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, icon_name)
          )
        `
        )
        .eq('professional_id', professional.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.callType) {
        query = query.eq('call_type', filters.callType);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching professional call history:', error);
        throw new Error(
          `Failed to fetch professional call history: ${error.message}`
        );
      }

      return (data || []) as CallWithRelations[];
    } catch (error) {
      console.error('Error in getProfessionalCallHistory:', error);
      return [];
    }
  }

  /**
   * Get single call details
   */
  async getCall(callId: string): Promise<CallWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            rate_per_minute,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, icon_name)
          )
        `
        )
        .eq('id', callId)
        .single();

      if (error) {
        console.error('Error fetching call:', error);
        throw new Error(`Failed to fetch call: ${error.message}`);
      }

      return data as CallWithRelations;
    } catch (error) {
      console.error('Error in getCall:', error);
      return null;
    }
  }

  /**
   * Rate a completed call (just updates call rating)
   * Note: Use reviewsService.createReview() to create actual review
   */
  async rateCall(callId: string, rating: number): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const updateData: CallUpdate = {
        rating,
      };

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .eq('caller_id', currentUser.id);

      if (error) {
        console.error('Error updating call rating:', error);
        throw new Error(`Failed to rate call: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in rateCall:', error);
      throw error;
    }
  }

  /**
   * Get call statistics for user
   */
  async getCallStats(): Promise<CallStats> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('calls')
        .select('status, duration_minutes, total_cost, rating')
        .eq('caller_id', currentUser.id);

      if (error) {
        console.error('Error fetching call stats:', error);
        throw new Error(`Failed to fetch call stats: ${error.message}`);
      }

      const calls = data || [];

      const stats: CallStats = {
        totalCalls: calls.length,
        totalMinutes: calls.reduce(
          (sum, call) => sum + (call.duration_minutes || 0),
          0
        ),
        totalSpent: calls.reduce(
          (sum, call) => sum + (call.total_cost || 0),
          0
        ),
        averageRating:
          calls.filter((c) => c.rating).length > 0
            ? calls.reduce((sum, call) => sum + (call.rating || 0), 0) /
              calls.filter((c) => c.rating).length
            : 0,
        completedCalls: calls.filter((c) => c.status === 'COMPLETED').length,
        missedCalls: calls.filter((c) => c.status === 'MISSED').length,
        cancelledCalls: calls.filter((c) => c.status === 'CANCELLED').length,
      };

      return stats;
    } catch (error) {
      console.error('Error in getCallStats:', error);
      throw error;
    }
  }

  /**
   * Get professional's earnings statistics
   */
  async getProfessionalEarnings(): Promise<ProfessionalEarnings> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get professional record
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!professional) {
        throw new Error('Not a professional');
      }

      const { data, error } = await supabase
        .from('calls')
        .select('total_cost, duration_minutes, created_at')
        .eq('professional_id', professional.id)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching earnings:', error);
        throw new Error(`Failed to fetch earnings: ${error.message}`);
      }

      const calls = data || [];
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      return {
        totalEarnings: calls.reduce(
          (sum, call) => sum + (call.total_cost || 0),
          0
        ),
        thisMonthEarnings: calls
          .filter((call) => new Date(call.created_at) >= thisMonth)
          .reduce((sum, call) => sum + (call.total_cost || 0), 0),
        totalCalls: calls.length,
        averageCallDuration:
          calls.length > 0
            ? calls.reduce(
                (sum, call) => sum + (call.duration_minutes || 0),
                0
              ) / calls.length
            : 0,
      };
    } catch (error) {
      console.error('Error in getProfessionalEarnings:', error);
      throw error;
    }
  }

  /**
   * Process payment for a completed call
   * Private helper method
   *
   * Note: This uses wallet balance updates directly
   * In production, you may want to use Supabase RPC functions
   */
  private async processCallPayment(
    callId: string,
    callerId: string,
    professionalUserId: string,
    amount: number
  ): Promise<void> {
    try {
      // Get current balances
      const { data: caller } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', callerId)
        .single();

      const { data: professional } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', professionalUserId)
        .single();

      if (!caller || !professional) {
        throw new Error('Users not found');
      }

      // Deduct from caller's wallet
      const { error: deductError } = await supabase
        .from('users')
        .update({ wallet_balance: caller.wallet_balance - amount })
        .eq('id', callerId);

      if (deductError) {
        console.error('Error deducting from wallet:', deductError);
        throw new Error(`Failed to deduct from wallet: ${deductError.message}`);
      }

      // Add to professional's wallet
      const { error: addError } = await supabase
        .from('users')
        .update({ wallet_balance: professional.wallet_balance + amount })
        .eq('id', professionalUserId);

      if (addError) {
        console.error('Error adding to wallet:', addError);
        throw new Error(`Failed to add to wallet: ${addError.message}`);
      }

      // Create transaction records
      await supabase.from('transactions').insert([
        {
          user_id: callerId,
          type: 'call_expense',
          amount: amount,
          description: `Call expense - $${amount.toFixed(2)}`,
          call_id: callId,
          status: 'completed',
        },
        {
          user_id: professionalUserId,
          type: 'call_earning',
          amount: amount,
          description: `Call earning - $${amount.toFixed(2)}`,
          call_id: callId,
          status: 'completed',
        },
      ]);
    } catch (error) {
      console.error('Error in processCallPayment:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const callsService = new CallsService();
