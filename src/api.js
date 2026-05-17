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

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return data
}
