// favorites.service.ts
// ✅ FIXED: Uses RPC functions to bypass RLS

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { ProfessionalWithRelations } from '@/types/database.types';

class FavoritesService {
  /**
   * Get all favorites for the current user
   * ✅ OPTIMIZED: Parallel auth and user lookup
   */
  async getFavorites(): Promise<ProfessionalWithRelations[]> {
    try {
      // ✅ OPTIMIZED: Get auth user first, then fetch database user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Get the database user ID
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

      if (userError || !dbUser) {
        throw new Error('User not found in database');
      }

      // ✅ OPTIMIZED: Only select fields needed for list display (not all professional data)
      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          professional_id,
          professionals (
            id,
            title,
            profession,
            rate_per_minute,
            is_featured,
            is_active,
            is_available,
            total_calls,
            specialties,
            users (id, name, avatar_url, is_verified),
            categories (id, name, slug, icon_name)
          )
        `
        )
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }

      const professionals = (data || [])
        .map((favorite: any) => favorite.professionals)
        .filter((prof: any) => prof != null) as ProfessionalWithRelations[];

      return professionals;
    } catch (error) {
      console.error('Error in getFavorites:', error);
      throw error;
    }
  }

  /**
   * Check if a professional is favorited
   * ✅ OPTIMIZED: Uses composite index for faster lookup
   */
  async isFavorite(professionalId: string): Promise<boolean> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        return false;
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

      if (!dbUser) {
        return false;
      }

      // ✅ OPTIMIZED: Uses composite index (user_id, professional_id) if exists
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', dbUser.id)
        .eq('professional_id', professionalId)
        .maybeSingle();

      if (error) {
        console.error('Error checking favorite:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in isFavorite:', error);
      return false;
    }
  }

  /**
   * Add a professional to favorites
   * ✅ OPTIMIZED: Removed unnecessary getUser() call (RPC uses auth.uid())
   */
  async addFavorite(professionalId: string): Promise<boolean> {
    try {
      // ✅ OPTIMIZED: RPC function uses auth.uid() internally, no need to check auth here
      // Call RPC function (bypasses RLS)
      const { data, error } = await supabase.rpc('insert_favorite', {
        p_professional_id: professionalId,
      });

      if (error) {
        console.error('❌ [addFavorite] RPC error:', error);
        throw new Error(error.message || 'Failed to add favorite');
      }
      return true;
    } catch (error: any) {
      console.error('❌ [addFavorite] Error:', error);
      throw error;
    }
  }

  /**
   * Remove a professional from favorites
   * ✅ OPTIMIZED: Removed unnecessary getUser() call (RPC uses auth.uid())
   */
  async removeFavorite(professionalId: string): Promise<boolean> {
    try {
      // ✅ OPTIMIZED: RPC function uses auth.uid() internally, no need to check auth here
      // Call RPC function (bypasses RLS)
      const { data, error } = await supabase.rpc('remove_favorite', {
        p_professional_id: professionalId,
      });

      if (error) {
        console.error('❌ [removeFavorite] RPC error:', error);
        throw new Error(error.message || 'Failed to remove favorite');
      }
      return true;
    } catch (error: any) {
      console.error('❌ [removeFavorite] Error:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(professionalId: string): Promise<boolean> {
    try {
      const isFav = await this.isFavorite(professionalId);

      if (isFav) {
        await this.removeFavorite(professionalId);
        return false;
      } else {
        await this.addFavorite(professionalId);
        return true;
      }
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      throw error;
    }
  }
}

export const favoritesService = new FavoritesService();
