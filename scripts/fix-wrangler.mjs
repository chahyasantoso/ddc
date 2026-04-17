#!/usr/bin/env node
import { writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = join(__dirname, '..');
const distPath = join(rootPath, 'dist');
const wranglerMetadataPath = join(rootPath, '.wrangler');

// 1. Buat _worker.js proxy di root dist
const workerProxyPath = join(distPath, '_worker.js');
const proxyContent = `export { default } from './server/entry.mjs';\n`;
writeFileSync(workerProxyPath, proxyContent);
console.log('[fix-wrangler] ✓ Created _worker.js proxy');

// 2. HAPUS JEJAK METADATA (.wrangler)
// Ini yang bikin Cloudflare error karena dia nyari file wrangler.json 
// yang sebenernya nggak kita butuhin di Pages SSR.
if (existsSync(wranglerMetadataPath)) {
  rmSync(wranglerMetadataPath, { recursive: true, force: true });
  console.log('[fix-wrangler] ✓ Cleaned up .wrangler metadata folder');
}

// 3. Hapus wrangler.json di dist jika ada
const distWrangler = join(distPath, 'wrangler.json');
const serverWrangler = join(distPath, 'server', 'wrangler.json');

if (existsSync(distWrangler)) rmSync(distWrangler);
if (existsSync(serverWrangler)) rmSync(serverWrangler);

console.log('[fix-wrangler] ✓ Done! Project is clean for _worker.js detection');
