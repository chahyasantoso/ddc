#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, '..', 'dist', 'server', 'wrangler.json');
const targetPath = join(__dirname, '..', 'dist', 'wrangler.json');

if (!existsSync(sourcePath)) {
  console.error('[fix-wrangler] Error: Source wrangler.json not found at', sourcePath);
  process.exit(1);
}

console.log('[fix-wrangler] Processing', sourcePath);
const config = JSON.parse(readFileSync(sourcePath, 'utf-8'));

// 1. HAPUS PATH ABSOLUT (Sangat penting agar jalan di server Cloudflare)
delete config.configPath;
delete config.userConfigPath;
if (config.dev) delete config.dev;

// 2. SESUAIKAN PATH MAIN (Karena config pindah ke root dist)
config.main = 'server/entry.mjs';

// 3. FIX KONFLIK PAGES (ASSETS & Triggers)
if (config.assets) {
    // Di Pages, assets dideteksi otomatis dari folder dist. 
    // Kita hapus binding 'ASSETS' agar tidak error reserved name.
    delete config.assets.binding;
    config.assets.directory = 'client'; // relatif terhadap targetPath (dist/)
}

if (config.triggers && Object.keys(config.triggers).length === 0) {
  delete config.triggers;
}

// 4. FIX KV NAMESPACES
if (Array.isArray(config.kv_namespaces)) {
  config.kv_namespaces = config.kv_namespaces.filter(kv => kv.id);
  if (config.kv_namespaces.length === 0) delete config.kv_namespaces;
}

// 5. HAPUS REDUNDANT PAGES DIR (karena ini sudah di root dist)
if (config.pages_build_output_dir) delete config.pages_build_output_dir;

writeFileSync(targetPath, JSON.stringify(config, null, 2));
console.log('[fix-wrangler] ✓ Done! Moved and cleaned config to:', targetPath);
console.log('[fix-wrangler] ✓ New main entry:', config.main);
