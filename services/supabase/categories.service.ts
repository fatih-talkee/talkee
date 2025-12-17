import { supabase } from '../../lib/supabase';
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
    try {
      console.log('🔍 [getPopularCategories] Starting...', { limit });
      
      // Get all categories with their professional counts
      const categoriesWithCounts = await this.getCategoriesWithCounts();
      
      console.log('📊 [getPopularCategories] Categories with counts:', 
        categoriesWithCounts.map(c => ({ 
          name: c.name, 
          count: c.professionalCount,
          sort_order: c.sort_order 
        }))
      );

      // Sort by professional count (descending), then by sort_order as tie-breaker
      const sorted = categoriesWithCounts.sort((a, b) => {
        // First sort by professional count (descending)
        if (b.professionalCount !== a.professionalCount) {
          return b.professionalCount - a.professionalCount;
        }
        // If counts are equal, use sort_order as tie-breaker
        return a.sort_order - b.sort_order;
      });

      console.log('✅ [getPopularCategories] Sorted categories:', 
        sorted.slice(0, limit).map(c => ({ 
          name: c.name, 
          count: c.professionalCount 
        }))
      );

      // Take top N and return as Category[] (without professionalCount)
      const result = sorted.slice(0, limit).map(({ professionalCount, ...category }) => category);
      
      console.log('🎯 [getPopularCategories] Returning top', limit, 'categories');
      
      return result;
    } catch (error) {
      console.error('❌ [getPopularCategories] Error:', error);
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
   * Counts professionals from both category_id field and professional_categories junction table
   * Avoids double counting professionals that appear in both
   */
  async getCategoriesWithCounts(): Promise<
    Array<Category & { professionalCount: number }>
  > {
    try {
      const categories = await this.getCategories();

      // Get professional counts for each category
      // Use Promise.allSettled to handle individual failures gracefully
      const categoriesWithCounts = await Promise.allSettled(
        categories.map(async (category) => {
          try {
            // Get professional IDs from category_id field
            const { data: directProfessionals, error: directError } = await supabase
              .from('professionals')
              .select('id')
              .eq('category_id', category.id)
              .eq('is_active', true)
              .eq('is_public', true);

            if (directError) {
              console.error(
                `❌ [getCategoriesWithCounts] Error fetching direct professionals for ${category.name} (${category.id}):`,
                directError
              );
              // Continue with empty array on error
            }

            // Get professional IDs from professional_categories junction table
            // Add retry logic for network errors
            let junctionData = null;
            let junctionError = null;
            let retries = 3;
            
            while (retries > 0) {
              const result = await supabase
                .from('professional_categories')
                .select('professional_id')
                .eq('category_id', category.id);
              
              junctionData = result.data;
              junctionError = result.error;
              
              // If no error or not a network error, break
              if (!junctionError || !junctionError.message?.includes('Network')) {
                break;
              }
              
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
              retries--;
            }

            if (junctionError) {
              console.error(
                `❌ [getCategoriesWithCounts] Error fetching junction professionals for ${category.name} (${category.id}):`,
                junctionError
              );
              // Continue with empty array on error
            }

            // Get unique professional IDs from both sources
            const directIds = new Set(
              (directProfessionals || []).map((p) => p.id)
            );
            const junctionIds = new Set(
              (junctionData || []).map((item) => item.professional_id)
            );

            // Combine and get unique count (union of both sets)
            const uniqueIds = new Set([...directIds, ...junctionIds]);

            console.log(`📊 [getCategoriesWithCounts] ${category.name}:`, {
              directCount: directIds.size,
              junctionCount: junctionIds.size,
              uniqueCount: uniqueIds.size,
            });

            // Verify these professionals are active and public
            if (uniqueIds.size > 0) {
              const { count, error: countError } = await supabase
                .from('professionals')
                .select('id', { count: 'exact', head: true })
                .in('id', Array.from(uniqueIds))
                .eq('is_active', true)
                .eq('is_public', true);

              if (countError) {
                console.error(
                  `❌ [getCategoriesWithCounts] Error counting professionals for ${category.name} (${category.id}):`,
                  countError
                );
                return {
                  ...category,
                  professionalCount: uniqueIds.size, // Fallback to set size
                };
              }

              return {
                ...category,
                professionalCount: count || 0,
              };
            }

            return {
              ...category,
              professionalCount: 0,
            };
          } catch (error) {
            // Handle any unexpected errors for this category
            console.error(
              `❌ [getCategoriesWithCounts] Unexpected error for ${category.name} (${category.id}):`,
              error
            );
            // Return category with 0 count on error
            return {
              ...category,
              professionalCount: 0,
            };
          }
        })
      );

      // Process Promise.allSettled results
      const results = categoriesWithCounts.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // If a promise was rejected, log and return a default value
          console.error(
            `❌ [getCategoriesWithCounts] Promise rejected for category at index ${index}:`,
            result.reason
          );
          // Return default value for the category at this index
          return {
            ...categories[index],
            professionalCount: 0,
          };
        }
      });

      return results;
    } catch (error) {
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
