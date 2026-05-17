const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export function parseImageBody(body) {
  const imageBase64 =
    typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : ''
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : ''

  if (!imageBase64) {
    throw new Error('imageBase64 is required')
  }
  if (!mimeType) {
    throw new Error('mimeType is required')
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported image type. Use PNG, JPEG, WebP, or GIF.')
  }

  let buffer
  try {
    buffer = Buffer.from(imageBase64, 'base64')
  } catch {
    throw new Error('imageBase64 must be valid base64')
  }

  if (!buffer.length) {
    throw new Error('imageBase64 is empty')
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  return { imageBase64, mimeType }
}
