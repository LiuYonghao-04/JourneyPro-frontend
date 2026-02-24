import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/osrm': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/osrm/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'framework'
          if (id.includes('element-plus') || id.includes('@element-plus')) return 'element-plus'
          if (id.includes('leaflet') || id.includes('leaflet-routing-machine')) return 'map-core'
          if (id.includes('axios')) return 'http'
          return 'vendor'
        },
      },
    },
  },
})
