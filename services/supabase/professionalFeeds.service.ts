import { supabase } from '@/lib/supabase';
import type {
  ProfessionalFeed,
  ProfessionalFeedWithDetails,
  CreateFeedRequest,
  UpdateFeedRequest,
  FeedQueryParams,
  FeedResponse,
} from '@/types/database.types';

class ProfessionalFeedsService {
  // ============================================
  // FEED CRUD OPERATIONS
  // ============================================

  /**
   * Create a new feed post
   */
  async createFeed(
    professionalId: string,
    data: CreateFeedRequest
  ): Promise<FeedResponse> {
    try {
      // Validate content length
      if (data.content.length < 10 || data.content.length > 1000) {
        return {
          success: false,
          error: 'Content must be between 10 and 1000 characters',
        };
      }

      const { data: feed, error } = await supabase
        .from('professional_feeds')
        .insert({
          professional_id: professionalId,
          content: data.content,
          is_pinned: data.is_pinned || false,
        })
        .select(
          `
          *,
          professional:professionals!inner(
            title,
            category_id,
            user:users!inner(
              name,
              avatar_url
            ),
            category:categories(
              name,
              emoji
            )
          )
        `
        )
        .single();

      if (error) {
        console.error('❌ Error creating feed:', error);
        return { success: false, error: error.message };
      }

      // Transform response
      const feedWithDetails: ProfessionalFeedWithDetails = {
        ...feed,
        professional_title: feed.professional.title,
        professional_name: feed.professional.user.name,
        professional_avatar: feed.professional.user.avatar_url,
        category_id: feed.professional.category_id,
        category_name: feed.professional.category?.name || '',
        category_emoji: feed.professional.category?.emoji || null,
      };

      // Notify followers (users who favorited this professional)
      this.notifyFollowers(professionalId, feedWithDetails.professional_name, feedWithDetails.id);

      return { success: true, feed: feedWithDetails };
    } catch (error: any) {
      console.error('❌ Error in createFeed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify users who favorited the professional about a new post
   */
  private async notifyFollowers(professionalId: string, professionalName: string, feedId: string) {
    try {
      const { notificationsService } = await import('../notifications.service');

      // 1. Get all users who favorited this professional
      const { data: favorites, error } = await supabase
        .from('favorites')
        .select('user_id')
        .eq('professional_id', professionalId);

      if (error || !favorites || favorites.length === 0) {
        if (error) {
          console.warn('⚠️ Error fetching favorites for feed notification:', error);
        }
        return;
      }

      const userIds = favorites.map(f => f.user_id);

      // 2. Send batch notification
      await notificationsService.sendBatchPushNotifications(
        userIds,
        `New Post from ${professionalName}`,
        `${professionalName} just shared a new update. Check it out!`,
        { 
            type: 'feed_post', 
            professional_id: professionalId,
            feed_id: feedId,
            action_url: `talkee://feed/${feedId}`
        }
      );
      
      console.log(`✅ Sent filtered notifications to ${userIds.length} followers`);

    } catch (error) {
      console.error('⚠️ Error notifying followers:', error);
    }
  }

  /**
   * Get all feeds (for home page feed)
   */
  async getFeeds(params?: FeedQueryParams): Promise<FeedResponse> {
    try {
      let query = supabase.from('professional_feeds').select(
        `
          *,
          professional:professionals!inner(
            title,
            category_id,
            is_active,
            is_public,
            user:users!inner(
              name,
              avatar_url
            ),
            category:categories(
              name,
              emoji
            )
          )
        `,
        { count: 'exact' }
      );

      // Apply filters
      if (params?.professional_id) {
        query = query.eq('professional_id', params.professional_id);
      }

      if (!params?.include_deleted) {
        query = query.is('deleted_at', null);
      }

      if (params?.only_pinned) {
        query = query.eq('is_pinned', true);
      }

      // Only show active posts from active, public professionals
      query = query
        .eq('is_active', true)
        .eq('professional.is_active', true)
        .eq('professional.is_public', true);

      // Ordering: pinned first, then by created_at
      query = query.order('is_pinned', { ascending: false });
      query = query.order('created_at', { ascending: false });

      // Pagination
      if (params?.limit) {
        query = query.limit(params.limit);
      }
      if (params?.offset) {
        query = query.range(
          params.offset,
          params.offset + (params.limit || 20) - 1
        );
      }

      const { data: feeds, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching feeds:', error);
        return { success: false, error: error.message };
      }

      // Transform response
      const feedsWithDetails: ProfessionalFeedWithDetails[] = (feeds || []).map(
        (feed) => ({
          ...feed,
          professional_title: feed.professional.title,
          professional_name: feed.professional.user.name,
          professional_avatar: feed.professional.user.avatar_url,
          category_id: feed.professional.category_id,
          category_name: feed.professional.category?.name || '',
          category_emoji: feed.professional.category?.emoji || null,
        })
      );

      return {
        success: true,
        feeds: feedsWithDetails,
        total_count: count || 0,
      };
    } catch (error: any) {
      console.error('❌ Error in getFeeds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single feed by ID
   */
  async getFeedById(feedId: string): Promise<FeedResponse> {
    try {
      const { data: feed, error } = await supabase
        .from('professional_feeds')
        .select(
          `
          *,
          professional:professionals!inner(
            title,
            category_id,
            user:users!inner(
              name,
              avatar_url
            ),
            category:categories(
              name,
              emoji
            )
          )
        `
        )
        .eq('id', feedId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('❌ Error fetching feed:', error);
        return { success: false, error: error.message };
      }

      // Increment view count (fire and forget)
      this.incrementViewCount(feedId);

      // Transform response
      const feedWithDetails: ProfessionalFeedWithDetails = {
        ...feed,
        professional_title: feed.professional.title,
        professional_name: feed.professional.user.name,
        professional_avatar: feed.professional.user.avatar_url,
        category_id: feed.professional.category_id,
        category_name: feed.professional.category?.name || '',
        category_emoji: feed.professional.category?.emoji || null,
      };

      return { success: true, feed: feedWithDetails };
    } catch (error: any) {
      console.error('❌ Error in getFeedById:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a feed post
   */
  async updateFeed(
    feedId: string,
    data: UpdateFeedRequest
  ): Promise<FeedResponse> {
    try {
      // Validate content if provided
      if (
        data.content &&
        (data.content.length < 10 || data.content.length > 1000)
      ) {
        return {
          success: false,
          error: 'Content must be between 10 and 1000 characters',
        };
      }

      const { data: feed, error } = await supabase
        .from('professional_feeds')
        .update({
          ...(data.content && { content: data.content }),
          ...(data.is_pinned !== undefined && { is_pinned: data.is_pinned }),
          ...(data.is_active !== undefined && { is_active: data.is_active }),
        })
        .eq('id', feedId)
        .select(
          `
          *,
          professional:professionals!inner(
            title,
            category_id,
            user:users!inner(
              name,
              avatar_url
            ),
            category:categories(
              name,
              emoji
            )
          )
        `
        )
        .single();

      if (error) {
        console.error('❌ Error updating feed:', error);
        return { success: false, error: error.message };
      }

      // Transform response
      const feedWithDetails: ProfessionalFeedWithDetails = {
        ...feed,
        professional_title: feed.professional.title,
        professional_name: feed.professional.user.name,
        professional_avatar: feed.professional.user.avatar_url,
        category_id: feed.professional.category_id,
        category_name: feed.professional.category?.name || '',
        category_emoji: feed.professional.category?.emoji || null,
      };

      return { success: true, feed: feedWithDetails };
    } catch (error: any) {
      console.error('❌ Error in updateFeed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a feed post (soft delete)
   */
  async deleteFeed(feedId: string): Promise<FeedResponse> {
    try {
      const { error } = await supabase.rpc('soft_delete_professional_feed', {
        feed_id: feedId,
      });

      if (error) {
        console.error('❌ Error deleting feed:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in deleteFeed:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Increment view count for a feed (fire and forget)
   */
  private async incrementViewCount(feedId: string): Promise<void> {
    try {
      await supabase.rpc('increment_feed_view_count', { feed_id: feedId });
    } catch (error) {
      // Silently fail - not critical
      console.warn('⚠️ Could not increment view count:', error);
    }
  }

  /**
   * Get feed count for a professional
   */
  async getFeedCount(professionalId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc(
        'get_professional_feed_count',
        { prof_id: professionalId }
      );

      if (error) {
        console.error('❌ Error getting feed count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('❌ Error in getFeedCount:', error);
      return 0;
    }
  }

  /**
   * Get trending feeds (most viewed in last 7 days)
   */
  async getTrendingFeeds(limit: number = 10): Promise<FeedResponse> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: feeds, error } = await supabase
        .from('professional_feeds')
        .select(
          `
          *,
          professional:professionals!inner(
            title,
            category_id,
            user:users!inner(
              name,
              avatar_url
            ),
            category:categories(
              name,
              emoji
            )
          )
        `
        )
        .eq('is_active', true)
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('views_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching trending feeds:', error);
        return { success: false, error: error.message };
      }

      // Transform response
      const feedsWithDetails: ProfessionalFeedWithDetails[] = (feeds || []).map(
        (feed) => ({
          ...feed,
          professional_title: feed.professional.title,
          professional_name: feed.professional.user.name,
          professional_avatar: feed.professional.user.avatar_url,
          category_id: feed.professional.category_id,
          category_name: feed.professional.category?.name || '',
          category_emoji: feed.professional.category?.emoji || null,
        })
      );

      return { success: true, feeds: feedsWithDetails };
    } catch (error: any) {
      console.error('❌ Error in getTrendingFeeds:', error);
      return { success: false, error: error.message };
    }
  }
}

export const professionalFeedsService = new ProfessionalFeedsService();
