/**
 * image-service.ts — Image optimization with named presets.
 *
 * Wraps the low-level compressImage() utility with preset configurations
 * for different use cases (storage upload vs. AI vision).
 */

import { compressImage } from './imageOpt';

/**
 * Preset configurations for different compression use cases.
 */
const PRESETS = {
  /** For uploading to Cloudinary storage */
  upload: { maxWidth: 1920, maxHeight: 1080, quality: 0.8 },
  /** For AI vision — smaller to reduce base64 payload (~100-200KB) */
  ai:     { maxWidth: 768,  maxHeight: 768,  quality: 0.6 },
} as const;

export type ImagePreset = keyof typeof PRESETS;

/**
 * Compress an image File using a named preset.
 */
export async function optimizeImage(
  file: File,
  preset: ImagePreset = 'upload',
): Promise<File> {
  const { maxWidth, maxHeight, quality } = PRESETS[preset];
  return compressImage(file, maxWidth, maxHeight, quality);
}

/**
 * Convert a File to a base64 data string.
 * Useful for sending pending photos to the AI caption endpoint.
 */
export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:image/webp;base64," prefix
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type || 'image/webp' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Optimize + convert to base64 in one step (for AI caption requests).
 * Uses the 'ai' preset: 768×768, 0.6 quality → ~130-270KB base64.
 */
export async function optimizeForAi(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  const optimized = await optimizeImage(file, 'ai');
  return fileToBase64(optimized);
}
