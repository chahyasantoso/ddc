#!/usr/bin/env node
/**
 * Post-build fix for @astrojs/cloudflare generated wrangler.json.
 *
 * Cloudflare Pages requires module workers to NOT have:
 *   - `assets.binding = "ASSETS"` → reserved by Pages
 *   - empty `triggers: {}` → invalid
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = join(__dirname, '..', 'dist', 'server', 'wrangler.json');

console.log('[fix-wrangler] Reading', wranglerPath);
const config = JSON.parse(readFileSync(wranglerPath, 'utf-8'));

if (config.assets?.binding === 'ASSETS') {
  delete config.assets;
  console.log('[fix-wrangler] ✓ Removed reserved ASSETS binding');
}

if (Array.isArray(config.kv_namespaces)) {
  const before = config.kv_namespaces.length;
  config.kv_namespaces = config.kv_namespaces.filter(kv => kv.id);
  const removed = before - config.kv_namespaces.length;
  if (removed > 0) console.log(`[fix-wrangler] ✓ Removed ${removed} invalid KV namespace(s) without id`);
  if (config.kv_namespaces.length === 0) delete config.kv_namespaces;
}

if (config.triggers && Object.keys(config.triggers).length === 0) {
  delete config.triggers;
}

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
console.log('[fix-wrangler] ✓ Done — wrangler.json is clean for Pages deploy');
