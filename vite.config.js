import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
    server: {
      proxy: {
        // Dev-only AI proxy: the API key is injected server-side by Vite and
        // never reaches the browser. In production this is replaced by a
        // serverless function with the same route.
        '/api/ai': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/ai/, ''),
          headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY || ''}` },
        },
      },
    },
  }
})
