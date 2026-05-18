import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const fragDir = path.join(root, 'scripts', '_fragments')

const SITE_FOOTER = `
      <footer class="site-footer">
        <a href="/changelog/">Changelog</a>
        <a href="/">Home</a>
      </footer>`

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
      '<a href="/appendix/fee-calculator/">/appendix/fee-calculator/</a>',
    )
    .replace(
      /<strong>Redditizer<\/strong>/g,
      '<a href="/appendix/redditizer/"><strong>Redditizer</strong></a>',
    )
    .replace(/<script src="https:\/\/cdnjs\.cloudflare\.com[^>]*><\/script>/gi, '')
    .replace(/<link[^>]*prism[^>]*>/gi, '')
    .replace(/<\/p><\/div><\/aside>/g, '</p></aside>')
}

function breadcrumb(items) {
  const parts = items.map((item, i) => {
    if (i === items.length - 1) {
      return `<span class="site-nav__current">${item.label}</span>`
    }
    return `<a href="${item.href}">${item.label}</a>`
  })
  return `<nav class="site-nav" aria-label="Breadcrumb">${parts.join('<span class="site-nav__sep">/</span>')}</nav>`
}

function contentShell({ title, breadcrumbItems, headerTitle, headerLead, main }) {
  const nav =
    breadcrumbItems.length > 0
      ? breadcrumb(breadcrumbItems)
      : '<nav class="site-nav" aria-label="Site"><span class="site-nav__current">Exercises for Reddit</span></nav>'

  const header = headerTitle
    ? `<header class="site-header">
        <h1>${headerTitle}</h1>
        ${headerLead ? `<p class="site-lead">${headerLead}</p>` : ''}
      </header>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title === 'Exercises for Reddit' ? title : `${title} — Exercises for Reddit`}</title>
    <link rel="stylesheet" href="/src/site.css" />
    <link rel="stylesheet" href="/src/prose.css" />
  </head>
  <body>
    <motion class="site-layout site-layout--wide">
      ${nav}
      ${header}
      <main class="site-main">
        ${main}
      </main>
      ${SITE_FOOTER}
    </motion>
  </body>
</html>`.replace(/<motion class="/g, '<div class="').replace(/<\/motion>/g, '')
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

function writeArticlePage(relPath, pageTitle, breadcrumbLabel, fragment) {
  const polished = polish(fragment)
  const { title, lead, body } = extractArticleHeader(polished, pageTitle)
  const html = contentShell({
    title: pageTitle,
    breadcrumbItems: [
      { href: '/', label: 'Home' },
      { href: `/${relPath.replace(/\/index\.html$/, '')}/`, label: breadcrumbLabel },
    ],
    headerTitle: title,
    headerLead: lead,
    main: `<article class="prose">${body}</article>`,
  })
  const full = path.join(root, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, html)
}

const hub = polish(fs.readFileSync(path.join(fragDir, 'hub.html'), 'utf8'))
const onboarding = fs.readFileSync(path.join(fragDir, 'onboarding-patreon.html'), 'utf8')
const messaging = fs.readFileSync(path.join(fragDir, 'messaging-ghost.html'), 'utf8')
const appendixFrag = fs.readFileSync(path.join(fragDir, 'appendix.html'), 'utf8')

writeArticlePage('onboarding-patreon/index.html', 'Patreon direct messaging', 'Patreon direct messaging', onboarding)
writeArticlePage('messaging-ghost/index.html', 'Ghost.org onboarding', 'Ghost.org onboarding', messaging)

const appendixPolished = polish(appendixFrag)
const appendixHeader = extractArticleHeader(appendixPolished, 'Appendix')

const appendixHtml = contentShell({
  title: 'Appendix',
  breadcrumbItems: [
    { href: '/', label: 'Home' },
    { href: '/appendix/', label: 'Appendix' },
  ],
  headerTitle: appendixHeader.title,
  headerLead: appendixHeader.lead,
  main: `
        <ul class="directory">
          <li>
            <a class="directory-card" href="/appendix/fee-calculator/">
              <h2>Fee calculator</h2>
              <p>Compare Ghost and Substack take-home pay at your list size.</p>
            </a>
          </li>
          <li>
            <a class="directory-card" href="/appendix/redditizer/">
              <h2>Redditizer</h2>
              <p>LLM-based quality checker for UI strings against Reddit’s style guide.</p>
            </a>
          </li>
        </ul>
        <article class="prose">${appendixHeader.body}</article>`,
})
fs.writeFileSync(path.join(root, 'appendix/index.html'), appendixHtml)

const homeHtml = contentShell({
  title: 'Exercises for Reddit',
  breadcrumbItems: [],
  headerTitle: 'Exercises for Reddit',
  headerLead: 'Small experiments and prototypes.',
  main: `
        <article class="prose prose--home">${hub}</article>
        <ul class="directory">
          <li>
            <a class="directory-card" href="/onboarding-patreon/">
              <h2>Patreon direct messaging</h2>
              <p>UX teardown of Patreon DMs and mobile inbox patterns.</p>
            </a>
          </li>
          <li>
            <a class="directory-card" href="/messaging-ghost/">
              <h2>Ghost.org onboarding</h2>
              <p>Onboarding, signup, and pricing messaging on Ghost.</p>
            </a>
          </li>
          <li>
            <a class="directory-card" href="/appendix/">
              <h2>Appendix</h2>
              <p>Supporting notes, prototypes, and interactive tools.</p>
            </a>
          </li>
        </ul>`,
})
fs.writeFileSync(path.join(root, 'index.html'), homeHtml)

console.log('Wrote index.html, onboarding-patreon/, messaging-ghost/, appendix/')
