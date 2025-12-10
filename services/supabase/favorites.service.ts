import { supabase } from '@/lib/supabase';
import type { ProfessionalWithRelations } from './professionals.service';

interface FavoriteRow {
  id: string;
  user_id: string;
  professional_id: string;
  created_at: string;
  updated_at: string;
  professionals?: ProfessionalWithRelations;
}

class FavoritesService {
  /**
   * Get all favorites for the current user
   */
  async getFavorites(): Promise<ProfessionalWithRelations[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          professional_id,
          professionals (
            *,
            users (id, name, avatar_url, is_verified),
            categories (id, name, icon_name)
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }

      // Extract professionals from favorites
      return (data || []) as unknown as ProfessionalWithRelations[];
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
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('professional_id', professionalId)
        .maybeSingle(); // ✅ Use maybeSingle instead of single

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
   */
  async addFavorite(professionalId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        professional_id: professionalId,
      });

      if (error) {
        console.error('Error adding favorite:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in addFavorite:', error);
      throw error;
    }
  }

  /**
   * Remove a professional from favorites
   */
  async removeFavorite(professionalId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('professional_id', professionalId);

      if (error) {
        console.error('Error removing favorite:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in removeFavorite:', error);
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
