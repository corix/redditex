# Redditizer

A local web tool that proofreads product copy against Reddit's style guide and UX writing rubric in [`docs/`](docs/).

## Setup

1. Copy the environment template and add your API key:

   ```bash
   cp .env.example .env
   ```

2. Choose a provider in `.env`:

   - `LLM_PROVIDER=anthropic` — set `ANTHROPIC_API_KEY`
   - `LLM_PROVIDER=google` — set `GOOGLE_API_KEY`

   OpenAI and Grok are not supported.

   **Google quota:** The free tier has daily/minute limits. `gemini-2.0-flash` may show limit `0` on free tier—use `gemini-2.5-flash` or `gemini-2.5-flash-lite` in `.env`, or enable billing in [AI Studio](https://aistudio.google.com). Each review sends the full style guide (~large input).

3. Install dependencies and start dev servers (Vite + API):

   ```bash
   pnpm install
   pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173), paste copy or upload a screenshot, and click **Analyze**.

## Screenshot workflow

1. Add a screenshot via the upload zone, or paste/drag an image directly into **Copy to review** (OCR runs automatically).
2. Or use the upload zone and click **Extract text** manually. The first OCR run downloads English language data.
3. Edit the extracted text if needed, add optional context, then click **Analyze**.

OCR runs entirely in the browser; only the text you submit is sent to the LLM API. Works best on clear, high-contrast UI screenshots.

## Switching providers

Change `LLM_PROVIDER` in `.env` to `anthropic` or `google`, set the matching API key, and restart the API server (`pnpm dev:server` or full `pnpm dev`).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run Vite frontend and API server together |
| `pnpm dev:client` | Frontend only |
| `pnpm dev:server` | API server only |
| `pnpm build` | Build static frontend to `dist/` |
| `pnpm preview` | Preview built frontend (API must run separately) |

## API

`POST /api/analyze`

```json
{
  "text": "Copy to review",
  "context": "optional — e.g. button label"
}
```

Returns structured analysis: summary, 5C rubric scores, issues, and suggested alternatives.
