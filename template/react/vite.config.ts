import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoInstall from '@nexo/auto-install/vite';

export default defineConfig({
  plugins: [autoInstall(), react()]
});

