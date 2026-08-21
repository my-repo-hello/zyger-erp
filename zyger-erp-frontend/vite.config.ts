import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor';
          }
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/axios')) {
            return 'ui';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9090',
    },
  },
})
