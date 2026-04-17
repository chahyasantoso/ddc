#!/usr/bin/env node
/**
 * Post-build fix for @astrojs/cloudflare generated wrangler.json.
 * 
 * Surgical blacklist approach:
 * 1. Remove pages_build_output_dir (causes conflict with main in Advanced mode)
 * 2. Remove binding: "ASSETS" from assets object (reserved in Pages)
 * 3. Remove kv_namespaces missing an id
 * 4. Remove empty triggers
 * 
 * KEEP main, rules, no_bundle (essential for the Module Worker to run).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = join(__dirname, '..', 'dist', 'server', 'wrangler.json');

console.log('[fix-wrangler] Reading', wranglerPath);
const config = JSON.parse(readFileSync(wranglerPath, 'utf-8'));

// 1. Remove conflict-causing key
if (config.pages_build_output_dir) {
  delete config.pages_build_output_dir;
  console.log('[fix-wrangler] ✓ Removed pages_build_output_dir (conflicts with main)');
}

// 2. Fix assets binding conflict
if (config.assets && config.assets.binding === 'ASSETS') {
  delete config.assets.binding;
  console.log('[fix-wrangler] ✓ Removed reserved ASSETS binding name');
}

// 3. Fix invalid KV namespaces
if (Array.isArray(config.kv_namespaces)) {
  const before = config.kv_namespaces.length;
  config.kv_namespaces = config.kv_namespaces.filter(kv => kv.id);
  const removed = before - config.kv_namespaces.length;
  if (removed > 0) {
    console.log(`[fix-wrangler] ✓ Removed ${removed} invalid KV namespace(s) without id`);
  }
  if (config.kv_namespaces.length === 0) delete config.kv_namespaces;
}

// 4. Fix triggers
if (config.triggers && Object.keys(config.triggers).length === 0) {
  delete config.triggers;
  console.log('[fix-wrangler] ✓ Removed empty triggers object');
}

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
console.log('[fix-wrangler] ✓ Done — wrangler.json is clean for Pages deploy');
console.log('[fix-wrangler] ✓ Entry point (main):', config.main);
