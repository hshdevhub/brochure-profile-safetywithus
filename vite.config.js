import { defineConfig } from 'vite'

// Single-page creative landing. On Print / Save-as-PDF it swaps (via CSS) to a
// dedicated A4 brochure layout. Relative base so it can be hosted at any path.
export default defineConfig({
  base: './',
  server: { port: 5180, open: true },
})
