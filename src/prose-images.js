let lightbox = null
let lastFocused = null
let lightboxSlides = null
let lightboxIndex = 0

function getLightbox() {
  if (lightbox) return lightbox

  const el = document.createElement('div')
  el.className = 'prose-lightbox'
  el.hidden = true
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'Expanded image')
  el.innerHTML = [
    '<button type="button" class="prose-lightbox__close" aria-label="Close">×</button>',
    '<button type="button" class="prose-lightbox__prev" aria-label="Previous image" hidden>‹</button>',
    '<button type="button" class="prose-lightbox__next" aria-label="Next image" hidden>›</button>',
    '<div class="prose-lightbox__backdrop" data-close></div>',
    '<figure class="prose-lightbox__figure">',
    '<img class="prose-lightbox__img" alt="">',
    '<figcaption class="prose-lightbox__caption"></figcaption>',
    '</figure>',
  ].join('')

  document.body.appendChild(el)
  lightbox = el

  el.querySelector('.prose-lightbox__close').addEventListener('click', closeLightbox)
  el.querySelector('[data-close]').addEventListener('click', closeLightbox)
  el.querySelector('.prose-lightbox__prev').addEventListener('click', () => stepLightbox(-1))
  el.querySelector('.prose-lightbox__next').addEventListener('click', () => stepLightbox(1))

  el.addEventListener('click', (e) => {
    if (e.target === el) closeLightbox()
  })

  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.hidden) return
    if (e.key === 'Escape') closeLightbox()
    if (lightboxSlides?.length > 1) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepLightbox(-1)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        stepLightbox(1)
      }
    }
  })

  return el
}

function panelCaption(panel) {
  const copy = panel.querySelector('.prose-carousel__copy')?.textContent?.trim() ?? ''
  const figcaption = panel.querySelector('figure figcaption')?.textContent?.trim() ?? ''
  if (copy && figcaption) return `${copy}—${figcaption}`
  return copy || figcaption
}

function collectPanelSlides(root) {
  return [...root.querySelectorAll('.prose-carousel__panel')].flatMap((panel) => {
    const figure = panel.querySelector('figure.image')
    const img = figure?.querySelector('img')
    if (!figure || !img) return []
    return [{ figure, img, caption: panelCaption(panel) }]
  })
}

function updateLightboxUi() {
  const lb = getLightbox()
  const prev = lb.querySelector('.prose-lightbox__prev')
  const next = lb.querySelector('.prose-lightbox__next')
  const multi = lightboxSlides?.length > 1

  prev.hidden = !multi
  next.hidden = !multi

  if (multi) {
    const n = lightboxSlides.length
    const pos = lightboxIndex + 1
    lb.setAttribute('aria-label', `Image ${pos} of ${n}`)
    prev.disabled = lightboxIndex === 0
    next.disabled = lightboxIndex === n - 1
  } else {
    lb.setAttribute('aria-label', 'Expanded image')
    prev.disabled = false
    next.disabled = false
  }
}

function showLightboxSlide(index) {
  if (!lightboxSlides?.length) return

  lightboxIndex = Math.max(0, Math.min(index, lightboxSlides.length - 1))
  const slide = lightboxSlides[lightboxIndex]
  const lb = getLightbox()
  const lbImg = lb.querySelector('.prose-lightbox__img')
  const caption = lb.querySelector('.prose-lightbox__caption')

  lbImg.src = slide.img.currentSrc || slide.img.src
  lbImg.alt = slide.img.alt || ''
  caption.textContent = slide.caption
  caption.hidden = !slide.caption
  updateLightboxUi()
}

function stepLightbox(delta) {
  if (!lightboxSlides?.length) return
  showLightboxSlide(lightboxIndex + delta)
}

