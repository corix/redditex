import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { breadcrumb } from '../src/site-breadcrumb.js'
import { SITE_FOOTER } from '../src/site-footer.js'
import { siteToolbar } from '../src/site-toolbar.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const fragDir = path.join(root, 'scripts', '_fragments')

function polish(html) {
  return html
    .replace(/ id="[^"]*"/g, '')
    .replace(/ class=""/g, '')
    .replace(/ style="[^"]*"/g, '')
    .replace(/loading="lazy"\s*\/?\s*\/?>/g, 'loading="lazy">')
    .replace(/<\/h([1-4])><\/div>/g, '</h$1>')
    .replace(/(<\/(?:h[1-6]|p|ul|ol|aside|figure|li)>)\s*<\/div>/gi, '$1')
    .replace(/<\/div>(?=\s*<(?:p|ul|ol|h[1-6]|aside|figure|\/article))/gi, '')
    .replace(/\/ghost-fees\//g, '/appendix/fee-calculator/')
    .replace(
      /<strong>\/ghost-fees\/<\/strong>/g,
      '<a href="/appendix/fee-calculator/">Ghost Fees</a>',
    )
    .replace(
      /live at <strong>\/appendix\/fee-calculator\/<\/strong>/g,
      'live at <a href="/appendix/fee-calculator/">Ghost Fees</a>',
    )
    .replace(
      /live at <a href="\/appendix\/fee-calculator\/">\/appendix\/fee-calculator\/<\/a>/g,
      'live at <a href="/appendix/fee-calculator/">Ghost Fees</a>',
    )
    .replace(
      /<strong>Redditizer<\/strong>/g,
      '<a href="/appendix/redditizer/">Redditizer</a>',
    )
    .replace(
      /\(see notes\)/gi,
      '(see <a href="/appendix/#patreon-dms">Notes</a>)',
    )
    .replace(/<script src="https:\/\/cdnjs\.cloudflare\.com[^>]*><\/script>/gi, '')
    .replace(/<link[^>]*prism[^>]*>/gi, '')
    .replace(/<\/p><\/div><\/aside>/g, '</p></aside>')
}

/** Notion exports one <li> per <ul>; merge siblings and place lists between paragraphs. */
function mergeBulletedLists(html) {
  const singleItemUl = /<ul class="bulleted-list"><li>([\s\S]*?)<\/li><\/ul>/g

  function mergeRun(run) {
    const items = [...run.matchAll(singleItemUl)]
    if (items.length === 0) return run
    if (items.length === 1) return items[0][0]
    const lis = items.map((m) => `<li>${m[1]}</li>`).join('')
    return `<ul class="bulleted-list">${lis}</ul>`
  }

  let out = html.replace(/<div class="indented">([\s\S]*?)<\/div>/g, (_, inner) => mergeRun(inner))

  out = out.replace(
    /(<p><strong>In summary:<\/strong><\/p>)(\s*(?:<ul class="bulleted-list"><li>[\s\S]*?<\/li><\/ul>\s*)+)/,
    (_, lead, run) => `${lead}${mergeRun(run)}`,
  )

  out = out.replace(
    /<p>([\s\S]*?)(?:<aside class="prose-aside">)?(<ul class="bulleted-list">[\s\S]*?<\/ul>)(?:<\/aside>)?<\/p>/g,
    '<p>$1</p>$2',
  )

  out = out.replace(/<aside class="prose-aside">([\s\S]*?)<\/aside>/g, '$1')

  return out
}

const PROSE_IMAGES_SCRIPT = '<script type="module" src="/src/prose-images.js"></script>'

const HERO_THUMBS = {
  ghost: '/assets/hero/thumbs/ghost-homepage-short.webp',
  patreon: '/assets/hero/thumbs/patreon-screen-grid.webp',
  fees: '/assets/hero/thumbs/ghost-fees.webp',
}

const HERO_IMAGES = {
  'messaging-ghost/index.html': {
    src: '/assets/hero/ghost-homepage-short.webp',
    alt: 'Ghost marketing homepage',
    leadCrop: true,
    leadCropTop: true,
  },
  'onboarding-patreon/index.html': {
    src: '/assets/hero/patreon-screen-grid.webp',
    alt: 'Grid of Patreon mobile app screenshots',
    leadCrop: true,
  },
}

function proseFigure({ src, alt, lead = false, leadCrop = false, leadCropTop = false }) {
  const klass = [
    'image',
    lead && 'image--lead',
    leadCrop && 'image--lead-cover',
    leadCropTop && 'image--lead-cover-top',
  ]
    .filter(Boolean)
    .join(' ')
  return `<figure class="${klass}"><img src="${src}" alt="${alt}" loading="lazy"></figure>`
}

function injectLeadFigure(body, hero) {
  if (!hero) return body
  return `${proseFigure({ ...hero, lead: true })}${body}`
}

function mergeExamplesGallery(body) {
  return body.replace(
    /(<p>A few examples:<\/p>)(\s*(?:<ul class="bulleted-list"><li>[\s\S]*?<\/li><\/ul>\s*)+)(?=\s*<p>After signup)/,
    (_, lead, run) => {
      const items = [...run.matchAll(/<ul class="bulleted-list"><li>([\s\S]*?)<\/li><\/ul>/g)]
      const lis = items.map((m) => `<li class="prose-gallery__slide">${m[1]}</li>`).join('')
      return `${lead}<ul class="prose-gallery bulleted-list" data-prose-gallery>${lis}</ul>`
    },
  )
}

const GHOST_TAKEAWAYS = `<h4>Venture further</h4>
<p>Spin-offs from this audit: <a href="/appendix/fee-calculator/">Ghost Fees</a> (stress-test take-home pay), <a href="/appendix/redditizer/">Redditizer</a> (draft clearer copy), and the <a href="/appendix/">Appendix</a> for QA output and research notes.</p>`

const GHOST_PRICING_COMPARISON = `<figure class="image-compare" data-image-compare style="--compare: 75%">
<div class="image-compare__stage">
<img class="image-compare__back" src="/assets/write-ups/pricing-page-alt-1k.webp" alt="Revised copy—lowest tier" loading="lazy" decoding="async">
<div class="image-compare__front" aria-hidden="true">
<img src="/assets/write-ups/pricing-page-original.webp" alt="" loading="lazy" decoding="async">
</div>
<div class="image-compare__divider" aria-hidden="true"></div>
<button type="button" class="image-compare__handle" aria-label="Drag to compare original and revised pricing copy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="75" role="slider"></button>
</div>
<figcaption>Drag the handle to compare. <strong>Original:</strong> problematic “No payment fees” claim. <strong>Revised:</strong> lowest-tier copy.</figcaption>
</figure>`

const GHOST_COMPETITOR_PARA = `<p>Whether or not that’s the intent, I’m less persuaded when a company repeatedly presents competitors in a one-sided way—as Ghost does in its head-to-head comparison tables on <a href="https://ghost.org/alternatives/">Ghost vs. Others.</a>—particularly when it isn’t equally transparent and forthright about its own fees. Give me another 48 hours, and I would apply Reddit’s “Candid” rubric to a thorough review of every instance where Ghost describes its pricing structure, its benefits, and how it compares to competitors.</p>`

const GHOST_PRICING_COLUMN_LIST =
  /<div class="column-list">[\s\S]*?pricing-page-original\.webp[\s\S]*?<\/div>\s*<\/div>/

function patchGhostArticle(body) {
  const feesShot = proseFigure({
    src: '/assets/hero/ghost-fees.webp',
    alt: 'Ghost vs Substack fee calculator',
  })
  let out = mergeExamplesGallery(
    body.replace(
      /(<p>At that point, I concluded the pricing structure was likely too complex[\s\S]*?pricing checker, live at <a href="\/appendix\/fee-calculator\/">[^<]*<\/a>\.<\/p>)/,
      `$1${feesShot}`,
    ),
  )
  if (GHOST_PRICING_COLUMN_LIST.test(out) || out.includes('class="image-compare"')) {
    out = out.replace(GHOST_PRICING_COLUMN_LIST, GHOST_PRICING_COMPARISON)
    out = out.replace(
      /<figure class="image-compare" data-image-compare[^>]*>[\s\S]*?<\/figure>/,
      GHOST_PRICING_COMPARISON,
    )
  } else if (!out.includes('pricing-page-original.webp')) {
    out = out.replace(
      /(<p>In the interest of saving myself time[\s\S]*?tokens are limited\.\)<\/p>)/,
      `$1${GHOST_PRICING_COMPARISON}`,
    )
  }
  out = out.replace(
    /<p[^>]*>Even if Ghost is not intending to be disingenuous[\s\S]*?how it compares to competitors\.<\/p>/,
    GHOST_COMPETITOR_PARA,
  )
  out = out.replace(
    /<a href="https:\/\/ghost\.org\/alternatives\/">(?:<strong>)?Ghost vs\.? Others\.?(?:<\/strong>)?<\/a>/,
    '<a href="https://ghost.org/alternatives/">Ghost vs. Others.</a>',
  )
  if (!out.includes('<h4>Venture further</h4>')) {
    out += GHOST_TAKEAWAYS
  }
  return out
}

const THUMB_SIZE = { width: 120, height: 80 }
const HOME_THUMB_SIZE = { width: 120, height: 96 }

function thumbAccentSrc(thumb) {
  return thumb.replace(/\.webp$/i, '-accent.webp')
}

function directoryItem({
  href,
  title,
  description,
  thumb,
  thumbAlt,
  fetchPriority,
  thumbSize = THUMB_SIZE,
  ditherHover = false,
}) {
  const loadAttrs = fetchPriority
    ? ` fetchpriority="${fetchPriority}"`
    : ' loading="lazy"'
  const lazyAttrs = fetchPriority ? '' : ' loading="lazy"'
  const thumbHtml = thumb
    ? ditherHover
      ? `<span class="directory-item__thumb-stack">
              <img class="directory-item__thumb" src="${thumb}" alt="${thumbAlt ?? ''}" width="${thumbSize.width}" height="${thumbSize.height}" decoding="async"${loadAttrs}>
              <img class="directory-item__thumb directory-item__thumb--accent" src="${thumbAccentSrc(thumb)}" alt="" width="${thumbSize.width}" height="${thumbSize.height}" decoding="async"${lazyAttrs} aria-hidden="true">
            </span>`
      : `<img class="directory-item__thumb" src="${thumb}" alt="${thumbAlt ?? ''}" width="${thumbSize.width}" height="${thumbSize.height}" decoding="async"${loadAttrs}>`
    : ''
  const itemClass = thumb ? 'directory-item' : 'directory-item directory-item--text-only'
  return `<li class="${itemClass}">
            <a href="${href}">
              ${thumbHtml}
              <div class="directory-item__body">
                <h2>${title}</h2>
                <p>${description}</p>
              </div>
            </a>
          </li>`
}

function contentShell({
  title,
  breadcrumbItems = [],
  headerTitle,
  headerLead,
  main,
  scripts = [],
  prose = true,
  home = false,
}) {
  const nav = breadcrumbItems.length > 0 ? breadcrumb(breadcrumbItems) : ''
  const toolbar = siteToolbar({ breadcrumb: nav || undefined })

  const header = headerTitle
    ? `<header class="site-header">
        <h1>${headerTitle}</h1>
        ${headerLead ? `<p class="site-lead">${headerLead}</p>` : ''}
      </header>`
    : ''

  const stylesheets = prose
    ? `<link rel="stylesheet" href="/src/site.css" />
    <link rel="stylesheet" href="/src/prose.css" />`
    : `<link rel="stylesheet" href="/src/site.css" />`

  const headExtras = prose
    ? ''
    : `<link rel="preload" as="image" href="${HERO_THUMBS.ghost}" type="image/webp" fetchpriority="high">`

  const bodyScripts = prose ? [...scripts, PROSE_IMAGES_SCRIPT] : scripts
  const layoutClass = home
    ? 'site-layout site-layout--wide site-layout--home'
    : 'site-layout site-layout--wide'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title === 'Exercises for Reddit' ? title : `${title} · Exercises for Reddit`}</title>
    ${stylesheets}
    ${headExtras}
  </head>
  <body>
    <motion class="${layoutClass}">
      ${toolbar}
      ${header}
      <main class="site-main">
        ${main}
      </main>
      ${SITE_FOOTER}
    </motion>
    ${bodyScripts.join('\n    ')}
  </body>
</html>`.replace(/<motion class="/g, '<div class="').replace(/<\/motion>/g, '</div>')
}

/** Pull first h2 + optional tagline em from article body into page header. */
function extractArticleHeader(html, fallbackTitle) {
  let body = html
  let title = fallbackTitle
  let lead = ''

  const h2Match = html.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/i)
  if (h2Match) {
    title = h2Match[1].replace(/<[^>]+>/g, '').trim()
    body = html.slice(h2Match[0].length)

    const emMatch = body.match(/^\s*<p><em>([\s\S]*?)<\/em><\/p>/i)
    if (emMatch) {
      lead = emMatch[1]
      body = body.slice(emMatch[0].length)
    }
  }

  return { title, lead, body: body.trim() }
}

const APPENDIX_TAB_SLUGS = {
  Tools: 'tools',
  'Platforms considered': 'platforms',
  'Redditizer QA test': 'redditizer-qa',
  'Patreon DMs—all missing features': 'patreon-dms',
}

function appendixTabSlug(title) {
  const normalized = title.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  if (APPENDIX_TAB_SLUGS[normalized]) return APPENDIX_TAB_SLUGS[normalized]
  if (normalized.startsWith('Patreon DMs')) return 'patreon-dms'
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function splitAppendixSections(html) {
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi
  const matches = [...html.matchAll(re)]
  if (matches.length === 0) return [{ title: 'Notes', body: html.trim() }]

  return matches.map((match, i) => {
    const title = match[1].replace(/<[^>]+>/g, '').trim()
    const start = match.index + match[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length
    return { title, body: html.slice(start, end).trim() }
  })
}

function formatRedditizerQaSection(html) {
  const figureRe = /<figure class="image">[\s\S]*?<\/figure>/g
  const figures = [...html.matchAll(figureRe)].map((m) => m[0])
  if (figures.length === 0) return html

  let remaining = html
  const chunks = []
  for (const figure of figures) {
    const idx = remaining.indexOf(figure)
    chunks.push(remaining.slice(0, idx))
    remaining = remaining.slice(idx + figure.length)
  }
  chunks.push(remaining)

  const leadFigure = figures[0].replace(
    '<figure class="image">',
    '<figure class="image redditizer-qa-lead">',
  )
  const gridFigures = figures.slice(1)
  const grid = gridFigures.length
    ? `<div class="redditizer-qa-grid">\n${gridFigures.join('\n')}\n</div>`
    : ''

  return chunks[0] + leadFigure + chunks[1] + grid + chunks[figures.length]
}

const APPENDIX_TOOLS_INTRO = `<p>Interactive prototypes spun out of the write-ups—useful for validating claims or drafting copy, not part of the core audits.</p>`

const APPENDIX_TOOLS_GALLERY = `
        ${APPENDIX_TOOLS_INTRO}
        <ul class="appendix-tools-gallery">
          <li class="appendix-tools-gallery__item">
            <figure class="appendix-tools-gallery__shot">
              <img
                src="/assets/hero/ghost-fees.webp"
                alt="Ghost vs Substack fee calculator"
                loading="lazy"
                width="640"
                height="400"
              >
            </figure>
            <div class="appendix-tools-gallery__body">
              <h3>Fee calculator</h3>
              <p>Compare Ghost and Substack pricing across plans, with break-even points and tips to maximize income.</p>
              <a class="appendix-tools-gallery__cta" href="/appendix/fee-calculator/">Yay money</a>
            </div>
          </li>
          <li class="appendix-tools-gallery__item">
            <figure class="appendix-tools-gallery__shot">
              <img
                src="/assets/write-ups/redditizer-screenshot-18-03.webp"
                alt="Redditizer copy review results"
                loading="lazy"
                width="640"
                height="400"
              >
            </figure>
            <div class="appendix-tools-gallery__body">
              <h3>Redditizer</h3>
              <p>LLM-based UI writing assistant using Reddit’s guidelines and rubric. Type your words or upload a screenshot.</p>
              <a class="appendix-tools-gallery__cta" href="/appendix/redditizer/">Say less</a>
            </div>
          </li>
        </ul>`

function appendixTabArticle(title, body, { proseModifier } = {}) {
  const proseClass = proseModifier ? `prose ${proseModifier}` : 'prose'
  return `<article class="${proseClass}"><h2>${title}</h2>${body}</article>`
}

function buildAppendixTabs(sections) {
  const orderedSections = [...sections]
  const platformsIdx = orderedSections.findIndex(
    (s) => appendixTabSlug(s.title) === 'platforms',
  )
  if (platformsIdx >= 0) {
    const [platforms] = orderedSections.splice(platformsIdx, 1)
    orderedSections.push(platforms)
  }

  const tabs = [
    {
      id: 'tools',
      label: 'Tools',
      body: appendixTabArticle('Tools', APPENDIX_TOOLS_GALLERY),
    },
    ...orderedSections.map((section) => {
      const id = appendixTabSlug(section.title)
      let body = section.body
      if (id === 'redditizer-qa') body = formatRedditizerQaSection(body)
      return {
        id,
        label: section.title,
        body: appendixTabArticle(section.title, body, {
          proseModifier: id === 'redditizer-qa' ? 'prose--redditizer-qa' : undefined,
        }),
      }
    }),
  ]

  const nav = tabs
    .map(
      (tab, i) => `<li role="presentation">
          <a
            href="#${tab.id}"
            class="appendix-nav__link${i === 0 ? ' is-active' : ''}"
            role="tab"
            data-tab="${tab.id}"
            id="tab-${tab.id}"
            aria-controls="panel-${tab.id}"
            aria-selected="${i === 0}"
            tabindex="${i === 0 ? '0' : '-1'}"
          >${tab.label}</a>
        </li>`,
    )
    .join('\n')

  const panels = tabs
    .map(
      (tab, i) => `<section
          class="appendix-panel${i === 0 ? ' is-active' : ''}"
          id="panel-${tab.id}"
          data-tab="${tab.id}"
          role="tabpanel"
          aria-labelledby="tab-${tab.id}"
          ${i === 0 ? '' : 'hidden'}
        >${tab.body}</section>`,
    )
    .join('\n')

  return { panels, nav, tabs }
}

function appendixPageShell({ panels, nav, tabs }) {
  const tabTrail = breadcrumb(
    [
      { href: '/', label: 'Home' },
      { href: '/appendix/', label: 'Appendix' },
      { label: tabs[0].label },
    ],
    { currentId: 'appendix-breadcrumb-current' },
  )

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Appendix · Exercises for Reddit</title>
    <link rel="stylesheet" href="/src/site.css" />
    <link rel="stylesheet" href="/src/prose.css" />
    <link rel="stylesheet" href="/src/appendix.css" />
  </head>
  <body class="appendix-body">
    <aside class="appendix-rail" aria-label="Appendix">
      <motion class="appendix-rail__head">
        <motion class="appendix-rail__rule" aria-hidden="true"></motion>
      </motion>
      <nav class="appendix-nav" aria-label="Appendix sections">
        <ul role="tablist">${nav}</ul>
      </nav>
    </aside>
    <motion class="appendix-main site-layout site-layout--wide">
      ${siteToolbar({ breadcrumb: tabTrail })}
      <header class="site-header">
        <h1>Appendix</h1>
        <p class="site-lead">Tools, QA notes, and research paths behind the Patreon and Ghost write-ups.</p>
      </header>
      <main class="site-main">
        <div class="appendix-panels">${panels}</div>
      </main>
      ${SITE_FOOTER}
    </motion>
    <script type="module" src="/appendix/main.js"></script>
    ${PROSE_IMAGES_SCRIPT}
  </body>
</html>`.replace(/<motion class="/g, '<div class="').replace(/<\/motion>/g, '</div>')
}

function writeArticlePage(relPath, pageTitle, breadcrumbLabel, fragment, { proseModifier } = {}) {
  let polished = polish(fragment)
  if (relPath === 'onboarding-patreon/index.html') polished = mergeBulletedLists(polished)
  const { title, lead, body: rawBody } = extractArticleHeader(polished, pageTitle)
  let body = injectLeadFigure(rawBody, HERO_IMAGES[relPath])
  if (relPath === 'messaging-ghost/index.html') body = patchGhostArticle(body)
  const proseClass = proseModifier ? `prose ${proseModifier}` : 'prose'
  const html = contentShell({
    title: pageTitle,
    breadcrumbItems: [{ href: '/', label: 'Home' }, { label: breadcrumbLabel }],
    headerTitle: title,
    headerLead: lead,
    main: `<article class="${proseClass}">${body}</article>`,
  })
  const full = path.join(root, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, html)
}

const onboarding = fs.readFileSync(path.join(fragDir, 'onboarding-patreon.html'), 'utf8')
const messaging = fs.readFileSync(path.join(fragDir, 'messaging-ghost.html'), 'utf8')
const appendixFrag = fs.readFileSync(path.join(fragDir, 'appendix.html'), 'utf8')

const writeUpProse = { proseModifier: 'prose--write-up' }

writeArticlePage(
  'onboarding-patreon/index.html',
  'Patreon direct messaging',
  'Direct messaging',
  onboarding,
  { proseModifier: 'prose--write-up prose--patreon' },
)
writeArticlePage(
  'messaging-ghost/index.html',
  'Ghost onboarding',
  'Onboarding',
  messaging,
  writeUpProse,
)

const appendixPolished = polish(appendixFrag)
const appendixHeader = extractArticleHeader(appendixPolished, 'Appendix')

const appendixSections = splitAppendixSections(appendixHeader.body)
const { panels, nav, tabs } = buildAppendixTabs(appendixSections)
const appendixHtml = appendixPageShell({ panels, nav, tabs })
fs.writeFileSync(path.join(root, 'appendix/index.html'), appendixHtml)

const homeHtml = contentShell({
  title: 'Trying new things, because Reddit',
  headerTitle: 'Trying new things, because Reddit',
  main: `
        <ul class="directory">
            ${directoryItem({
              href: '/messaging-ghost/',
              title: 'Ghost onboarding',
              description: 'Rigorously assess a Substack alternative',
              thumb: HERO_THUMBS.ghost,
              thumbAlt: 'Ghost.org homepage',
              fetchPriority: 'high',
              thumbSize: HOME_THUMB_SIZE,
              ditherHover: true,
            })}
            ${directoryItem({
              href: '/onboarding-patreon/',
              title: 'Patreon DMs',
              description: 'Tear a neglected feature while it’s down',
              thumb: HERO_THUMBS.patreon,
              thumbAlt: 'Patreon mobile app screenshots',
              thumbSize: HOME_THUMB_SIZE,
              ditherHover: true,
            })}
            ${directoryItem({
              href: '/appendix/',
              title: 'Appendix',
              description: 'Cutting room floor and Lazarus pit',
              thumb: HERO_THUMBS.fees,
              thumbAlt: 'Ghost vs Substack fee calculator',
              thumbSize: HOME_THUMB_SIZE,
              ditherHover: true,
            })}
        </ul>`,
  prose: false,
  home: true,
})
fs.writeFileSync(path.join(root, 'index.html'), homeHtml)

console.log('Wrote index.html, onboarding-patreon/, messaging-ghost/, appendix/')
