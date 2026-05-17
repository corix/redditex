import { GoogleGenerativeAI } from '@google/generative-ai'
import { validateAnalysis } from '../analysis-schema.js'

const JSON_INSTRUCTION = `

Respond with a single JSON object only (no markdown). Use this shape:
{
  "summary": "string",
  "rubricScores": [
    { "criterion": "Concise|Contextual|Consistent|Candid|Conversational", "score": 1-4, "rationale": "string" }
  ],
  "issues": [
    { "severity": "minor|major", "category": "string", "excerpt": "string", "problem": "string", "guidelineRef": "string" }
  ],
  "suggestions": [
    { "text": "string", "rationale": "string" }
  ]
}
Include all five rubric criteria and at least one suggestion.`

export async function analyzeCopy({ system, user }) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set')
  }

  const modelName = process.env.GOOGLE_MODEL || 'gemini-2.5-flash'
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: system + JSON_INSTRUCTION,
  })

  let result
  try {
    result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('429') || message.includes('quota') || message.includes('Quota')) {
      throw new Error(
        `Google API quota exceeded for ${modelName}. Wait a minute and retry, switch GOOGLE_MODEL (e.g. gemini-2.5-flash-lite), enable billing at https://aistudio.google.com, or use LLM_PROVIDER=anthropic.`,
      )
    }
    throw err
  }

  const text = result.response.text()

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Google model returned invalid JSON')
  }

  return validateAnalysis(parsed)
}
