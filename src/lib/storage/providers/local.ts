import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import type { StorageProvider } from '../index';

export class LocalStorageProvider implements StorageProvider {
  private uploadsDir: string;

  constructor(env: any) {
    // Determine where to save the files. During dev, this is usually /public/uploads/
    this.uploadsDir = join(process.cwd(), 'public', 'uploads');
  }

  async uploadPhoto(file: File, checkpointId: string): Promise<string> {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }

    const ext = extname(file.name) || '.jpg';
    const filename = `photo_${checkpointId}_${Date.now()}${ext}`;
    const filepath = join(this.uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Write synchronously (fine for simple local dev testing)
    writeFileSync(filepath, buffer);

    // Return the relative URL from public root
    return `/uploads/${filename}`;
  }

  async deletePhoto(photoUrl: string): Promise<boolean> {
    // Only process local URLs
    if (photoUrl.startsWith('/uploads/')) {
      const filepath = join(process.cwd(), 'public', photoUrl);
      if (existsSync(filepath)) {
        try {
          unlinkSync(filepath);
          return true;
        } catch (e) {
          console.error("Local delete error:", e);
          return false;
        }
      }
    }
    return false;
  }
}
