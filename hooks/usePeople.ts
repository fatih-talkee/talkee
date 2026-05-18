/**
 * People Hook
 * Combines favorites and call history to show user's contacts
 */

import { useMemo } from 'react';
import { useFavorites } from './useFavorites';
import { useInfiniteCallHistory } from './useCalls';
import { CallStatus } from '@/types/database.types';
import type { ProfessionalWithRelations } from '@/types/database.types';

export function usePeople() {
  // Fetch favorites
  const { data: favorites = [], isLoading: favoritesLoading, error: favoritesError } = useFavorites();
  
  // Fetch completed calls from history
  const { 
    data: callHistoryData, 
    isLoading: historyLoading, 
    error: historyError 
  } = useInfiniteCallHistory({ 
    status: CallStatus.COMPLETED 
  });

  // Combine and deduplicate people
  const people = useMemo(() => {
    // Start with favorites
    const peopleMap = new Map<string, ProfessionalWithRelations>();
    
    // Add all favorites
    favorites.forEach(fav => {
      peopleMap.set(fav.id, fav);
    });
    
    // Add professionals from call history (if not already in favorites)
    if (callHistoryData?.pages) {
      callHistoryData.pages.flat().forEach(call => {
        const professional = call.professional;
        if (professional && !peopleMap.has(professional.id)) {
          peopleMap.set(professional.id, professional as ProfessionalWithRelations);
        }
      });
    }
    
    // Convert to array and sort by name
    return Array.from(peopleMap.values()).sort((a, b) => {
      const nameA = a.users?.name || '';
      const nameB = b.users?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [favorites, callHistoryData]);

  return {
    people,
    isLoading: favoritesLoading || historyLoading,
    error: favoritesError || historyError,
  };
}
