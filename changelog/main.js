import { marked } from 'marked'
import diaryMd from '../DIARY.md?raw'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const el = document.getElementById('changelog')
const html = marked.parse(diaryMd)
el.innerHTML = html
  .replace(/<table>/g, '<div class="table-wrap"><table>')
  .replace(/<\/table>/g, '</table></div>')
