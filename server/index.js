import { createApp } from './app.js'

const port = Number(process.env.PORT) || 8787
const { app } = createApp()
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
  if (!process.env.DEEPSEEK_API_KEY) console.warn('[server] DEEPSEEK_API_KEY not set — AI endpoints return ai_not_configured')
  if (!process.env.JWT_SECRET) console.warn('[server] JWT_SECRET not set — using the dev default (change in production!)')
})
