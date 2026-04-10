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
      {
        name: 'csp-production',
        apply: 'build',
        transformIndexHtml(html) {
          const csp = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "base-uri 'none'",
            "form-action 'self'",
          ].join('; ')
          return html.replace(
            '<head>',
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
          )
        },
      },
    ],
  }
})
