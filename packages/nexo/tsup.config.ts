import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: false,
    outDir: 'dist',
    target: 'es2022',
    platform: 'node',
    external: [
      '@tailwindcss/vite',
      '@tailwindcss/oxide',
      '@tailwindcss/oxide/*',
      'tailwindcss',
      'tailwindcss/*',
    ],
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    outDir: 'dist',
    target: 'es2022',
    platform: 'node',
    external: [
      '@tailwindcss/vite',
      '@tailwindcss/oxide',
      '@tailwindcss/oxide/*',
      'tailwindcss',
      'tailwindcss/*',
    ],
    banner: {
      js: '#!/usr/bin/env node',
    },
    shims: false,
    splitting: false,
  },
])

