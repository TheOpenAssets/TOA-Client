import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(
  {
    define: {
      process: {}
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@tanstack/query-core': '@tanstack/query-core',
      },
    },
    optimizeDeps: {
      include: ['@tanstack/query-core', 'wagmi', '@rainbow-me/rainbowkit', 'viem', '@tanstack/react-query'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  })
