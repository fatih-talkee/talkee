import { supabase } from '@/lib/supabase';

export class AvatarService {
  private static BUCKET_NAME = 'avatars';

  /**
   * Upload avatar to Supabase Storage
   * @param userId - User ID (from public.users table)
   * @param imageUri - Local image URI from ImagePicker
   * @returns Public URL of uploaded avatar or null on error
   */
  static async uploadAvatar(
    userId: string,
    imageUri: string
  ): Promise<string | null> {
    try {
      // 0. Check if bucket exists (optional check, but helpful for debugging)
      const { data: buckets, error: bucketError } =
        await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('❌ Error checking buckets:', bucketError);
      } else {
        const avatarsBucket = buckets?.find((b) => b.name === this.BUCKET_NAME);
        if (!avatarsBucket) {
          console.error(
            `❌ Bucket '${this.BUCKET_NAME}' not found. Please create it in Supabase Dashboard.`
          );
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' does not exist. Please create it in Supabase Dashboard → Storage → New Bucket`
          );
        }
      }

      // 1. Convert URI to blob
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();

      // 2. Get file extension
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const validExts = ['jpg', 'jpeg', 'png', 'webp'];
      const ext = validExts.includes(fileExt) ? fileExt : 'jpg';

      // 3. Generate filename with timestamp to avoid caching issues
      const timestamp = Date.now();
      const fileName = `avatar-${timestamp}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      // 4. Delete old avatars for this user (optional - keeps storage clean)
      try {
        const { data: existingFiles } = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(userId);

        if (existingFiles && existingFiles.length > 0) {
          const filesToRemove = existingFiles.map(
            (file) => `${userId}/${file.name}`
          );
          const { error: removeError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .remove(filesToRemove);

          if (removeError) {
            console.warn(
              '⚠️ Warning: Could not delete old avatars:',
              removeError
            );
            // Don't throw - continue with upload
          }
        }
      } catch (listError) {
        console.warn('⚠️ Warning: Could not list existing files:', listError);
        // Don't throw - continue with upload
      }

      // 5. Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, blob, {
          contentType: `image/${ext}`,
          upsert: false, // Don't upsert since we deleted old files
          cacheControl: '3600', // Cache for 1 hour
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        // Provide more helpful error message
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create it in Supabase Dashboard → Storage → New Bucket`
          );
        } else if (
          uploadError.message?.includes('new row violates row-level security')
        ) {
          throw new Error(
            'Permission denied. Please check Storage RLS policies for avatars bucket.'
          );
        }
        throw uploadError;
      }

      // 6. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);

      // 7. Update user record in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw updateError;
      }

      return publicUrl;
    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      return null;
    }
  }

  /**
   * Delete user's avatar
   * @param userId - User ID
   * @returns Success boolean
   */
  static async deleteAvatar(userId: string): Promise<boolean> {
    try {
      // 1. List all files for this user
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId);

      if (listError) {
        console.error('❌ List error:', listError);
        return false;
      }

      if (!files || files.length === 0) {
        return true;
      }

      // 2. Delete all files
      const filesToRemove = files.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove(filesToRemove);

      if (removeError) {
        console.error('❌ Remove error:', removeError);
        return false;
      }

      // 3. Update user record to remove avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Delete avatar error:', error);
      return false;
    }
  }

  /**
   * Get avatar URL for a user
   * @param userId - User ID
   * @returns Avatar URL or null
   */
  static async getAvatarUrl(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.avatar_url || null;
    } catch (error) {
      console.error('❌ Get avatar error:', error);
      return null;
    }
  }
}
