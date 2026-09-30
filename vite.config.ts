import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_'],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL || 'https://qmzvvuvlvjlykbxmybrd.supabase.co'
      ),
      'process.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
      ),
      'process.env.APP_URL': JSON.stringify(process.env.APP_URL || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      strictPort: true,
    },
  };
});
