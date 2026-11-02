// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 4330 website-skpk (To-Be), 4331 website-skpk-asli (As-Is), 4321-4323 situs Adhiloka.
  server: { port: 4332, host: '127.0.0.1' },
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'auto' }
});
