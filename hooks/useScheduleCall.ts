// hooks/useScheduleCall.ts
// React Query hooks for schedule call functionality

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { professionalsService } from '@/services/supabase';
import type { TimeSlot, ScheduledCall, Professional } from '@/types';

/**
 * Get professional by ID for scheduling
 */
export function useProfessionalForSchedule(professionalId: string) {
  return useQuery({
    queryKey: ['professional', professionalId, 'schedule'],
    queryFn: async (): Promise<Professional | null> => {
      try {
        const professional = await professionalsService.getProfessional(professionalId);
        if (!professional) {
          throw new Error('Professional not found');
        }
        return professional;
      } catch (error) {
        handleError(error, 'Failed to fetch professional');
        throw error;
      }
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Get available time slots for a specific date
 */
export function useAvailableTimeSlots(
  professionalId: string,
  date: string | null
) {
  return useQuery({
    queryKey: ['professional', professionalId, 'time-slots', date],
    queryFn: async (): Promise<TimeSlot[]> => {
      try {
        // TODO: Replace with actual API call
        logger.info('Fetching available time slots', { professionalId, date });
        
        if (!date) return [];

        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();

        // Weekend check
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return [];
        }

        // TODO: Replace with actual API call to get real availability
        const times = [
          '09:00',
          '10:00',
          '11:00',
          '13:00',
          '14:00',
          '15:00',
          '16:00',
          '17:00',
        ];

        return times.map((time) => ({
          time,
          available: Math.random() > 0.2, // Mock availability
        }));
      } catch (error) {
        handleError(error, 'Failed to fetch available time slots');
        throw error;
      }
    },
    enabled: !!professionalId && !!date,
    staleTime: 1000 * 60 * 2, // 2 minutes (availability changes frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get marked dates (available dates) for calendar
 */
export function useAvailableDates(professionalId: string) {
  return useQuery({
    queryKey: ['professional', professionalId, 'available-dates'],
    queryFn: async (): Promise<Record<string, any>> => {
      try {
        // TODO: Replace with actual API call
        logger.info('Fetching available dates', { professionalId });
        
        const marked: Record<string, any> = {};
        const today = new Date();

        // Generate next 60 days
        for (let i = 0; i < 60; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateString = date.toISOString().split('T')[0];
          const dayOfWeek = date.getDay();

          // Only weekdays
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            marked[dateString] = {
              marked: true,
            };
          }
        }

        return marked;
      } catch (error) {
        handleError(error, 'Failed to fetch available dates');
        throw error;
      }
    },
    enabled: !!professionalId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Schedule a call
 */
export function useScheduleCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      professionalId: string;
      scheduledDate: string;
      scheduledTime: string;
      callType: 'voice' | 'video';
    }) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Scheduling call', data);

        const scheduledCall: ScheduledCall = {
          id: Date.now().toString(),
          professionalId: data.professionalId,
          userId: '', // Will be set by backend
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          callType: data.callType,
          status: 'pending',
          ratePerMinute: 0, // Will be set by backend
          currency: 'USD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return scheduledCall;
      } catch (error) {
        handleError(error, 'Failed to schedule call');
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['professional', data.professionalId, 'time-slots'],
      });
      queryClient.invalidateQueries({
        queryKey: ['scheduled-calls'],
      });
    },
  });
}

