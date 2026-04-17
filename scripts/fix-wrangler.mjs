#!/usr/bin/env node
/**
 * Post-build fix for Astro 6 on Cloudflare Pages.
 * 
 * Flattening logic:
 * 1. Move everything from dist/client/* to dist/
 * 2. Delete the empty dist/client/ directory
 * 3. Create a _worker.js proxy at the root of dist
 * 4. Cleanup any wrangler metadata/configs to prevent conflicts
 */
import { writeFileSync, rmSync, existsSync, readdirSync, renameSync, lstatSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = join(__dirname, '..');
const distPath = join(rootPath, 'dist');
const clientPath = join(distPath, 'client');
const wranglerMetadataPath = join(rootPath, '.wrangler');

// 1. Flatten the dist/client/ directory into the root dist folder
if (existsSync(clientPath)) {
  console.log('[fix-wrangler] Flattening dist/client into dist/ root...');
  const files = readdirSync(clientPath);
  for (const file of files) {
    const src = join(clientPath, file);
    const dest = join(distPath, file);
    
    // Avoid overwriting if possible, or handle conflicts
    if (existsSync(dest)) {
      if (lstatSync(dest).isDirectory()) {
        // For directories like _astro, we might need to merge or delete
        rmSync(dest, { recursive: true, force: true });
      } else {
        rmSync(dest);
      }
    }
    
    renameSync(src, dest);
  }
  rmSync(clientPath, { recursive: true, force: true });
  console.log('[fix-wrangler] ✓ dist/client flattened');
}

// 2. Create the _worker.js proxy at the root of dist
const workerProxyPath = join(distPath, '_worker.js');
const proxyContent = `export { default } from './server/entry.mjs';\n`;
writeFileSync(workerProxyPath, proxyContent);
console.log('[fix-wrangler] ✓ Created _worker.js proxy at dist/_worker.js');

// 3. Clean up .wrangler metadata folder to prevent Cloudflare build errors
if (existsSync(wranglerMetadataPath)) {
  rmSync(wranglerMetadataPath, { recursive: true, force: true });
  console.log('[fix-wrangler] ✓ Cleaned up .wrangler metadata folder');
}

// 4. Cleanup any generated wrangler.json files in the build output
const distWrangler = join(distPath, 'wrangler.json');
const serverWrangler = join(distPath, 'server', 'wrangler.json');

if (existsSync(distWrangler)) rmSync(distWrangler);
if (existsSync(serverWrangler)) rmSync(serverWrangler);

console.log('[fix-wrangler] ✓ Done! Site is now optimized for Cloudflare Pages SSR + Static Assets');
