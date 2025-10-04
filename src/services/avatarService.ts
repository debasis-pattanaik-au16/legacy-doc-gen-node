import sharp from 'sharp';
import { getStorageProvider } from '@/services/storage';
import { AvatarUploadResult } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Avatar Service
 * Handles avatar upload, compression, and deletion
 * Uses existing storage provider (Oracle Cloud or AWS S3)
 */
export class AvatarService {
  private readonly MAX_SIZE = 200 * 1024; // 200KB
  private readonly TARGET_DIMENSION = 400; // 400x400px
  private readonly MIN_QUALITY = 30;
  private readonly INITIAL_QUALITY = 90;

  /**
   * Compress and upload avatar to cloud storage
   * @param userId User ID for namespacing
   * @param buffer Original image buffer
   * @param contentType Image content type (image/png or image/jpeg)
   * @returns Upload result with public URL
   */
  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    contentType: string
  ): Promise<AvatarUploadResult> {
    try {
      // Step 1: Compress image
      const compressedBuffer = await this.compressImage(buffer, contentType);
      
      logger.info(`Image compressed for user ${userId}`, {
        originalSize: buffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: `${((1 - compressedBuffer.length / buffer.length) * 100).toFixed(1)}%`
      });

      // Step 2: Generate storage key
      const timestamp = Date.now();
      const extension = contentType === 'image/png' ? 'png' : 'jpg';
      const key = `avatars/${userId}/${timestamp}.${extension}`;

      // Step 3: Upload to storage provider (Oracle or AWS)
      const storageProvider = getStorageProvider();
      const result = await storageProvider.upload(compressedBuffer, key, {
        contentType,
        isPublic: true,
        cacheControl: 'public, max-age=31536000', // 1 year cache
        metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
          originalSize: buffer.length.toString(),
          compressedSize: compressedBuffer.length.toString()
        }
      });

      logger.info(`Avatar uploaded successfully for user ${userId}`, {
        key,
        url: result.publicUrl || result.url,
        size: compressedBuffer.length
      });

      return {
        avatarUrl: result.publicUrl || result.url,
        size: compressedBuffer.length,
        compressed: true
      };
    } catch (error: any) {
      logger.error(`Avatar upload failed for user ${userId}:`, error);
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  /**
   * Compress image to target size and dimensions
   * Uses adaptive quality reduction to meet size constraints
   * @param buffer Original image buffer
   * @param contentType Image type
   * @returns Compressed image buffer
   */
  private async compressImage(buffer: Buffer, contentType: string): Promise<Buffer> {
    try {
      const format = contentType === 'image/png' ? 'png' : 'jpeg';
      let quality = this.INITIAL_QUALITY;
      let compressed = buffer;

      // Resize and compress with adaptive quality
      do {
        const sharpInstance = sharp(buffer)
          .resize(this.TARGET_DIMENSION, this.TARGET_DIMENSION, {
            fit: 'cover',
            position: 'center',
            withoutEnlargement: false
          });

        // Apply format-specific compression
        if (format === 'png') {
          compressed = await sharpInstance
            .png({
              quality: quality,
              compressionLevel: 9,
              adaptiveFiltering: true
            })
            .toBuffer();
        } else {
          compressed = await sharpInstance
            .jpeg({
              quality: quality,
              mozjpeg: true
            })
            .toBuffer();
        }

        // Reduce quality if still too large
        quality -= 10;
      } while (compressed.length > this.MAX_SIZE && quality >= this.MIN_QUALITY);

      // If still too large, convert to JPEG as fallback
      if (compressed.length > this.MAX_SIZE && format === 'png') {
        logger.warn('PNG still too large, converting to JPEG');
        compressed = await sharp(buffer)
          .resize(this.TARGET_DIMENSION, this.TARGET_DIMENSION, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: this.MIN_QUALITY, mozjpeg: true })
          .toBuffer();
      }

      return compressed;
    } catch (error: any) {
      logger.error('Image compression failed:', error);
      throw new Error(`Failed to compress image: ${error.message}`);
    }
  }

  /**
   * Delete old avatar from storage
   * Non-blocking - logs warning if fails but doesn't throw
   * @param avatarUrl Full URL of the avatar to delete
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      if (!avatarUrl) return;

      const storageProvider = getStorageProvider();
      const key = this.extractKeyFromUrl(avatarUrl);
      
      if (!key) {
        logger.warn('Could not extract key from avatar URL:', avatarUrl);
        return;
      }

      await storageProvider.delete(key);
      logger.info(`Old avatar deleted successfully: ${key}`);
    } catch (error: any) {
      // Non-critical error - don't fail the upload
      logger.warn('Failed to delete old avatar (non-critical):', {
        url: avatarUrl,
        error: error.message
      });
    }
  }

  /**
   * Extract storage key from avatar URL
   * Handles both Oracle Cloud and AWS S3 URL formats
   * @param url Full avatar URL
   * @returns Storage key or empty string
   */
  private extractKeyFromUrl(url: string): string {
    try {
      // Match pattern: avatars/{userId}/{timestamp}.{ext}
      const match = url.match(/avatars\/[^?#]+/);
      return match ? match[0] : '';
    } catch (error) {
      logger.error('Error extracting key from URL:', error);
      return '';
    }
  }

  /**
   * Validate image buffer
   * @param buffer Image buffer
   * @throws Error if invalid
   */
  async validateImage(buffer: Buffer): Promise<void> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.format || !['jpeg', 'png'].includes(metadata.format)) {
        throw new Error('Invalid image format. Only JPEG and PNG are supported.');
      }

      if (!metadata.width || !metadata.height) {
        throw new Error('Could not determine image dimensions.');
      }

      logger.info('Image validated successfully', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length
      });
    } catch (error: any) {
      logger.error('Image validation failed:', error);
      throw new Error(`Invalid image: ${error.message}`);
    }
  }
}

// Export singleton instance
export const avatarService = new AvatarService();
