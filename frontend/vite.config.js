import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) {
              return 'vendor-three';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/bootstrap')) {
              return 'vendor-bootstrap';
            }
          }
        }
      }
    },
    server: {
      port: 5173,
      watch: {
        ignored: ['**/dist/**', '**/.git/**', '**/backend/**']
      },
      proxy: {
        // xfwd passes the visitor's address on (X-Forwarded-For), so the backend can tell
        // this computer apart from other devices reaching the dev server
        '/api.php': {
          target: apiTarget,
          changeOrigin: true,
          xfwd: true,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          xfwd: true,
        },
        '/backend/uploads': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, '')
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
        // Live updates (driver GPS etc.) over Socket.IO
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
