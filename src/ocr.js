const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

function validateImageFile(file) {
  if (!file) {
    throw new Error('No file selected')
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Unsupported file type. Use PNG, JPEG, WebP, or GIF.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image must be 5 MB or smaller.')
  }
}

export async function extractTextFromImage(file) {
  validateImageFile(file)

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')

  try {
    const { data } = await worker.recognize(file)
    const trimmed = data.text.trim()
    if (!trimmed) {
      throw new Error('No text found in image. Try a clearer screenshot.')
    }
    return trimmed
  } finally {
    await worker.terminate()
  }
}

export { validateImageFile, MAX_FILE_SIZE, ALLOWED_TYPES }
