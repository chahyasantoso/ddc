import { CloudinaryStorageProvider } from './providers/cloudinary';

export interface StorageProvider {
  /**
   * Uploads a photo file and returns the public or relative URL to the image.
   */
  uploadPhoto(file: File, checkpointId: string): Promise<string>;

  /**
   * Deletes a photo from storage using its original URL.
   */
  deletePhoto(photoUrl: string): Promise<boolean>;
}

export function getStorageProvider(env: any): StorageProvider {
  const providerType = env.STORAGE_PROVIDER || 'local';

  if (providerType === 'cloudinary') {
    return new CloudinaryStorageProvider(env);
  }

  // Local storage requires Node.js 'fs' which isn't available in Cloudflare Workers.
  // We only import it here to avoid breaking the build when using other providers.
  try {
    const { LocalStorageProvider } = require('./providers/local');
    return new LocalStorageProvider(env);
  } catch (e) {
    if (providerType === 'local') {
      throw new Error("LocalStorageProvider is not compatible with Cloudflare Workers. Please use 'cloudinary' or 'r2'.");
    }
    // Fallback if somehow someone still hits this but doesn't want local
    return new CloudinaryStorageProvider(env);
  }
}
