#!/usr/bin/env node
/**
 * Post-build fix for Astro 6 on Cloudflare Pages.
 * 
 * Instead of relying on wrangler.json (which Cloudflare Pages currently struggles to validate),
 * we create a standard `_worker.js` proxy in the root of the build directory.
 * 
 * This is the most robust way to ensure Cloudflare Pages detects the SSR Function.
 */
import { writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');
const workerProxyPath = join(distPath, '_worker.js');
const generatedConfigPath = join(distPath, 'server', 'wrangler.json');
const redundantConfigPath = join(distPath, 'wrangler.json');

// 1. Create the _worker.js proxy
// It simply exports the default handler from the Astro-generated entry point.
const proxyContent = `export { default } from './server/entry.mjs';\n`;
writeFileSync(workerProxyPath, proxyContent);
console.log('[fix-wrangler] ✓ Created _worker.js proxy at root of dist');

// 2. Remove the wrangler.json files from the build output.
// Cloudflare Pages tries to read these as "Project Configuration" and fails 
// because they are formatted as "Worker Configuration" (Module Worker).
// Removing them prevents the "Invalid configuration" warning and fallback to static.
if (existsSync(generatedConfigPath)) {
  rmSync(generatedConfigPath);
  console.log('[fix-wrangler] ✓ Removed generated config from dist/server/wrangler.json');
}
if (existsSync(redundantConfigPath)) {
  rmSync(redundantConfigPath);
  console.log('[fix-wrangler] ✓ Removed redundant config from dist/wrangler.json');
}

console.log('[fix-wrangler] ✓ Done! Cloudflare Pages will now detect _worker.js');
