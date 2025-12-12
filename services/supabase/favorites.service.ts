// favorites.service.ts
// ✅ FIXED: Uses RPC functions to bypass RLS

import { supabase } from '@/lib/supabase';
import type { ProfessionalWithRelations } from '@/types/database.types';

class FavoritesService {
  /**
   * Get all favorites for the current user
   */
  async getFavorites(): Promise<ProfessionalWithRelations[]> {
    try {
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

      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          professional_id,
          professionals (
            *,
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
   * ✅ FIXED: Uses RPC function
   */
  async addFavorite(professionalId: string): Promise<boolean> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 [addFavorite] Calling RPC function with:', {
        professionalId,
        authId: authUser.id,
      });

      // ✅ Call RPC function (bypasses RLS)
      const { data, error } = await supabase.rpc('insert_favorite', {
        p_professional_id: professionalId,
      });

      if (error) {
        console.error('❌ [addFavorite] RPC error:', error);
        throw new Error(error.message || 'Failed to add favorite');
      }

      console.log('✅ [addFavorite] Success:', data);
      return true;
    } catch (error: any) {
      console.error('❌ [addFavorite] Error:', error);
      throw error;
    }
  }

  /**
   * Remove a professional from favorites
   * ✅ FIXED: Uses RPC function
   */
  async removeFavorite(professionalId: string): Promise<boolean> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 [removeFavorite] Calling RPC function with:', {
        professionalId,
        authId: authUser.id,
      });

      // ✅ Call RPC function (bypasses RLS)
      const { data, error } = await supabase.rpc('remove_favorite', {
        p_professional_id: professionalId,
      });

      if (error) {
        console.error('❌ [removeFavorite] RPC error:', error);
        throw new Error(error.message || 'Failed to remove favorite');
      }

      console.log('✅ [removeFavorite] Success:', data);
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
