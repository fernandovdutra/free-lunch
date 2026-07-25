import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || 'your-project-id';
  const pkg = JSON.parse(
    readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
  ) as { version: string };
  return {
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-auth',
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: false, // using public/manifest.json
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'functions/src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
  },
  server: {
    port: 5173,
    strictPort: true,
    // Proxy Firebase emulator traffic through Vite so LAN clients (iPhone)
    // only need to reach port 5173 (node.exe is firewall-allowed). Java-based
    // emulators on 9099/8080 are firewall-blocked on this machine.
    proxy: {
      // Auth emulator
      '/identitytoolkit.googleapis.com': { target: 'http://127.0.0.1:9099', changeOrigin: true },
      '/securetoken.googleapis.com': { target: 'http://127.0.0.1:9099', changeOrigin: true },
      '/emulator/v1': { target: 'http://127.0.0.1:9099', changeOrigin: true },
      // Firestore emulator (REST + gRPC-Web)
      '/google.firestore.v1.Firestore': { target: 'http://127.0.0.1:8080', changeOrigin: true, ws: true },
      '/v1/projects': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      // Functions emulator
      [`/${projectId}/europe-west1`]: { target: 'http://127.0.0.1:5001', changeOrigin: true },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // NOTE: no manual 'charts' chunk. recharts is only reachable from
          // the lazy CounterpartyDetail route, so Rollup already splits it
          // into a lazy chunk. Forcing it into a manual chunk hoisted shared
          // deps (e.g. clsx) into that chunk, making the entry preload
          // recharts on first paint.
          pdf: ['pdfjs-dist'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
          ],
        },
      },
    },
  },
  };
});
