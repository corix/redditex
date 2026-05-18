import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcDir = path.join(root, 'write-ups', 'Reddit Exercises')
const outDir = path.join(root, 'public', 'assets', 'write-ups')
const manifestPath = path.join(root, 'public', 'assets', 'write-ups-manifest.json')

const SLUG_OVERRIDES = {
  'figma-copy-paste-nux-feature-announcement-modal-onboarding.jpg':
    'figma-nux-modal.jpg',
  'ghost-signup-cc.png': 'ghost-signup-cc.png',
  'ghost-onboarding-clicked-upsell-wide.png': 'ghost-onboarding-upsell-wide.png',
  'ghost-onboarding-landing-blank-with-url.png': 'ghost-onboarding-landing.png',
  'pricing-page-original.png': 'pricing-page-original.png',
  'pricing-page-alt-1k.png': 'pricing-page-alt-1k.png',
  'pricing-page-alt-100k.png': 'pricing-page-alt-100k.png',
  'patreon-annotated-chat-detail.png': 'patreon-chat-detail.png',
  'patreon-annotated-inbox-tabs-and-filters.png': 'patreon-inbox-tabs.png',
  'patreon-annotated-chat-context-menus.png': 'patreon-chat-menus.png',
  'image.png': 'ghost-misc.png',
  'image 1.png': 'ghost-misc-2.png',
}

function slugFor(filename) {
  if (SLUG_OVERRIDES[filename]) return SLUG_OVERRIDES[filename]
  if (filename.startsWith('screencapture-')) {
    const m = filename.match(/00_(\d{2})_(\d{2})/)
    return m ? `redditizer-screenshot-${m[1]}-${m[2]}.webp` : 'redditizer-screenshot.webp'
  }
  if (/^[0-9a-f-]{36}\.png$/i.test(filename)) {
    return `img-${filename.replace('.png', '')}.webp`
  }
  return filename.replace(/\s+/g, '-').replace(/\.(png|jpg|jpeg)$/i, '.webp')
}

function maxWidthFor(filename) {
  if (filename.startsWith('patreon-annotated')) return 1600
  if (filename.startsWith('screencapture-')) return 1400
  if (filename.endsWith('.jpg')) return 1400
  return 1200
}

fs.mkdirSync(outDir, { recursive: true })
const manifest = {}

for (const file of fs.readdirSync(srcDir)) {
  const src = path.join(srcDir, file)
  if (!fs.statSync(src).isFile()) continue
  const ext = path.extname(file).toLowerCase()
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue

  const slug = slugFor(file)
  const outName = slug.endsWith('.webp') || slug.endsWith('.jpg') ? slug : `${slug}`
  const outPath = path.join(
    outDir,
    outName.endsWith('.jpg') ? outName : outName.replace(/\.(png|jpeg)$/i, '.webp'),
  )
  const maxW = maxWidthFor(file)

  let pipeline = sharp(src).rotate()
  const meta = await pipeline.metadata()
  if (meta.width > maxW) pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true })

  if (outPath.endsWith('.jpg')) {
    await pipeline.jpeg({ quality: 85, progressive: true }).toFile(outPath)
  } else {
    await pipeline.webp({ quality: 82 }).toFile(outPath)
  }

  const outBase = path.basename(outPath)
  manifest[file] = `/assets/write-ups/${outBase}`
  manifest[`Reddit Exercises/${file}`] = `/assets/write-ups/${outBase}`
  console.log(`${file} → ${outBase}`)
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log(`\nWrote ${manifestPath} (${Object.keys(manifest).length / 2} images)`)
