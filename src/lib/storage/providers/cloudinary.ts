import type { StorageProvider } from '../index';

export class CloudinaryStorageProvider implements StorageProvider {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(env: any) {
    this.cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
    this.apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn("Cloudinary configuration missing! Uploads may fail.");
    }
  }

  private async generateSignature(paramsString: string): Promise<string> {
    const message = paramsString + this.apiSecret;
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async uploadPhoto(file: File, checkpointId: string): Promise<string> {
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const publicId = `ddc_${checkpointId}_${Date.now()}`;

    // Cloudinary signature docs: parameters (except file, api_key, resource_type) 
    // must be sorted alphabetically and joined with '&'.
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = await this.generateSignature(signatureStr);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('public_id', publicId);
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = (errorData as any)?.error?.message || "Failed to upload image to Cloudinary";
      console.error("Cloudinary upload failed:", message);
      throw new Error(message);
    }

    const data = await res.json() as any;
    return data.secure_url;
  }

  async deletePhoto(photoUrl: string): Promise<boolean> {
    // Cloudinary URL format usually has the public_id before the extension.
    // e.g., https://res.cloudinary.com/.../upload/v12345/ddc_1_12345.jpg
    const parts = photoUrl.split('/');
    const lastPart = parts[parts.length - 1]; // ddc_1_12345.jpg
    
    if (!lastPart) return false;

    const publicIdMatch = lastPart.match(/^(.*)\.[a-zA-Z0-9]+$/);
    if (!publicIdMatch || !publicIdMatch[1]) return false;

    const publicId = publicIdMatch[1];
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = await this.generateSignature(signatureStr);

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      console.error("Cloudinary delete failed:", await res.text());
      return false;
    }

    const data = await res.json() as any;
    return data.result === "ok";
  }
}
