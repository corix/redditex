export class QuotaExceededError extends Error {
  constructor(message) {
    super(message)
    this.name = 'QuotaExceededError'
    this.quotaExceeded = true
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') {
        reject(new Error('Failed to read image'))
        return
      }
      const comma = dataUrl.indexOf(',')
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
    }
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

async function parseJsonResponse(res) {
  const raw = await res.text()

  let data = {}
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error(
        res.status === 502 || res.status === 504
          ? 'API server is not reachable. Run pnpm dev (starts Vite and the API on port 3001).'
          : `Invalid response from server (${res.status}).`,
      )
    }
  } else if (!res.ok) {
    throw new Error(
      res.status === 502 || res.status === 504
        ? 'API server is not reachable. Run pnpm dev (starts Vite and the API on port 3001).'
        : `Request failed with status ${res.status}.`,
    )
  }

  return { data, ok: res.ok, status: res.status }
}

export async function extractTextFromImage(file) {
  const imageBase64 = await fileToBase64(file)

  let res
  try {
    res = await fetch('/api/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType: file.type }),
    })
  } catch {
    throw new Error(
      'Could not reach the API. Run pnpm dev to start both the UI and API server.',
    )
  }

  const { data, ok, status } = await parseJsonResponse(res)

  if (status === 429 && data.quotaExceeded) {
    throw new QuotaExceededError(data.error || 'API quota exceeded')
  }

  if (!ok) {
    throw new Error(data.error || `Extraction failed (${status})`)
  }

  return data
}

export async function analyzeCopy(text, context) {
  let res
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    })
  } catch {
    throw new Error(
      'Could not reach the API. Run pnpm dev to start both the UI and API server.',
    )
  }

  const { data, ok } = await parseJsonResponse(res)

  if (!ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return data
}
