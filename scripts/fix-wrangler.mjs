#!/usr/bin/env node
/**
 * Post-build fix for @astrojs/cloudflare generated wrangler.json.
 *
 * The adapter generates dist/server/wrangler.json with Worker-specific
 * fields that are incompatible with Cloudflare Pages. This script
 * strips all invalid fields using a whitelist of Pages-supported keys.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = join(__dirname, '..', 'dist', 'server', 'wrangler.json');

console.log('[fix-wrangler] Reading', wranglerPath);
const config = JSON.parse(readFileSync(wranglerPath, 'utf-8'));

// Whitelist: only keep fields valid for Cloudflare Pages
const PAGES_ALLOWED_KEYS = new Set([
  'name',
  'compatibility_date',
  'compatibility_flags',
  'pages_build_output_dir',
  'vars',
  'd1_databases',
  'r2_buckets',
  'kv_namespaces',
  'durable_objects',
  'services',
  'analytics_engine_datasets',
  'queues',
  'vectorize',
  'hyperdrive',
  'ai',
  'send_email',
  'mtls_certificates',
  'dispatch_namespaces',
  'pipelines',
]);

// Build clean config from whitelist
const clean = {};
for (const key of PAGES_ALLOWED_KEYS) {
  if (config[key] !== undefined) {
    clean[key] = config[key];
  }
}

// Remove KV namespaces without a valid `id` field (invalid for Pages)
if (Array.isArray(clean.kv_namespaces)) {
  const before = clean.kv_namespaces.length;
  clean.kv_namespaces = clean.kv_namespaces.filter(kv => kv.id);
  const removed = before - clean.kv_namespaces.length;
  if (removed > 0) console.log(`[fix-wrangler] ✓ Removed ${removed} invalid KV namespace(s) without id`);
  if (clean.kv_namespaces.length === 0) delete clean.kv_namespaces;
}

// Remove empty durable_objects
if (clean.durable_objects?.bindings?.length === 0) {
  delete clean.durable_objects;
}

console.log('[fix-wrangler] ✓ Stripped Worker-only fields (main, rules, no_bundle, assets, triggers, etc.)');

writeFileSync(wranglerPath, JSON.stringify(clean, null, 2));
console.log('[fix-wrangler] ✓ Done — wrangler.json is clean for Pages deploy');
console.log('[fix-wrangler] Final keys:', Object.keys(clean).join(', '));
