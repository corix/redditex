/**
 * Floyd–Steinberg error diffusion, mapped to a two-color palette.
 * Matches the duotone + Floyd-Steinberg workflow from https://www.dithergarden.com/
 */

function parseHex(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** @param {Uint8ClampedArray} rgba width×height×4 */
export function ditherDuotone(rgba, width, height, darkHex, lightHex) {
  const dark = parseHex(darkHex)
  const light = parseHex(lightHex)
  const pixels = width * height
  const lum = new Float32Array(pixels)

  for (let p = 0; p < pixels; p++) {
    const i = p * 4
    lum[p] = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const old = lum[p]
      const bit = old < 128 ? 0 : 255
      const err = old - bit
      lum[p] = bit

      if (x + 1 < width) lum[p + 1] += (err * 7) / 16
      if (y + 1 < height) {
        if (x > 0) lum[p + width - 1] += (err * 3) / 16
        lum[p + width] += (err * 5) / 16
        if (x + 1 < width) lum[p + width + 1] += err / 16
      }
    }
  }

  for (let p = 0; p < pixels; p++) {
    const i = p * 4
    const c = lum[p] === 0 ? dark : light
    rgba[i] = c[0]
    rgba[i + 1] = c[1]
    rgba[i + 2] = c[2]
    rgba[i + 3] = 255
  }

  return rgba
}
