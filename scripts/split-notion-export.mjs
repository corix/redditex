import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const exportHtml = fs
  .readdirSync(path.join(root, 'write-ups'))
  .find((f) => f.endsWith('.html') && f.includes('Reddit Exercises'))
const htmlPath = path.join(root, 'write-ups', exportHtml)
const manifestPath = path.join(root, 'public', 'assets', 'write-ups-manifest.json')
const outDir = path.join(root, 'scripts', '_fragments')

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {}

const html = fs.readFileSync(htmlPath, 'utf8')
const bodyMatch = html.match(/<motion class="page-body">|<div class="page-body">([\s\S]*?)<\/article>/)
const body = bodyMatch
  ? (bodyMatch[1] ?? html.match(/<div class="page-body">([\s\S]*?)<\/article>/)?.[1])
  : null
if (!body) throw new Error('page-body not found')

function cleanFragment(fragment) {
  let s = fragment
  s = s.replace(/<motion[^>]*>/gi, '')
  s = s.replace(/<\/motion>/gi, '')
  s = s.replace(/<div style="display:contents"[^>]*>/gi, '')
  s = s.replace(/\s id="[^"]*"/g, '')
  s = s.replace(/<img class="icon notion-static-icon"[^>]*>/g, '')
  s = s.replace(
    /<figure class="block-color-([\w_]+) callout"[^>]*>[\s\S]*?<div style="width:100%">([\s\S]*?)<\/figure>/gi,
    (_, color, inner) => {
      const cls = (color || 'default').replace('_background', '').replace(/_/g, '-')
      const bodyInner = inner.replace(/<div style="font-size:1\.5em">[\s\S]*?<\/motiondiv>|<\/div>\s*<div style="width:100%">/gi, '')
      return `<aside class="prose-callout prose-callout--${cls}">${bodyInner}</aside>`
    },
  )

  for (const [from, to] of Object.entries(manifest)) {
    const encoded = from.replace(/ /g, '%20')
    s = s.replaceAll(`Reddit%20Exercises/${encoded}`, to)
    s = s.replaceAll(`Reddit Exercises/${from}`, to)
  }

  s = s.replace(/src="Reddit%20Exercises\//g, 'src="/assets/write-ups/')
  s = s.replace(/href="Reddit%20Exercises\//g, 'href="/assets/write-ups/')
  s = s.replace(/<img([^>]*)\/>/g, '<img$1 loading="lazy" />')
  s = s.replace(/<a href="(\/assets\/write-ups\/[^"]+)"><img([^>]*)\/?><\/a>/g, '<img$2 />')
  s = s.replace(/http:\/\/Ghost\.org/gi, 'https://ghost.org')

  return s.trim()
}

function headingText(hHtml) {
  return hHtml.replace(/<[^>]+>/g, '').trim()
}

const h2Re = /<h2[^>]*>[\s\S]*?<\/h2>/g
const h2Matches = [...body.matchAll(h2Re)]
const h2Positions = h2Matches.map((m) => ({ index: m.index, text: headingText(m[0]) }))

const hubEnd = h2Positions[0]?.index ?? body.length
const hub = cleanFragment(body.slice(0, hubEnd))

const sections = {
  'onboarding-patreon': '',
  'messaging-ghost': '',
  appendix: '',
}

for (let i = 0; i < h2Positions.length; i++) {
  const { index, text } = h2Positions[i]
  const nextIndex = h2Positions[i + 1]?.index ?? body.length
  const chunk = cleanFragment(body.slice(index, nextIndex))

  if (/Ghost\.org Onboarding/i.test(text)) sections['messaging-ghost'] = chunk
  else if (/Patreon Direct Messaging/i.test(text)) sections['onboarding-patreon'] = chunk
  else if (/^Mobile$/i.test(text)) sections['onboarding-patreon'] += chunk
  else if (/^Appendix$/i.test(text)) sections.appendix = chunk
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'hub.html'), hub)
for (const [key, content] of Object.entries(sections)) {
  if (content) fs.writeFileSync(path.join(outDir, `${key}.html`), content)
}

console.log('Fragments:', Object.entries(sections).map(([k, v]) => `${k}: ${v.length}b`).join(', '))
