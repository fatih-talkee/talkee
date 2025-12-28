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
      // ✅ OPTIMIZED: Get auth user and session in parallel
      const [authResult, sessionResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);

      const {
        data: { user: authUser },
        error: authError,
      } = authResult;

      const {
        data: { session },
        error: sessionError,
      } = sessionResult;

      if (authError || !authUser) {
        console.error('❌ Auth error:', authError);
        throw new Error('Not authenticated. Please log in again.');
      }

      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('📤 Starting avatar upload:', {
        userId,
        authUserId: authUser.id,
        imageUri: imageUri.substring(0, 50) + '...',
      });

      // ✅ OPTIMIZED: Removed bucket check - upload will fail with clear error if bucket doesn't exist
      // This saves an unnecessary network call on every upload

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
        console.log(
          '✅ Image blob created (web), size:',
          imageData.length,
          'bytes'
        );
      } else {
        // Mobile: Use FileSystem
        // Read file as base64 string (Expo FileSystem accepts string 'base64')
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64' as any, // TypeScript workaround - Expo accepts string 'base64'
        });

        // ✅ OPTIMIZED: Convert base64 to Uint8Array (React Native compatible)
        // React Native doesn't have atob, so we decode manually
        // Optimized version with pre-computed lookup table
        const base64Chars =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const base64Lookup = new Uint8Array(256);
        for (let i = 0; i < base64Chars.length; i++) {
          base64Lookup[base64Chars.charCodeAt(i)] = i;
        }
        base64Lookup['='.charCodeAt(0)] = 0;

        // Calculate binary length more efficiently
        const padding = base64.endsWith('==')
          ? 2
          : base64.endsWith('=')
          ? 1
          : 0;
        const binaryLength = (base64.length * 3) / 4 - padding;
        imageData = new Uint8Array(binaryLength);

        // ✅ OPTIMIZED: Process in chunks for better performance
        let j = 0;
        const base64Length = base64.length;
        for (let i = 0; i < base64Length; i += 4) {
          const char1 = base64.charCodeAt(i);
          const char2 = base64.charCodeAt(i + 1);
          const char3 = base64.charCodeAt(i + 2);
          const char4 = base64.charCodeAt(i + 3);

          const encoded1 = base64Lookup[char1];
          const encoded2 = base64Lookup[char2];
          const encoded3 = base64Lookup[char3];
          const encoded4 = base64Lookup[char4];

          imageData[j++] = (encoded1 << 2) | (encoded2 >> 4);
          if (j < binaryLength) {
            imageData[j++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
          }
          if (j < binaryLength) {
            imageData[j++] = ((encoded3 & 3) << 6) | encoded4;
          }
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

      // ✅ OPTIMIZED: Delete old avatars in parallel with image reading (if needed)
      // Use auth.uid() for RLS policy compatibility
      // Note: This runs in parallel with image processing, but we wait for it before upload
      const deleteOldAvatars = async () => {
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
      };

      // Delete old avatars (non-blocking, but we'll wait for it before upload)
      await deleteOldAvatars();

      // 5. Upload new avatar using Supabase Storage REST API directly
      // This is more reliable than supabase.storage.upload() with Blobs in React Native
      console.log('📤 Uploading avatar to storage:', {
        bucket: this.BUCKET_NAME,
        filePath,
        contentType,
        dataSize: imageData.length,
      });

      // ✅ OPTIMIZED: Session already retrieved above, no need to fetch again

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
        if (
          errorMessage.includes('Bucket not found') ||
          errorMessage.includes('does not exist')
        ) {
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
        } else if (
          errorMessage.includes('JWT') ||
          errorMessage.includes('token') ||
          errorMessage.includes('unauthorized')
        ) {
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
        throw new Error(`Failed to update user record: ${updateError.message}`);
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
