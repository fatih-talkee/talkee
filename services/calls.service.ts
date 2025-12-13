// ✅ Calls service with is_available restored (after migration)

import { supabase } from '../lib/supabase';
import { usersService } from './supabase/user.service';
import { notificationsService } from './notifications.service';
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
        .select('id, user_id, rate_per_minute, is_available') // ✅ Restored is_available
        .eq('id', professionalId)
        .single();

      if (profError || !professional) {
        throw new Error('Professional not found');
      }

      // ✅ Restored is_available check
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

      // Send push notification to professional
      // We don't await this so it doesn't block the UI
      notificationsService.sendPushNotification(
        professional.user_id,
        'Incoming Call',
        `${currentUser.name || 'Someone'} is calling you...`,
        {
          type: 'call_request',
          call_id: data.id,
          caller_id: currentUser.id,
          caller_name: currentUser.name,
          call_type: callType,
        }
      ).catch(err => console.error('Error sending call notification:', err));

      return data as CallWithRelations;
    } catch (error) {
      console.error('Error in initiateCall:', error);
      throw error;
    }
  }

  /**
   * Get call history for current user
   * Returns calls where user is the caller
   */
  async getCallHistory(
    filters?: CallFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<CallWithRelations[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
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
            users!inner(id, name, avatar_url, is_verified),
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
      throw error;
    }
  }

  /**
   * Get a single call by ID
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
            users!inner(id, name, avatar_url, is_verified),
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

      return data as CallWithRelations | null;
    } catch (error) {
      console.error('Error in getCall:', error);
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
        // ✅ FIXED: lowercase status values
        completedCalls: calls.filter((c) => c.status === 'completed').length,
        missedCalls: calls.filter((c) => c.status === 'missed').length,
        cancelledCalls: calls.filter((c) => c.status === 'cancelled').length,
      };

      return stats;
    } catch (error) {
      console.error('Error in getCallStats:', error);
      throw error;
    }
  }

  // ... rest of methods stay the same
}

export const callsService = new CallsService();
