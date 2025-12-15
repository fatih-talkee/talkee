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
      // 0. Get current auth user to verify authentication
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error('❌ Auth error:', authError);
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('📤 Starting avatar upload:', {
        userId,
        authUserId: authUser.id,
        imageUri: imageUri.substring(0, 50) + '...',
      });

      // 0.1. Check if bucket exists (optional check, but helpful for debugging)
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
        console.log('✅ Bucket found:', avatarsBucket);
      }

      // 1. Convert URI to blob
      console.log('📥 Fetching image from URI...');
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('✅ Image blob created, size:', blob.size, 'bytes');

      // 2. Get file extension
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const validExts = ['jpg', 'jpeg', 'png', 'webp'];
      const ext = validExts.includes(fileExt) ? fileExt : 'jpg';

      // 3. Generate filename with timestamp to avoid caching issues
      // IMPORTANT: Use auth.uid() for RLS policy compatibility
      // RLS policies check auth.uid(), not public.users.id
      const timestamp = Date.now();
      const fileName = `avatar-${timestamp}.${ext}`;
      // Use auth.uid() instead of userId for RLS policy compatibility
      const filePath = `${authUser.id}/${fileName}`;
      
      console.log('📁 File path:', {
        filePath,
        userId,
        authUserId: authUser.id,
        note: 'Using auth.uid() for RLS policy compatibility',
      });

      // 4. Delete old avatars for this user (optional - keeps storage clean)
      // Use auth.uid() for RLS policy compatibility
      try {
        const { data: existingFiles } = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(authUser.id);

        if (existingFiles && existingFiles.length > 0) {
          const filesToRemove = existingFiles.map(
            (file) => `${authUser.id}/${file.name}`
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
          } else {
            console.log('✅ Old avatars deleted:', filesToRemove.length);
          }
        }
      } catch (listError) {
        console.warn('⚠️ Warning: Could not list existing files:', listError);
        // Don't throw - continue with upload
      }

      // 5. Upload new avatar
      console.log('📤 Uploading avatar to storage:', {
        bucket: this.BUCKET_NAME,
        filePath,
        contentType: `image/${ext}`,
        blobSize: blob.size,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, blob, {
          contentType: `image/${ext}`,
          upsert: false, // Don't upsert since we deleted old files
          cacheControl: '3600', // Cache for 1 hour
        });

      if (uploadError) {
        console.error('❌ Upload error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError,
          userId,
          authUserId: authUser.id,
          filePath,
        });

        // Provide more helpful error message
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please create it in Supabase Dashboard → Storage → New Bucket`
          );
        } else if (
          uploadError.message?.includes('new row violates row-level security') ||
          uploadError.message?.includes('row-level security') ||
          uploadError.message?.includes('RLS')
        ) {
          throw new Error(
            `Permission denied. RLS policy check failed. User ID: ${userId}, Auth UID: ${authUser.id}. Please check Storage RLS policies for avatars bucket. The policy should allow authenticated users to upload to their own folder.`
          );
        } else if (uploadError.message?.includes('JWT')) {
          throw new Error(
            'Authentication token expired. Please log out and log in again.'
          );
        }
        throw new Error(
          `Upload failed: ${uploadError.message || 'Unknown error'}`
        );
      }

      console.log('✅ Avatar uploaded successfully:', uploadData);

      // 6. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);

      console.log('✅ Public URL generated:', publicUrl);

      // 7. Update user record in database
      console.log('📝 Updating user record in database...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Database update error:', {
          error: updateError,
          userId,
          publicUrl,
        });
        throw new Error(
          `Failed to update user record: ${updateError.message}`
        );
      }

      console.log('✅ Avatar upload completed successfully:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Avatar upload error:', {
        error: error.message,
        stack: error.stack,
        userId,
      });
      // Re-throw with more context
      throw error;
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
