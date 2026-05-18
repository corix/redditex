import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ditherDuotone } from './lib/dither-duotone.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const heroDir = path.join(path.resolve(__dirname, '..'), 'public', 'assets', 'hero')
const thumbDir = path.join(heroDir, 'thumbs')

/** Directory list thumbs: 120×96 CSS @2x (5:4); Floyd–Steinberg duotone via dithergarden-style pipeline */
const THUMB_WIDTH = 240
const THUMB_DITHER_DARK = '#13111c'
const THUMB_DITHER_LIGHT = '#f4f2f8'
const THUMB_DITHER_ACCENT = '#ff2d7a'

async function writeDitheredThumb(rgba, width, height, lightHex, outPath) {
  const dithered = ditherDuotone(
    new Uint8ClampedArray(rgba),
    width,
    height,
    THUMB_DITHER_DARK,
    lightHex,
  )
  await sharp(Buffer.from(dithered), {
    raw: { width, height, channels: 4 },
  })
    .webp({ quality: 82, effort: 4 })
    .toFile(outPath)
}

/** Lead images on write-up pages */
const FULL_MAX = {
  'ghost-homepage-short.png': 1400,
  'patreon-screen-grid.png': 1600,
  'ghost-fees.png': 1200,
}

fs.mkdirSync(thumbDir, { recursive: true })

const sources = fs
  .readdirSync(heroDir)
  .filter((f) => /\.png$/i.test(f) && fs.statSync(path.join(heroDir, f)).isFile())

for (const file of sources) {
  const src = path.join(heroDir, file)
  const base = file.replace(/\.png$/i, '')
  const fullOut = path.join(heroDir, `${base}.webp`)
  const thumbOut = path.join(thumbDir, `${base}.webp`)
  const thumbAccentOut = path.join(thumbDir, `${base}-accent.webp`)
  const maxW = FULL_MAX[file] ?? 1200

  const meta = await sharp(src).rotate().metadata()

  await sharp(src)
    .rotate()
    .resize({ width: maxW, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(fullOut)

  const thumb = sharp(src).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true })
  const { data, info } = await thumb.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  await writeDitheredThumb(data, info.width, info.height, THUMB_DITHER_LIGHT, thumbOut)
  await writeDitheredThumb(data, info.width, info.height, THUMB_DITHER_ACCENT, thumbAccentOut)

  const fullKb = (fs.statSync(fullOut).size / 1024).toFixed(1)
  const thumbKb = (fs.statSync(thumbOut).size / 1024).toFixed(1)
  const accentKb = (fs.statSync(thumbAccentOut).size / 1024).toFixed(1)
  console.log(
    `${file} (${meta.width}×${meta.height}) → ${base}.webp ${fullKb}KB, thumb ${thumbKb}KB, accent ${accentKb}KB`,
  )
}

console.log(`\nWrote ${sources.length} full + thumb WebPs in public/assets/hero/`)
