export class QuotaExceededError extends Error {
  constructor(message) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

export function isQuotaError(err) {
  if (!err) return false

  if (err.status === 429) return true
  if (err.error?.type === 'rate_limit_error') return true

  const message = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('rate_limit') ||
    message.includes('resource_exhausted') ||
    message.includes('overloaded')
  )
}

export function toQuotaError(err, providerLabel) {
  const detail = err instanceof Error ? err.message : String(err)
  return new QuotaExceededError(
    `${providerLabel} API quota or rate limit exceeded. ${detail}`,
  )
}
