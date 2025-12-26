import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { Category } from '../../types/database.types';

class CategoriesService {
  /**
   * Get all active categories ordered by sort_order
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      return (data || []) as Category[];
    } catch (error) {
      console.error('Error in getCategories:', error);
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
   * Get popular categories (most professionals) with fallback to sort_order
   * Returns top N categories by professional count, fills remaining with sort_order
   * Optimized: Uses single query with sort_order for fast loading
   * Note: For true popularity ranking, consider creating a database view or RPC function
   */
  async getPopularCategories(limit: number = 8): Promise<Category[]> {
    const startTime = Date.now();
    logger.info('[CategoriesService] 🔍 getPopularCategories started', {
      limit,
      timestamp: new Date().toISOString(),
    });

    try {
      // Get all categories with their professional counts
      const countsStart = Date.now();
      logger.info('[CategoriesService] 📊 Calling getCategoriesWithCounts...');

      // Declare variables in outer scope
      let categoriesWithCounts: any[] = [];
      let countsDuration = 0;

      // Add timeout to getCategoriesWithCounts
      const getCategoriesWithCountsPromise = this.getCategoriesWithCounts();
      let getCategoriesWithCountsTimeoutId: ReturnType<
        typeof setTimeout
      > | null = null;
      const getCategoriesWithCountsTimeout = new Promise((_, reject) => {
        getCategoriesWithCountsTimeoutId = setTimeout(() => {
          const timeoutElapsed = Date.now() - countsStart;
          const timeoutError = new Error('getCategoriesWithCounts timeout');
          logger.error(
            '[CategoriesService] ⏱️ getCategoriesWithCounts TIMEOUT in getPopularCategories',
            timeoutError,
            {
              elapsedTime: `${timeoutElapsed}ms`,
              timeoutLimit: '30000ms', // ✅ INCREASED TO 30 SECONDS
              timestamp: new Date().toISOString(),
            }
          );
          reject(timeoutError);
        }, 30000); // ✅ INCREASED TO 30 SECONDS
      });

      try {
        categoriesWithCounts = (await Promise.race([
          getCategoriesWithCountsPromise,
          getCategoriesWithCountsTimeout,
        ])) as any;

        // Clear timeout if query succeeded
        if (getCategoriesWithCountsTimeoutId) {
          clearTimeout(getCategoriesWithCountsTimeoutId);
          getCategoriesWithCountsTimeoutId = null;
        }

        countsDuration = Date.now() - countsStart;
        logger.info('[CategoriesService] ✅ Professional counts fetched', {
          duration: `${countsDuration}ms`,
          categoryCount: categoriesWithCounts.length,
        });
      } catch (error: any) {
        // Clear timeout on error
        if (getCategoriesWithCountsTimeoutId) {
          clearTimeout(getCategoriesWithCountsTimeoutId);
          getCategoriesWithCountsTimeoutId = null;
        }
        throw error;
      }

      // Process Promise.allSettled results
      const processStart = Date.now();
      logger.info(
        '[CategoriesService] 📊 Processing Promise.allSettled results...'
      );

      // Sort by professional count (descending), then by sort_order as tie-breaker
      const sorted = categoriesWithCounts.sort((a, b) => {
        // Ensure professionalCount exists, default to 0
        const aCount = a.professionalCount ?? 0;
        const bCount = b.professionalCount ?? 0;

        // First sort by professional count (descending)
        if (bCount !== aCount) {
          return bCount - aCount;
        }
        // If counts are equal, use sort_order as tie-breaker
        const aOrder = a.sort_order ?? 0;
        const bOrder = b.sort_order ?? 0;
        return aOrder - bOrder;
      });

      // Take top N and return as Category[] (without professionalCount)
      const result = sorted.slice(0, limit).map((item) => {
        // Safely extract category without professionalCount
        const { professionalCount, ...category } = item;
        return category as Category;
      });

      const totalDuration = Date.now() - startTime;
      logger.info('[CategoriesService] ✅ getPopularCategories completed', {
        totalDuration: `${totalDuration}ms`,
        resultCount: result.length,
        limit,
        breakdown: {
          getCategoriesWithCounts: `${countsDuration}ms`,
        },
      });

      return result;
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

      logger.error('[CategoriesService] ❌ Error in getPopularCategories', {
        error: errorMessage,
        errorType: error?.constructor?.name || typeof error,
        duration: `${totalDuration}ms`,
        limit,
        stack: error?.stack?.substring(0, 500) || 'No stack trace',
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
   * OPTIMIZED: Fetches all data in 3 queries instead of 68*3 queries
   * Counts professionals from both category_id field and professional_categories junction table
   * Avoids double counting professionals that appear in both
   */
  async getCategoriesWithCounts(): Promise<
    Array<Category & { professionalCount: number }>
  > {
    const startTime = Date.now();
    logger.info('[CategoriesService] 🔍 getCategoriesWithCounts started', {
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Get all categories (with timeout)
      const categoriesStart = Date.now();
      logger.info('[CategoriesService] 📊 Fetching base categories...');

      const categoriesQuery = this.getCategories();
      let categoriesTimeoutId: ReturnType<typeof setTimeout> | null = null;
      const categoriesTimeout = new Promise<never>((_, reject) => {
        categoriesTimeoutId = setTimeout(() => {
          reject(new Error('getCategories timeout'));
        }, 30000); // ✅ INCREASED TO 30 SECONDS
      });

      let categories: Category[];
      try {
        categories = await Promise.race([categoriesQuery, categoriesTimeout]);
        if (categoriesTimeoutId) {
          clearTimeout(categoriesTimeoutId);
          categoriesTimeoutId = null;
        }
      } catch (error: any) {
        if (categoriesTimeoutId) {
          clearTimeout(categoriesTimeoutId);
          categoriesTimeoutId = null;
        }
        if (error?.message?.includes('timeout')) {
          logger.error('[CategoriesService] ⏱️ getCategories TIMEOUT', error, {
            elapsedTime: `${Date.now() - categoriesStart}ms`,
            timeoutLimit: '30000ms',
            timestamp: new Date().toISOString(),
          });
          // Return empty array on timeout
          return [];
        }
        throw error;
      }

      const categoriesDuration = Date.now() - categoriesStart;

      logger.info('[CategoriesService] ✅ Base categories fetched', {
        duration: `${categoriesDuration}ms`,
        count: categories.length,
      });

      if (categories.length === 0) {
        return [];
      }

      // Step 2: OPTIMIZED - Fetch all data in parallel (2 queries total, no verification needed)
      const countsStart = Date.now();
      logger.info(
        '[CategoriesService] 📊 Fetching professional counts (optimized - 2 queries)...',
        {
          categoryCount: categories.length,
        }
      );

      // Query 1: Get all active/public professionals with their category_id
      // This gives us ALL active/public professionals - we'll use this to verify junction entries
      const professionalsQuery = supabase
        .from('professionals')
        .select('id, category_id')
        .eq('is_active', true)
        .eq('is_public', true);

      // Query 2: Get all junction table entries
      const junctionQuery = supabase
        .from('professional_categories')
        .select('professional_id, category_id');

      // Execute queries in parallel with timeout
      const queryTimeout = 30000; // ✅ INCREASED TO 30 SECONDS
      const queriesPromise = Promise.all([professionalsQuery, junctionQuery]);

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Categories queries timeout'));
        }, queryTimeout);
      });

      let professionalsResult: any;
      let junctionResult: any;

      try {
        [professionalsResult, junctionResult] = await Promise.race([
          queriesPromise,
          timeoutPromise,
        ]);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } catch (error: any) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (error?.message?.includes('timeout')) {
          logger.error(
            '[CategoriesService] ⏱️ getCategoriesWithCounts TIMEOUT in getPopularCategories',
            error,
            {
              elapsedTime: `${Date.now() - countsStart}ms`,
              timeoutLimit: `${queryTimeout}ms`,
              timestamp: new Date().toISOString(),
            }
          );
          // Return categories with 0 counts on timeout
          return categories.map((cat) => ({
            ...cat,
            professionalCount: 0,
          }));
        }
        throw error;
      }

      // Handle errors
      if (professionalsResult.error) {
        logger.error(
          '[CategoriesService] ❌ Error fetching professionals',
          professionalsResult.error
        );
        // Fallback: return categories with 0 counts
        return categories.map((cat) => ({
          ...cat,
          professionalCount: 0,
        }));
      }

      if (junctionResult.error) {
        logger.error(
          '[CategoriesService] ❌ Error fetching junction table',
          junctionResult.error
        );
        // Continue with direct professionals only
      }

      // Step 3: Create a Set of all active/public professional IDs (for fast lookup)
      // This eliminates the need for verification queries - we already have all active/public professionals
      const activePublicProfessionalIds = new Set(
        (professionalsResult.data || []).map((p: any) => p.id)
      );

      // Step 4: Build category counts in memory
      const categoryCounts = new Map<string, Set<string>>();

      // Initialize all categories with empty sets
      categories.forEach((cat) => {
        categoryCounts.set(cat.id, new Set());
      });

      // Add direct professionals (from category_id field)
      (professionalsResult.data || []).forEach((prof: any) => {
        if (prof.category_id) {
          const categorySet = categoryCounts.get(prof.category_id);
          if (categorySet) {
            categorySet.add(prof.id);
          }
        }
      });

      // Add junction professionals (from professional_categories table)
      // Only count if professional is active/public (check against our Set)
      (junctionResult.data || []).forEach((item: any) => {
        if (activePublicProfessionalIds.has(item.professional_id)) {
          const categorySet = categoryCounts.get(item.category_id);
          if (categorySet) {
            categorySet.add(item.professional_id);
          }
        }
      });

      // Step 5: Build result
      const categoriesWithCounts = categories.map((category) => {
        const count = categoryCounts.get(category.id)?.size || 0;
        return {
          ...category,
          professionalCount: count,
        };
      });

      const countsDuration = Date.now() - countsStart;
      const totalDuration = Date.now() - startTime;

      logger.info('[CategoriesService] ✅ getCategoriesWithCounts completed', {
        totalDuration: `${totalDuration}ms`,
        resultCount: categoriesWithCounts.length,
        breakdown: {
          getCategories: `${categoriesDuration}ms`,
          professionalCounts: `${countsDuration}ms`,
        },
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
