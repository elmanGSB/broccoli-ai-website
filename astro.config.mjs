// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://broccolli.ai',
  output: 'static',
  integrations: [react()],
});