function openLightbox(figure, { slides = null, startIndex = 0 } = {}) {
  const img = figure.querySelector('img')
  if (!img) return

  lightboxSlides = slides
  lightboxIndex = startIndex

  lastFocused = document.activeElement
  const lb = getLightbox()
  lb.hidden = false
  document.body.classList.add('prose-lightbox-open')

  if (slides?.length) {
    showLightboxSlide(startIndex)
  } else {
    const lbImg = lb.querySelector('.prose-lightbox__img')
    const caption = lb.querySelector('.prose-lightbox__caption')
    const figcaption = figure.querySelector('figcaption')

    lbImg.src = img.currentSrc || img.src
    lbImg.alt = img.alt || ''
    caption.textContent = figcaption?.textContent?.trim() ?? ''
    caption.hidden = !caption.textContent
    updateLightboxUi()
  }

  lb.querySelector('.prose-lightbox__close').focus()
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return

  lightbox.hidden = true
  document.body.classList.remove('prose-lightbox-open')
  lightbox.querySelector('.prose-lightbox__img').removeAttribute('src')
  lightboxSlides = null
  lightboxIndex = 0
  lastFocused?.focus()
  lastFocused = null
}

function carouselButton(label) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `prose-carousel__${label}`
  btn.setAttribute('aria-label', label === 'prev' ? 'Previous example' : 'Next example')
  btn.textContent = label === 'prev' ? '‹' : '›'
  return btn
}

function mountInlineCarousel(gallery) {
  const items = [...gallery.querySelectorAll('.prose-gallery__slide, li')]
  if (items.length === 0) return null

  const carousel = document.createElement('section')
  carousel.className = 'prose-carousel'
  carousel.setAttribute('data-prose-carousel', '')
  carousel.setAttribute('role', 'region')
  carousel.setAttribute('aria-roledescription', 'carousel')
  carousel.setAttribute('aria-label', 'Examples')

  const toolbar = document.createElement('div')
  toolbar.className = 'prose-carousel__toolbar'

  const prev = carouselButton('prev')
  const status = document.createElement('p')
  status.className = 'prose-carousel__status'
  status.setAttribute('aria-live', 'polite')
  const counter = document.createElement('span')
  counter.className = 'prose-carousel__counter'
  status.appendChild(counter)
  const next = carouselButton('next')

  toolbar.append(prev, status, next)

  const track = document.createElement('div')
  track.className = 'prose-carousel__track'

  const uid = `carousel-${Math.random().toString(36).slice(2, 9)}`
  const dots = document.createElement('div')
  dots.className = 'prose-carousel__dots'
  dots.setAttribute('role', 'tablist')
  dots.setAttribute('aria-label', 'Choose example')

  items.forEach((li, i) => {
    const panel = document.createElement('article')
    panel.className = 'prose-carousel__panel'
    panel.id = `${uid}-panel-${i}`
    panel.setAttribute('role', 'group')
    panel.setAttribute('aria-roledescription', 'slide')
    if (i === 0) panel.classList.add('is-active')

    const figure = li.querySelector('figure.image')
    const textNode = li.cloneNode(true)
    textNode.querySelectorAll('figure').forEach((f) => f.remove())
    const text = textNode.textContent.trim()

    const copy = document.createElement('p')
    copy.className = 'prose-carousel__copy'
    copy.textContent = text
    panel.appendChild(copy)
    if (figure) panel.appendChild(figure)

    track.appendChild(panel)

    const dot = document.createElement('button')
    dot.type = 'button'
    dot.className = 'prose-carousel__dot'
    dot.setAttribute('role', 'tab')
    dot.setAttribute('aria-controls', panel.id)
    dot.setAttribute('aria-label', `Example ${i + 1}`)
    dot.textContent = String(i + 1)
    if (i === 0) {
      dot.setAttribute('aria-selected', 'true')
      dot.classList.add('is-active')
    } else {
      dot.setAttribute('aria-selected', 'false')
    }
    dots.appendChild(dot)
  })

  carousel.append(toolbar, track, dots)
  gallery.replaceWith(carousel)

  const panels = [...track.querySelectorAll('.prose-carousel__panel')]
  const dotButtons = [...dots.querySelectorAll('.prose-carousel__dot')]

  function setIndex(index) {
    const n = panels.length
    if (n === 0) return 0
    const i = ((index % n) + n) % n
    panels.forEach((panel, j) => {
      const active = j === i
      panel.classList.toggle('is-active', active)
      panel.setAttribute('aria-hidden', active ? 'false' : 'true')
    })
    dotButtons.forEach((dot, j) => {
      const active = j === i
      dot.classList.toggle('is-active', active)
      dot.setAttribute('aria-selected', active ? 'true' : 'false')
    })
    counter.textContent = `${i + 1} of ${n}`
    carousel.dataset.carouselIndex = String(i)
    return i
  }

  prev.addEventListener('click', () => setIndex(Number(carousel.dataset.carouselIndex ?? 0) - 1))
  next.addEventListener('click', () => setIndex(Number(carousel.dataset.carouselIndex ?? 0) + 1))
  dotButtons.forEach((dot, i) => dot.addEventListener('click', () => setIndex(i)))

  carousel.addEventListener('keydown', (e) => {
    const current = Number(carousel.dataset.carouselIndex ?? 0)
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setIndex(current - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setIndex(current + 1)
    }
  })

  setIndex(0)
  return carousel
}

