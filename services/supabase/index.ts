// services/supabase/index.ts
// Barrel export for all Supabase services

export * from './professionals.service';
export * from './categories.service';
export * from './favorites.service';
export * from './user.service';

// Export service instances (for convenience)
export { professionalsService } from './professionals.service';
export { usersService } from './user.service';
export { categoriesService } from './categories.service';
export { favoritesService } from './favorites.service';
