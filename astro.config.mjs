// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['maplibre-gl', 'react-map-gl'],
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
});