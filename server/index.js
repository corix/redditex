import './load-env.js'
import { createServer } from 'node:http'
import { analyzeCopy, extractTextFromImage, getActiveProviderName } from './llm.js'
import { parseImageBody } from './image-body.js'
import { QuotaExceededError } from './quota.js'
import { buildSystemPrompt, buildUserMessage } from './prompt.js'

const PORT = Number(process.env.PORT) || 3001

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Invalid JSON body')
  }
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, { ok: true, provider: getActiveProviderName() })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  try {
    if (req.url === '/api/analyze') {
      const body = await readBody(req)
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      const context = typeof body.context === 'string' ? body.context : ''

      if (!text) {
        sendJson(res, 400, { error: 'text is required' })
        return
      }

      const system = buildSystemPrompt()
      const user = buildUserMessage(text, context)
      const analysis = await analyzeCopy({ system, user })

      sendJson(res, 200, { analysis, provider: getActiveProviderName() })
      return
    }

    if (req.url === '/api/extract-text') {
      const body = await readBody(req)
      const image = parseImageBody(body)
      const text = await extractTextFromImage(image)

      sendJson(res, 200, {
        text,
        method: 'vision',
        provider: getActiveProviderName(),
      })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      sendJson(res, 429, { error: err.message, quotaExceeded: true })
      return
    }

    const message = err instanceof Error ? err.message : 'Request failed'
    const status =
      message.includes('not set') ||
      message.includes('not supported') ||
      message.includes('Unknown LLM_PROVIDER') ||
      message.includes('is required') ||
      message.includes('Unsupported') ||
      message.includes('must be')
        ? 400
        : 500
    sendJson(res, status, { error: message })
  }
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      sendJson(res, 500, { error: message })
    }
  })
})

server.listen(PORT, () => {
  const provider = getActiveProviderName()
  const keyReady =
    provider === 'google'
      ? Boolean(process.env.GOOGLE_API_KEY)
      : provider === 'anthropic'
        ? Boolean(process.env.ANTHROPIC_API_KEY)
        : false

  console.log(`API server listening on http://localhost:${PORT}`)
  console.log(`LLM provider: ${provider}${keyReady ? '' : ' (API key missing)'}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the old API server (e.g. kill the process on port ${PORT}) and run pnpm dev again.`,
    )
    process.exit(1)
  }
  throw err
})
