#!/usr/bin/env node
/**
 * Post-build fix for @astrojs/cloudflare generated wrangler.json.
 *
 * The adapter auto-generates dist/server/wrangler.json but includes fields
 * that conflict with Cloudflare Pages:
 *   - `assets.binding = "ASSETS"` → reserved by Pages, causes deploy error
 *   - `kv_namespaces` with entries missing `id` field → invalid
 *   - `triggers: {}` → invalid for Pages (expects { crons: [] })
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = join(__dirname, '..', 'dist', 'server', 'wrangler.json');

console.log('[fix-wrangler] Reading', wranglerPath);
const config = JSON.parse(readFileSync(wranglerPath, 'utf-8'));

// 1. Remove ASSETS binding (reserved by Pages)
if (config.assets?.binding === 'ASSETS') {
  delete config.assets;
  console.log('[fix-wrangler] ✓ Removed reserved ASSETS binding');
}

// 2. Remove KV namespaces that have no `id` (invalid for Pages)
if (Array.isArray(config.kv_namespaces)) {
  const before = config.kv_namespaces.length;
  config.kv_namespaces = config.kv_namespaces.filter(kv => kv.id);
  const removed = before - config.kv_namespaces.length;
  if (removed > 0) console.log(`[fix-wrangler] ✓ Removed ${removed} invalid KV namespace(s) without id`);
}

// 3. Fix empty triggers object (Pages expects { crons: [] } or omit it)
if (config.triggers && Object.keys(config.triggers).length === 0) {
  delete config.triggers;
  console.log('[fix-wrangler] ✓ Removed empty triggers object');
}

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
console.log('[fix-wrangler] ✓ Done — wrangler.json is clean for Pages deploy');
