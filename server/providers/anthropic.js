import Anthropic from '@anthropic-ai/sdk'
import { analysisJsonSchema, validateAnalysis } from '../analysis-schema.js'
import { EXTRACT_SYSTEM, EXTRACT_USER } from '../extract-prompt.js'
import { isQuotaError, toQuotaError } from '../quota.js'

const TOOL_NAME = 'submit_analysis'

export async function analyzeCopy({ system, user }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const client = new Anthropic({ apiKey })
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
    tools: [
      {
        name: TOOL_NAME,
        description: 'Submit the UX copy analysis as structured JSON',
        input_schema: analysisJsonSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  })

  const toolBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolBlock || toolBlock.name !== TOOL_NAME) {
    throw new Error('Model did not return analysis via submit_analysis tool')
  }

  return validateAnalysis(toolBlock.input)
}

export async function extractTextFromImage({ imageBase64, mimeType }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const client = new Anthropic({ apiKey })
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

  let response
  try {
    response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: EXTRACT_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            { type: 'text', text: EXTRACT_USER },
          ],
        },
      ],
    })
  } catch (err) {
    if (isQuotaError(err)) {
      throw toQuotaError(err, 'Anthropic')
    }
    throw err
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()

  if (!text) {
    throw new Error('No text found in image. Try a clearer screenshot.')
  }

  return text
}
