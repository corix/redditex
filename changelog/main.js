import { marked } from 'marked'
import diaryMd from '../DIARY.md?raw'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const el = document.getElementById('changelog')
let html = marked.parse(diaryMd).replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '')
html = html.replace(/<strong>([^<]*)<\/strong>/g, (_, text) =>
  text.trim() === 'Pencils down!' ? '<strong class="changelog-finale">Pencils down!</strong>' : text,
)
el.innerHTML = html
  .replace(/<table>/g, '<div class="table-wrap"><table>')
  .replace(/<\/table>/g, '</table></div>')

const tbody = el.querySelector('table tbody')
if (tbody) {
  const rows = [...tbody.querySelectorAll('tr')]
  rows.reverse().forEach((row) => tbody.appendChild(row))
}
