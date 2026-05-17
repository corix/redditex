import { extractTextFromImage as extractViaApi, QuotaExceededError } from './api.js'
import { extractTextFromImageLocal, validateImageFile } from './ocr.js'

function stripBlankLines(text) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .join('\n')
}

/**
 * Extract UI copy from a screenshot: vision LLM via API, Tesseract if quota is exceeded.
 * @returns {{ text: string, method: 'vision' | 'tesseract', fallback?: boolean }}
 */
export async function extractTextFromImage(file) {
  validateImageFile(file)

  try {
    const result = await extractViaApi(file)
    return {
      text: stripBlankLines(result.text),
      method: 'vision',
    }
  } catch (err) {
    if (!(err instanceof QuotaExceededError)) {
      throw err
    }
  }

  const text = stripBlankLines(await extractTextFromImageLocal(file))
  return { text, method: 'tesseract', fallback: true }
}

export { validateImageFile }