function bindFigureLightbox(figure, { slides = null, getStartIndex } = {}) {
  if (figure.dataset.lightboxBound) return

  figure.dataset.lightboxBound = 'true'
  figure.tabIndex = 0
  figure.setAttribute('role', 'button')
  figure.setAttribute('aria-label', slides ? 'Expand image' : 'Expand image')

  const open = (e) => {
    if (e?.target?.closest('a')) return
    const startIndex = getStartIndex?.() ?? slides?.findIndex((s) => s.figure === figure) ?? 0
    openLightbox(figure, { slides, startIndex: Math.max(0, startIndex) })
  }

  figure.addEventListener('click', open)
  figure.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open(e)
    }
  })
}

const COMPARE_MIN = 2
const COMPARE_MAX = 98
const COMPARE_KEY_STEP = 3

function readComparePercent(figure) {
  const raw = figure.style.getPropertyValue('--compare').trim() || '75%'
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 75
}

function setComparePercent(figure, handle, percent) {
  const p = Math.max(COMPARE_MIN, Math.min(COMPARE_MAX, percent))
  figure.style.setProperty('--compare', `${p}%`)
  handle.setAttribute('aria-valuenow', String(Math.round(p)))
  return p
}

function mountImageCompare(figure) {
  const stage = figure.querySelector('.image-compare__stage')
  const handle = figure.querySelector('.image-compare__handle')
  if (!stage || !handle) return

  let compare = readComparePercent(figure)
  setComparePercent(figure, handle, compare)

  function percentFromClientX(clientX) {
    const rect = stage.getBoundingClientRect()
    if (rect.width <= 0) return compare
    return ((clientX - rect.left) / rect.width) * 100
  }

  let dragging = false

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    dragging = true
    handle.setPointerCapture(e.pointerId)
    compare = setComparePercent(figure, handle, percentFromClientX(e.clientX))
  })

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return
    compare = setComparePercent(figure, handle, percentFromClientX(e.clientX))
  })

  const endDrag = (e) => {
    if (!dragging) return
    dragging = false
    if (handle.hasPointerCapture(e.pointerId)) {
      handle.releasePointerCapture(e.pointerId)
    }
  }

  handle.addEventListener('pointerup', endDrag)
  handle.addEventListener('pointercancel', endDrag)

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    if (e.target === handle || handle.contains(e.target)) return
    compare = setComparePercent(figure, handle, percentFromClientX(e.clientX))
  })

  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      compare = setComparePercent(figure, handle, compare - COMPARE_KEY_STEP)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      compare = setComparePercent(figure, handle, compare + COMPARE_KEY_STEP)
    }
  })
}

function initImageCompare(root = document) {
  root.querySelectorAll('[data-image-compare]').forEach((figure) => {
    if (figure.dataset.compareBound) return
    figure.dataset.compareBound = 'true'
    mountImageCompare(figure)
  })
}

export function initProseImages(root = document) {
  initImageCompare(root)

  root.querySelectorAll('.prose-gallery[data-prose-gallery]').forEach((gallery) => {
    if (gallery.dataset.galleryBound) return
    gallery.dataset.galleryBound = 'true'

    const carousel = mountInlineCarousel(gallery)
    if (!carousel) return

    const slides = collectPanelSlides(carousel)

    carousel.querySelectorAll('figure.image').forEach((figure) => {
      bindFigureLightbox(figure, {
        slides,
        getStartIndex: () => Number(carousel.dataset.carouselIndex ?? 0),
      })
    })
  })

  root.querySelectorAll('.prose figure.image').forEach((figure) => {
    if (figure.closest('[data-prose-carousel]')) return

    const img = figure.querySelector('img')
    if (!img || figure.dataset.lightboxBound) return
    bindFigureLightbox(figure)
  })
}

initProseImages()
