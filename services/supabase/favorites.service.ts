import { supabase } from '../../lib/supabase';
import { usersService } from './user.service';
import type {
  Favorite,
  FavoriteWithProfessional,
} from '../../types/database.types';

class FavoritesService {
  /**
   * Get user's favorite professionals with full details
   */
  async getFavorites(): Promise<FavoriteWithProfessional[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          *,
          professionals:professional_id(
            *,
            users!inner(id, name, avatar_url),
            categories!inner(id, name, slug, icon_name)
          )
        `
        )
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        throw new Error(`Failed to fetch favorites: ${error.message}`);
      }

      return (data || []) as FavoriteWithProfessional[];
    } catch (error) {
      console.error('Error in getFavorites:', error);
      return [];
    }
  }

  /**
   * Get user's favorite professional IDs only
   */
  async getFavoriteIds(): Promise<string[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('professional_id')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error fetching favorite IDs:', error);
        return [];
      }

      return data?.map((f) => f.professional_id) || [];
    } catch (error) {
      console.error('Error in getFavoriteIds:', error);
      return [];
    }
  }

  /**
   * Add professional to favorites
   */
  async addFavorite(professionalId: string): Promise<Favorite | null> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: currentUser.id,
          professional_id: professionalId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding favorite:', error);
        throw new Error(`Failed to add favorite: ${error.message}`);
      }

      return data as Favorite;
    } catch (error) {
      console.error('Error in addFavorite:', error);
      throw error;
    }
  }

  /**
   * Remove professional from favorites
   */
  async removeFavorite(professionalId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('professional_id', professionalId);

      if (error) {
        console.error('Error removing favorite:', error);
        throw new Error(`Failed to remove favorite: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in removeFavorite:', error);
      throw error;
    }
  }

  /**
   * Check if professional is favorited by current user
   */
  async isFavorite(professionalId: string): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return false;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('professional_id', professionalId)
        .single();

      // PGRST116 = no rows returned (not an error, just not found)
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite:', error);
      }

      return !!data;
    } catch (error) {
      console.error('Error in isFavorite:', error);
      return false;
    }
  }

  /**
   * Toggle favorite status (add if not favorited, remove if favorited)
   */
  async toggleFavorite(professionalId: string): Promise<boolean> {
    try {
      const isFav = await this.isFavorite(professionalId);

      if (isFav) {
        await this.removeFavorite(professionalId);
        return false; // Now unfavorited
      } else {
        await this.addFavorite(professionalId);
        return true; // Now favorited
      }
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      throw error;
    }
  }

  /**
   * Get favorites count for current user
   */
  async getFavoritesCount(): Promise<number> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        return 0;
      }

      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error getting favorites count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getFavoritesCount:', error);
      return 0;
    }
  }

  /**
   * Batch add multiple favorites
   */
  async addMultipleFavorites(professionalIds: string[]): Promise<Favorite[]> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const favorites = professionalIds.map((pid) => ({
        user_id: currentUser.id,
        professional_id: pid,
      }));

      const { data, error } = await supabase
        .from('favorites')
        .insert(favorites)
        .select();

      if (error) {
        console.error('Error adding multiple favorites:', error);
        throw new Error(`Failed to add favorites: ${error.message}`);
      }

      return (data || []) as Favorite[];
    } catch (error) {
      console.error('Error in addMultipleFavorites:', error);
      throw error;
    }
  }

  /**
   * Remove all favorites for current user
   */
  async clearAllFavorites(): Promise<boolean> {
    try {
      const currentUser = await usersService.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error clearing favorites:', error);
        throw new Error(`Failed to clear favorites: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in clearAllFavorites:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const favoritesService = new FavoritesService();
