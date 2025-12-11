/**
 * Utility script to update Finance category icon to 'dollar-sign'
 * Run with: npx tsx scripts/update-finance-icon.ts
 */

import { categoriesService } from '../services/supabase/categories.service';

async function updateFinanceIcon() {
  try {
    console.log('🔄 Updating Finance category icon to "dollar-sign"...');
    
    const success = await categoriesService.updateCategoryIcon('finance', 'dollar-sign');
    
    if (success) {
      console.log('✅ Finance category icon updated successfully!');
    } else {
      console.error('❌ Failed to update Finance category icon');
    }
  } catch (error) {
    console.error('❌ Error updating Finance category icon:', error);
  }
}

updateFinanceIcon();

