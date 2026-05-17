import * as anthropic from './providers/anthropic.js'
import * as google from './providers/google.js'

const BLOCKED = new Set(['openai', 'grok', 'xai'])

const providers = {
  anthropic,
  google,
}

export function getActiveProviderName() {
  return process.env.LLM_PROVIDER ?? 'anthropic'
}

export async function analyzeCopy(args) {
  const name = getActiveProviderName()

  if (BLOCKED.has(name)) {
    throw new Error(`Provider "${name}" is not supported. OpenAI and Grok are excluded.`)
  }

  const provider = providers[name]
  if (!provider) {
    throw new Error(`Unknown LLM_PROVIDER: "${name}". Supported: anthropic, google`)
  }

  return provider.analyzeCopy(args)
}

export async function extractTextFromImage(args) {
  const name = getActiveProviderName()

  if (BLOCKED.has(name)) {
    throw new Error(`Provider "${name}" is not supported. OpenAI and Grok are excluded.`)
  }

  const provider = providers[name]
  if (!provider) {
    throw new Error(`Unknown LLM_PROVIDER: "${name}". Supported: anthropic, google`)
  }

  if (!provider.extractTextFromImage) {
    throw new Error(`Provider "${name}" does not support screenshot extraction`)
  }

  return provider.extractTextFromImage(args)
}
