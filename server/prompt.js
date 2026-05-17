import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsDir = join(__dirname, '..', 'docs')

let cachedGuidelines = null

export function loadGuidelines() {
  if (cachedGuidelines) return cachedGuidelines

  const styleGuide = readFileSync(join(docsDir, 'reddit-style-guide.md'), 'utf8')
  const rubric = readFileSync(join(docsDir, 'ux-writing-rubric.md'), 'utf8')

  cachedGuidelines = { styleGuide, rubric }
  return cachedGuidelines
}

export function buildSystemPrompt() {
  const { styleGuide, rubric } = loadGuidelines()

  return `You are a Reddit UX writing reviewer. Evaluate product copy against Reddit's official guidelines.

## UX Writing Rubric (5Cs)
Score each criterion from 1 (really bad) to 4 (flawless execution):
- Concise
- Contextual
- Consistent
- Candid
- Conversational

${rubric}

## Reddit Style Guide
${styleGuide}

## Review instructions
- Score all five rubric criteria with brief rationales tied to the pasted copy.
- Flag grammar/mechanics, terminology (use the glossary), voice/tone, capitalization, and inclusion issues.
- Cite relevant style-guide section names in guidelineRef (not line numbers).
- Propose 1–3 alternative rewrites that comply with the guidelines.
- Do not invent Reddit features or terms not in the glossary.
- Prefer minimal edits when copy is already strong.
- Distinguish errors (wrong term, misleading, offensive) from improvements (could be more concise).
- Alternatives must be production-ready UI copy, not meta-commentary.
- In suggestions.text use plain text only (no markdown, no bold). Preserve line breaks and multi-line structure when the input has labels like Heading/Body/CTA on separate lines.
- Return your analysis using the submit_analysis tool.`
}

export function buildUserMessage(text, context) {
  let message = `Review this product copy:\n\n"""${text}"""`
  if (context?.trim()) {
    message += `\n\nContext (where this copy appears): ${context.trim()}`
  }
  return message
}
