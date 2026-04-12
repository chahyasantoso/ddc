/// <reference types="@astrojs/cloudflare" />

declare namespace Cloudflare {
  interface Env {
    STORAGE_PROVIDER?: 'cloudinary' | 'local' | 'r2';
    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    PHOTOS?: R2Bucket;
  }
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
      cf: IncomingRequestCfProperties;
      ctx: {
        waitUntil: (promise: Promise<any>) => void;
        passThroughOnException: () => void;
      };
    };
  }
}
