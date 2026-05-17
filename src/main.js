import './style.css'
import { analyzeCopy } from './api.js'
import { extractTextFromImage, validateImageFile } from './extract.js'

const CRITERIA_ORDER = [
  'Concise',
  'Contextual',
  'Consistent',
  'Candid',
  'Conversational',
]

const app = document.querySelector('#app')

app.innerHTML = `
  <nav class="site-nav">
    <a href="/">← Exercises for Reddit</a>
  </nav>
  <div class="layout">
    <header class="header">
      <h1>Redditizer</h1>
      <p class="subtitle">UX copy review against Reddit's style guide and 5C rubric</p>
    </header>

    <main class="main">
      <form id="analyze-form" class="form">
        <div class="field">
          <span class="label">Screenshot <span class="optional">(optional)</span></span>
          <div id="drop-zone" class="drop-zone" tabindex="0">
            <input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
            />
            <p class="drop-hint">Drag and drop, paste, or <button type="button" id="browse-btn" class="btn-link">browse</button> a screenshot</p>
            <div id="preview-area" class="preview-area" hidden></div>
            <p id="ocr-status" class="ocr-status" hidden aria-live="polite"></p>
          </div>
        </div>

        <label class="field">
          <span class="label">Copy to review</span>
          <textarea
            id="copy-input"
            name="text"
            rows="6"
            placeholder="Paste or type UI copy—or paste/drop a screenshot here to extract text"
          ></textarea>
        </label>

        <label class="field">
          <span class="label">Context <span class="optional">(optional)</span></span>
          <input
            id="context-input"
            name="context"
            type="text"
            placeholder="e.g. button label, error message, empty state"
          />
        </label>

        <button type="submit" class="btn-primary" id="submit-btn">Redditize</button>
      </form>

      <p id="error" class="error" hidden role="alert"></p>

      <section id="results" class="results" hidden aria-live="polite"></section>
    </main>
  </div>
`

const form = document.getElementById('analyze-form')
const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const browseBtn = document.getElementById('browse-btn')
const previewArea = document.getElementById('preview-area')
const ocrStatus = document.getElementById('ocr-status')
const resultsEl = document.getElementById('results')
const dropHint = dropZone.querySelector('.drop-hint')
const copyInput = document.getElementById('copy-input')
const contextInput = document.getElementById('context-input')
const submitBtn = document.getElementById('submit-btn')
const errorEl = document.getElementById('error')

let selectedFile = null
let previewUrl = null

function showOcrStatus(message, type = 'info') {
  ocrStatus.textContent = message
  ocrStatus.hidden = !message
  ocrStatus.className = `ocr-status ocr-status-${type}`
}

function renderPreview() {
  previewArea.innerHTML = `
    <img class="preview-img" alt="Screenshot preview" src="${previewUrl}" />
    <div class="preview-actions">
      <button type="button" class="btn-secondary" data-action="extract">Extract text</button>
      <button type="button" class="btn-link" data-action="clear">Remove</button>
    </div>
  `
  previewArea.hidden = false
  dropHint.hidden = true
}

function setSelectedFile(file) {
  validateImageFile(file)
  if (previewUrl) URL.revokeObjectURL(previewUrl)

  selectedFile = file
  previewUrl = URL.createObjectURL(file)
  renderPreview()
  showOcrStatus('')
}

function clearSelectedFile() {
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  selectedFile = null
  previewUrl = null
  previewArea.innerHTML = ''
  previewArea.hidden = true
  dropHint.hidden = false
  fileInput.value = ''
  showOcrStatus('')
}

previewArea.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action
  if (action === 'extract' && selectedFile) void runExtraction(selectedFile)
  if (action === 'clear') clearSelectedFile()
})

async function runExtraction(file) {
  showError('')
  const extractBtn = previewArea.querySelector('[data-action="extract"]')
  if (extractBtn) extractBtn.disabled = true
  showOcrStatus('Extracting text with vision…', 'loading')

  try {
    const { text, fallback } = await extractTextFromImage(file)
    copyInput.value = text
    if (fallback) {
      showOcrStatus(
        'API quota reached — used basic OCR instead. Edit the text, then Redditize.',
        'success',
      )
    } else {
      showOcrStatus('Text extracted. Edit if needed, then Redditize.', 'success')
    }
  } catch (err) {
    showOcrStatus(err instanceof Error ? err.message : 'Extraction failed', 'error')
  } finally {
    if (extractBtn) extractBtn.disabled = false
  }
}

async function handleFile(file, { autoExtract = false } = {}) {
  try {
    setSelectedFile(file)
    showError('')
    if (autoExtract) await runExtraction(file)
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Invalid file')
  }
}

function getClipboardImageFile(clipboardData) {
  if (!clipboardData?.items) return null

  for (const item of clipboardData.items) {
    if (!item.type.startsWith('image/')) continue

    const blob = item.getAsFile()
    if (!blob) continue

    const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1] || 'png'
    return new File([blob], `pasted-screenshot.${ext}`, { type: blob.type })
  }

  return null
}

browseBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) handleFile(file)
})

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('drop-zone-active')
})

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone-active')
})

dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('drop-zone-active')
  const file = e.dataTransfer.files?.[0]
  if (file) handleFile(file)
})

document.addEventListener('paste', (e) => {
  const file = getClipboardImageFile(e.clipboardData)
  if (!file) return

  e.preventDefault()
  const autoExtract = e.target === copyInput
  void handleFile(file, { autoExtract })
})

copyInput.addEventListener('dragover', (e) => {
  if (![...e.dataTransfer.types].includes('Files')) return
  e.preventDefault()
  copyInput.classList.add('copy-input-dragover')
})

copyInput.addEventListener('dragleave', () => {
  copyInput.classList.remove('copy-input-dragover')
})

copyInput.addEventListener('drop', (e) => {
  e.preventDefault()
  copyInput.classList.remove('copy-input-dragover')
  const file = e.dataTransfer.files?.[0]
  if (file?.type.startsWith('image/')) void handleFile(file, { autoExtract: true })
})

function showError(message) {
  errorEl.textContent = message
  errorEl.hidden = !message
}

function scoreClass(score) {
  if (score >= 4) return 'score-4'
  if (score >= 3) return 'score-3'
  if (score >= 2) return 'score-2'
  return 'score-1'
}

function renderRubricHtml(rubricScores) {
  const byCriterion = Object.fromEntries(rubricScores.map((r) => [r.criterion, r]))

  const items = CRITERIA_ORDER.map((name) => {
    const row = byCriterion[name]
    return `
      <div class="rubric-item ${scoreClass(row.score)}">
        <div class="rubric-header">
          <span class="rubric-name">${name}</span>
          <span class="rubric-score">${row.score}/4</span>
        </div>
        <p class="rubric-rationale">${escapeHtml(row.rationale)}</p>
      </div>
    `
  }).join('')

  return `
    <article class="card">
      <h2>5C Rubric</h2>
      <div class="rubric-grid">${items}</div>
    </article>
  `
}

function renderIssuesHtml(issues) {
  const items = issues
    .map(
      (issue) => `
      <li class="issue issue-${issue.severity}">
        <div class="issue-meta">
          <span class="badge badge-${issue.severity}">${issue.severity}</span>
          <span class="issue-category">${escapeHtml(issue.category)}</span>
          <span class="issue-ref">${escapeHtml(issue.guidelineRef)}</span>
        </div>
        <blockquote class="issue-excerpt">"${escapeHtml(issue.excerpt)}"</blockquote>
        <p class="issue-problem">${escapeHtml(issue.problem)}</p>
      </li>
    `,
    )
    .join('')

  return `
    <article class="card">
      <h2>Issues</h2>
      <ul class="issues-list">${items}</ul>
    </article>
  `
}

function renderSuggestionsHtml(suggestions) {
  const items = suggestions
    .map((s, i) => {
      const copyText = formatSuggestionText(s.text)
      return `
      <div class="suggestion">
        <div class="suggestion-header">
          <span class="suggestion-label">Option ${i + 1}</span>
          <button type="button" class="btn-copy">Copy</button>
        </div>
        <div class="suggestion-copy">${escapeHtml(copyText)}</div>
        <p class="suggestion-rationale">${escapeHtml(s.rationale)}</p>
      </div>
    `
    })
    .join('')

  return `
    <article class="card">
      <h2>Suggested alternatives</h2>
      <div class="suggestions">${items}</div>
    </article>
  `
}

function bindCopyButtons() {
  resultsEl.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text =
        btn.closest('.suggestion')?.querySelector('.suggestion-copy')?.textContent ?? ''
      await navigator.clipboard.writeText(text)
      btn.textContent = 'Copied'
      setTimeout(() => {
        btn.textContent = 'Copy'
      }, 1500)
    })
  })
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Plain suggestion copy: strip markdown emphasis, keep line breaks. */
function formatSuggestionText(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim()
}

function renderResults(data) {
  const { analysis, provider } = data
  const parts = []

  if (provider) {
    parts.push(`<p class="provider-badge">Analyzed with ${escapeHtml(provider)}</p>`)
  }

  if (analysis.summary?.trim()) {
    parts.push(`
      <article class="card">
        <h2>Summary</h2>
        <p>${escapeHtml(analysis.summary.trim())}</p>
      </article>
    `)
  }

  if (analysis.rubricScores?.length) {
    parts.push(renderRubricHtml(analysis.rubricScores))
  }

  if (analysis.issues?.length) {
    parts.push(renderIssuesHtml(analysis.issues))
  }

  if (analysis.suggestions?.length) {
    parts.push(renderSuggestionsHtml(analysis.suggestions))
  }

  resultsEl.innerHTML = parts.join('')
  resultsEl.hidden = parts.length === 0
  bindCopyButtons()
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  showError('')
  resultsEl.innerHTML = ''
  resultsEl.hidden = true

  const text = copyInput.value
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .join('\n')
  if (!text) {
    showError('Please enter copy to review.')
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = 'Redditizing…'

  try {
    const data = await analyzeCopy(text, contextInput.value)
    renderResults(data)
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Analysis failed')
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Redditize'
  }
})
