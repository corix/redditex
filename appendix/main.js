const tabs = [...document.querySelectorAll('.appendix-nav__link')]
const panels = [...document.querySelectorAll('.appendix-panel')]
const validIds = new Set(tabs.map((t) => t.dataset.tab))
const breadcrumbCurrent = document.getElementById('appendix-breadcrumb-current')
const redditizerQaGrid = document.querySelector('.redditizer-qa-grid')

function cropRedditizerQaGrid() {
  if (!redditizerQaGrid) return

  const figures = [...redditizerQaGrid.querySelectorAll('figure.image')]
  const imgs = figures.map((f) => f.querySelector('img')).filter(Boolean)
  if (!imgs.length) return

  const colWidth = figures[0].clientWidth
  if (!colWidth) return

  let minHeight = Infinity
  for (const img of imgs) {
    const { naturalWidth: w, naturalHeight: h } = img
    if (!w || !h) return
    minHeight = Math.min(minHeight, (h / w) * colWidth)
  }

  if (!Number.isFinite(minHeight)) return

  redditizerQaGrid.style.setProperty('--redditizer-qa-cell-h', `${Math.round(minHeight)}px`)
  redditizerQaGrid.classList.add('redditizer-qa-grid--cropped')
}

function scheduleCropRedditizerQaGrid() {
  if (!redditizerQaGrid) return

  const imgs = [...redditizerQaGrid.querySelectorAll('img')]
  const measure = () => requestAnimationFrame(cropRedditizerQaGrid)

  imgs.forEach((img) => {
    if (img.complete) return
    img.addEventListener('load', measure, { once: true })
  })
  measure()
}

let resizeTimer
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(cropRedditizerQaGrid, 150)
})

scheduleCropRedditizerQaGrid()

function activate(tabId) {
  const id = validIds.has(tabId) ? tabId : 'tools'

  tabs.forEach((tab) => {
    const active = tab.dataset.tab === id
    tab.classList.toggle('is-active', active)
    tab.setAttribute('aria-selected', String(active))
    tab.tabIndex = active ? 0 : -1
  })

  panels.forEach((panel) => {
    const active = panel.dataset.tab === id
    panel.classList.toggle('is-active', active)
    panel.hidden = !active
  })

  if (id === 'redditizer-qa') scheduleCropRedditizerQaGrid()

  const tab = tabs.find((t) => t.dataset.tab === id)
  if (breadcrumbCurrent && tab) breadcrumbCurrent.textContent = tab.textContent.trim()

  const hash = `#${id}`
  if (location.hash !== hash) {
    history.replaceState(null, '', hash)
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', (e) => {
    e.preventDefault()
    activate(tab.dataset.tab)
  })

  tab.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(tab)
    let next = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = tabs.length - 1
    if (next >= 0) {
      e.preventDefault()
      tabs[next].focus()
      activate(tabs[next].dataset.tab)
    }
  })
})

window.addEventListener('hashchange', () => {
  activate(location.hash.slice(1))
})

activate(location.hash.slice(1) || 'tools')
