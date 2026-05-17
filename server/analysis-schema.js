const CRITERIA = [
  'Concise',
  'Contextual',
  'Consistent',
  'Candid',
  'Conversational',
]

export const analysisJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One-paragraph overall assessment' },
    rubricScores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterion: {
            type: 'string',
            enum: CRITERIA,
          },
          score: { type: 'integer', minimum: 1, maximum: 4 },
          rationale: { type: 'string' },
        },
        required: ['criterion', 'score', 'rationale'],
        additionalProperties: false,
      },
    },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['minor', 'major'] },
          category: { type: 'string' },
          excerpt: { type: 'string' },
          problem: { type: 'string' },
          guidelineRef: { type: 'string' },
        },
        required: ['severity', 'category', 'excerpt', 'problem', 'guidelineRef'],
        additionalProperties: false,
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['text', 'rationale'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'rubricScores', 'issues', 'suggestions'],
  additionalProperties: false,
}

export function validateAnalysis(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Analysis must be an object')
  }

  if (typeof obj.summary !== 'string' || !obj.summary.trim()) {
    throw new Error('Analysis missing valid summary')
  }

  if (!Array.isArray(obj.rubricScores) || obj.rubricScores.length !== CRITERIA.length) {
    throw new Error(`Analysis must include exactly ${CRITERIA.length} rubric scores`)
  }

  const seen = new Set()
  for (const row of obj.rubricScores) {
    if (!CRITERIA.includes(row.criterion)) {
      throw new Error(`Invalid criterion: ${row.criterion}`)
    }
    if (seen.has(row.criterion)) {
      throw new Error(`Duplicate criterion: ${row.criterion}`)
    }
    seen.add(row.criterion)
    if (!Number.isInteger(row.score) || row.score < 1 || row.score > 4) {
      throw new Error(`Invalid score for ${row.criterion}`)
    }
    if (typeof row.rationale !== 'string' || !row.rationale.trim()) {
      throw new Error(`Missing rationale for ${row.criterion}`)
    }
  }

  if (!Array.isArray(obj.issues)) {
    throw new Error('Analysis issues must be an array')
  }
  for (const issue of obj.issues) {
    if (!['minor', 'major'].includes(issue.severity)) {
      throw new Error('Invalid issue severity')
    }
    for (const key of ['category', 'excerpt', 'problem', 'guidelineRef']) {
      if (typeof issue[key] !== 'string') {
        throw new Error(`Issue missing ${key}`)
      }
    }
  }

  if (!Array.isArray(obj.suggestions) || obj.suggestions.length < 1) {
    throw new Error('Analysis must include at least one suggestion')
  }
  for (const s of obj.suggestions) {
    if (typeof s.text !== 'string' || !s.text.trim()) {
      throw new Error('Suggestion missing text')
    }
    if (typeof s.rationale !== 'string' || !s.rationale.trim()) {
      throw new Error('Suggestion missing rationale')
    }
  }

  return obj
}
