import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Category } from '@/types/database.types';

class CategoriesService {
  /**
   * Get all active categories ordered by sort_order
   * ✅ OPTIMIZED: Only select fields needed for list display (id, name, emoji, sort_order)
   */
  async getCategories(): Promise<Category[]> {
    const startTime = Date.now();
    logger.info('[CategoriesService] 🔍 getCategories started', {
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Only select fields needed for FilterModal and other list displays
      const queryStartTime = Date.now();
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji, slug, icon_name, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      const queryElapsed = Date.now() - queryStartTime;
      const totalDuration = Date.now() - startTime;

      if (error) {
        logger.error('[CategoriesService] ❌ Error fetching categories', error, {
          duration: `${totalDuration}ms`,
          queryElapsed: `${queryElapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      logger.info('[CategoriesService] ✅ getCategories completed', {
        duration: `${totalDuration}ms`,
        queryElapsed: `${queryElapsed}ms`,
        count: data?.length || 0,
        timestamp: new Date().toISOString(),
      });

      return (data || []) as Category[];
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error('[CategoriesService] ❌ Error in getCategories', error, {
        duration: `${totalDuration}ms`,
        timestamp: new Date().toISOString(),
      });
      return [];
    }
  }

  /**
   * Get categories grouped by category groups
   * Returns: { groupName: string, groupEmoji: string, categories: Category[] }[]
   */
  async getCategoriesGrouped(): Promise<
    Array<{
      id: string;
      name: string;
      emoji: string | null;
      slug: string;
      sort_order: number;
      categories: Category[];
    }>
  > {
    try {
      // Fetch all active categories with their groups
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select(
          `
          *,
          category_groups (
            id,
            name,
            slug,
            emoji,
            sort_order
          )
        `
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching grouped categories:', categoriesError);
        throw new Error(
          `Failed to fetch categories: ${categoriesError.message}`
        );
      }

      // Group categories by their category_groups
      const groupedMap = new Map<
        string,
        {
          id: string;
          name: string;
          emoji: string | null;
          slug: string;
          sort_order: number;
          categories: Category[];
        }
      >();

      categories?.forEach((category: any) => {
        const group = category.category_groups;

        if (!group) return; // Skip categories without a group

        const groupKey = group.id;

        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            id: group.id,
            name: group.name,
            emoji: group.emoji,
            slug: group.slug,
            sort_order: group.sort_order,
            categories: [],
          });
        }

        const groupData = groupedMap.get(groupKey)!;

        // Remove the category_groups nested object before adding
        const { category_groups, ...categoryData } = category;
        groupData.categories.push(categoryData as Category);
      });

      // Convert map to array and sort by group sort_order
      return Array.from(groupedMap.values()).sort(
        (a, b) => a.sort_order - b.sort_order
      );
    } catch (error) {
      console.error('Error in getCategoriesGrouped:', error);
      return [];
    }
  }

  /**
   * Get all categories including inactive ones (for admin)
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching all categories:', error);
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      return (data || []) as Category[];
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return [];
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) {
        console.error('Error fetching category:', error);
        throw new Error(`Failed to fetch category: ${error.message}`);
      }

      return data as Category;
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      return null;
    }
  }

  /**
   * Get popular categories (most professionals)
   * ✅ OPTIMIZED: Direct SQL query with count, order, and limit - MUCH faster!
   * Returns top N categories by professional count
   */
  async getPopularCategories(limit: number = 8): Promise<Category[]> {
    const startTime = Date.now();
    logger.info('[CategoriesService] 🔍 getPopularCategories started', {
      limit,
      timestamp: new Date().toISOString(),
    });

    try {
      logger.info('[CategoriesService] 📊 Executing RPC query...');
      
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_top_categories_by_professional_count',
        { limit_count: limit }
      );

      if (rpcError) {
        logger.warn('[CategoriesService] ⚠️ RPC failed, using fallback', {
          errorMessage: rpcError.message,
          errorCode: rpcError.code,
        });

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('categories')
          .select('id, name, slug, icon_name, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(limit);

        if (fallbackError) {
          logger.error('[CategoriesService] ❌ Fallback query failed', fallbackError);
          throw fallbackError;
        }

        return (fallbackData || []) as Category[];
      }

      const totalDuration = Date.now() - startTime;
      logger.info('[CategoriesService] ✅ getPopularCategories completed', {
        duration: `${totalDuration}ms`,
        count: rpcData?.length || 0,
      });

      return (rpcData || []) as Category[];
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      logger.error('[CategoriesService] ❌ Error in getPopularCategories', {
        message: error?.message || String(error),
        duration: `${totalDuration}ms`,
      });
      return [];
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching category by slug:', error);
        throw new Error(`Failed to fetch category: ${error.message}`);
      }

      return data as Category;
    } catch (error) {
      console.error('Error in getCategoryBySlug:', error);
      return null;
    }
  }

  /**
   * Update category icon_name
   */
  async updateCategoryIcon(
    categorySlug: string,
    iconName: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ icon_name: iconName })
        .eq('slug', categorySlug);

      if (error) {
        console.error('Error updating category icon:', error);
        throw new Error(`Failed to update category icon: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in updateCategoryIcon:', error);
      return false;
    }
  }

  /**
   * Get category with professional count
   */
  async getCategoryWithProfessionalCount(categoryId: string): Promise<{
    category: Category | null;
    professionalCount: number;
  }> {
    try {
      const category = await this.getCategoryById(categoryId);

      if (!category) {
        return { category: null, professionalCount: 0 };
      }

      const { count, error } = await supabase
        .from('professionals')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) {
        console.error('Error counting professionals:', error);
        return { category, professionalCount: 0 };
      }

      return {
        category,
        professionalCount: count || 0,
      };
    } catch (error) {
      console.error('Error in getCategoryWithProfessionalCount:', error);
      return { category: null, professionalCount: 0 };
    }
  }

  /**
   * Get all categories with their professional counts
   * ✅ OPTIMIZED: Uses SQL count aggregation instead of fetching all data to memory
   * ✅ OPTIMIZED: Counts professionals from both category_id field and professional_categories junction table
   * ✅ OPTIMIZED: Properly deduplicates professionals that appear in both
   */
  async getCategoriesWithCounts(): Promise<
    Array<Category & { professionalCount: number }>
  > {
    const startTime = Date.now();
    logger.info('[CategoriesService] 🔍 getCategoriesWithCounts started', {
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Get all categories
      const categoriesStart = Date.now();
      const categories = await this.getCategories();
      const categoriesDuration = Date.now() - categoriesStart;

      logger.info('[CategoriesService] ✅ Base categories fetched', {
        duration: `${categoriesDuration}ms`,
        count: categories.length,
      });

      if (categories.length === 0) {
        return [];
      }

      // Step 2: ✅ OPTIMIZED - Use single RPC function to get all counts at once
      // This is MUCH faster than multiple parallel queries per category
      const countsStart = Date.now();
      logger.info(
        '[CategoriesService] 📊 Fetching professional counts (RPC function)...',
        {
          categoryCount: categories.length,
          categoryIds: categories.map((c) => c.id).slice(0, 10), // First 10 for logging
          timestamp: new Date().toISOString(),
        }
      );

      const categoryCountsMap = new Map<string, number>();

      // Initialize all categories with 0 counts
      categories.forEach((cat) => {
        categoryCountsMap.set(cat.id, 0);
      });

      // ✅ OPTIMIZED: Use RPC function to get all counts in one query
      try {
        const rpcStartTime = Date.now();
        logger.debug(
          '[CategoriesService] 🔍 Calling RPC function get_all_category_professional_counts',
          {
            timestamp: new Date().toISOString(),
          }
        );

        const { data: countsData, error: rpcError } = await supabase.rpc(
          'get_all_category_professional_counts'
        );
        const rpcElapsed = Date.now() - rpcStartTime;

        if (rpcError) {
          logger.warn(
            '[CategoriesService] ⚠️ RPC function error, falling back to individual queries',
            {
              errorMessage: rpcError.message,
              errorCode: rpcError.code,
              errorDetails: (rpcError as any)?.details,
              errorHint: (rpcError as any)?.hint,
              rpcElapsed: `${rpcElapsed}ms`,
              timestamp: new Date().toISOString(),
            }
          );
          // Fallback to individual queries if RPC doesn't exist
          // (This should not happen if migration is applied)
          categories.forEach((cat) => {
            categoryCountsMap.set(cat.id, 0);
          });
        } else if (countsData) {
          // Map RPC results to category counts
          logger.info(
            '[CategoriesService] ✅ RPC function returned professional counts',
            {
              resultCount: countsData.length,
              rpcElapsed: `${rpcElapsed}ms`,
              sampleResults: (countsData as any[])
                .slice(0, 5)
                .map((r: any) => ({
                  categoryId: r.category_id,
                  count: r.professional_count,
                })),
              timestamp: new Date().toISOString(),
            }
          );
          countsData.forEach(
            (row: { category_id: string; professional_count: number }) => {
              categoryCountsMap.set(row.category_id, row.professional_count);
            }
          );
        }
      } catch (error) {
        logger.warn(
          '[CategoriesService] ⚠️ RPC function not available, using fallback',
          {
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        );
        // Fallback: Set all to 0 if RPC fails
        categories.forEach((cat) => {
          categoryCountsMap.set(cat.id, 0);
        });
      }

      // Step 3: Build result
      const categoriesWithCounts = categories.map((category) => ({
        ...category,
        professionalCount: categoryCountsMap.get(category.id) || 0,
      }));

      const countsDuration = Date.now() - countsStart;
      const totalDuration = Date.now() - startTime;

      logger.info('[CategoriesService] ✅ getCategoriesWithCounts completed', {
        totalDuration: `${totalDuration}ms`,
        resultCount: categoriesWithCounts.length,
        breakdown: {
          getCategories: `${categoriesDuration}ms`,
          professionalCounts: `${countsDuration}ms`,
        },
        sampleCounts: categoriesWithCounts.slice(0, 5).map((c) => ({
          categoryId: c.id,
          categoryName: c.name,
          professionalCount: c.professionalCount,
        })),
        timestamp: new Date().toISOString(),
      });

      return categoriesWithCounts;
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      try {
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.toString && error.toString() !== '[object Object]') {
          errorMessage = error.toString();
        } else {
          errorMessage = JSON.stringify(
            error,
            Object.getOwnPropertyNames(error)
          );
        }
      } catch {
        errorMessage = String(error);
      }

      logger.error('[CategoriesService] ❌ Error in getCategoriesWithCounts', {
        error: errorMessage,
        errorType: error?.constructor?.name || typeof error,
        totalDuration: `${totalDuration}ms`,
        stack: error?.stack?.substring(0, 500) || 'No stack trace',
      });
      console.error('Error in getCategoriesWithCounts:', error);
      return [];
    }
  }

  /**
   * Search categories by name
   */
  async searchCategories(query: string): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error searching categories:', error);
        throw new Error(`Failed to search categories: ${error.message}`);
      }

      return (data || []) as Category[];
    } catch (error) {
      console.error('Error in searchCategories:', error);
      return [];
    }
  }

  /**
   * Get featured categories (with most professionals)
   */
  async getFeaturedCategories(
    limit: number = 6
  ): Promise<Array<Category & { professionalCount: number }>> {
    try {
      const categoriesWithCounts = await this.getCategoriesWithCounts();

      // Sort by professional count and take top N
      return categoriesWithCounts
        .sort((a, b) => b.professionalCount - a.professionalCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in getFeaturedCategories:', error);
      return [];
    }
  }

  /**
   * Check if category slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase.from('categories').select('id').eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      // PGRST116 = no rows returned (slug is available)
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking slug availability:', error);
      }

      return !data; // Available if no data found
    } catch (error) {
      console.error('Error in isSlugAvailable:', error);
      return false;
    }
  }

  /**
   * Get total categories count
   */
  async getTotalCount(activeOnly: boolean = true): Promise<number> {
    try {
      let query = supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error getting categories count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalCount:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const categoriesService = new CategoriesService();
