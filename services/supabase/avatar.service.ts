import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
      // Note: listBuckets() might fail due to permissions, but that's OK - we'll try upload anyway
      // If bucket doesn't exist, upload will fail with a clear error message
      try {
        const { data: buckets, error: bucketError } =
          await supabase.storage.listBuckets();
        if (bucketError) {
          console.warn('⚠️ Could not list buckets (might be permission issue):', bucketError.message);
          console.log('ℹ️ Continuing with upload - will fail with better error if bucket missing');
        } else {
          const avatarsBucket = buckets?.find((b) => b.name === this.BUCKET_NAME);
          if (avatarsBucket) {
            console.log('✅ Bucket found:', {
              name: avatarsBucket.name,
              public: avatarsBucket.public,
              id: avatarsBucket.id,
            });
          } else {
            console.warn(`⚠️ Bucket '${this.BUCKET_NAME}' not found in list, but continuing anyway (might be permission issue)`);
          }
        }
      } catch (checkError) {
        console.warn('⚠️ Bucket check failed, continuing with upload:', checkError);
        // Don't throw - let upload attempt reveal the real error
      }

      // 1. Read image file using FileSystem (React Native compatible)
      console.log('📥 Reading image from URI...');
      let imageData: Uint8Array;
      let contentType: string;
      
      if (Platform.OS === 'web') {
        // Web: Use fetch
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        imageData = new Uint8Array(arrayBuffer);
        contentType = blob.type || 'image/jpeg';
        console.log('✅ Image blob created (web), size:', imageData.length, 'bytes');
      } else {
        // Mobile: Use FileSystem
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64);
        imageData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageData[i] = binaryString.charCodeAt(i);
        }
        
        // Determine content type from file extension
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeTypes: { [key: string]: string } = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
        };
        contentType = mimeTypes[fileExt] || 'image/jpeg';
        
        console.log('✅ Image read (mobile), size:', imageData.length, 'bytes');
      }

      // 2. Get file extension for filename
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

      // 5. Upload new avatar using Supabase Storage REST API directly
      // This is more reliable than supabase.storage.upload() with Blobs in React Native
      console.log('📤 Uploading avatar to storage:', {
        bucket: this.BUCKET_NAME,
        filePath,
        contentType,
        dataSize: imageData.length,
      });

      // Get session token for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Upload using direct REST API call
      // Get Supabase URL from environment variables
      const supabaseUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        Constants.expoConfig?.extra?.supabaseUrl ||
        '';
      
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }
      
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${this.BUCKET_NAME}/${filePath}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': contentType,
          'x-upsert': 'false', // Don't upsert since we deleted old files
        },
        body: imageData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorMessage = `Upload failed: ${uploadResponse.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error('❌ Upload error details:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          errorText,
          userId,
          authUserId: authUser.id,
          filePath,
          bucket: this.BUCKET_NAME,
        });

        // Provide more helpful error message based on error type
        if (errorMessage.includes('Bucket not found') || errorMessage.includes('does not exist')) {
          throw new Error(
            `Storage bucket '${this.BUCKET_NAME}' not found. Please verify the bucket exists in Supabase Dashboard → Storage → Buckets`
          );
        } else if (
          errorMessage.includes('new row violates row-level security') ||
          errorMessage.includes('row-level security') ||
          errorMessage.includes('RLS') ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('Policy violation')
        ) {
          throw new Error(
            `Permission denied (RLS). User ID: ${userId}, Auth UID: ${authUser.id}, File Path: ${filePath}.\n\nPlease check:\n1. RLS policies exist for 'avatars' bucket\n2. Policy allows INSERT for authenticated users\n3. Policy checks: (storage.foldername(name))[1] = auth.uid()::text\n4. File path format: ${authUser.id}/avatar-*.${ext}`
          );
        } else if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
          throw new Error(
            'Authentication token expired or invalid. Please log out and log in again.'
          );
        }
        
        throw new Error(
          `Upload failed: ${errorMessage}. Status: ${uploadResponse.status}`
        );
      }

      const uploadData = await uploadResponse.json();
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
