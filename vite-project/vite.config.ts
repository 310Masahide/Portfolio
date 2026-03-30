import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { installDevAiProxy } from './server/proxy'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'ai-proxy',
        configureServer(server) {
          installDevAiProxy(server, env)
        },
      },
    ],
  }
})
