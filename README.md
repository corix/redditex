# Exercises for Reddit

A small collection of prototypes. The site home lists sub-projects; each lives at its own path.

| Path | Project |
|------|---------|
| `/` | Directory home |
| `/redditizer/` | LLM-based UX copy review against Reddit's style guide |
| `/ghost-fees/` | Ghost vs Substack pricing calculator |

## Redditizer

Proofreads product copy against Reddit's style guide and UX writing rubric in [`docs/`](docs/).

### Setup

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

4. Open [http://localhost:5173/](http://localhost:5173/) for the site home, or [http://localhost:5173/redditizer/](http://localhost:5173/redditizer/) to use Redditizer directly. Paste copy or upload a screenshot, then click **Redditize**.

### Screenshot workflow

1. Add a screenshot via the upload zone, or paste/drag an image directly into **Copy to review** (text extraction runs automatically).
2. Or use the upload zone and click **Extract text** manually.
3. Edit the extracted text if needed, add optional context, then click **Redditize**.

Screenshots are sent to your configured LLM provider for vision-based text extraction (same API key as analysis). If the provider’s free quota is exhausted, the app falls back to basic in-browser OCR (Tesseract; first run downloads English language data). Only the extracted text is used for the style-guide review.

### Switching providers

Change `LLM_PROVIDER` in `.env` to `anthropic` or `google`, set the matching API key, and restart the API server (`pnpm dev:server` or full `pnpm dev`).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run Vite frontend and API server together |
| `pnpm dev:client` | Frontend only |
| `pnpm dev:server` | API server only |
| `pnpm build` | Build static frontend to `dist/` |
| `pnpm preview` | Preview built frontend (API must run separately) |

## Deploy (Netlify)

The repo includes [`netlify.toml`](netlify.toml). Connect the site on Netlify; the build runs `pnpm build` and publishes `dist/`.

Static pages (`/`, `/redditizer/`, `/ghost-fees/`) deploy as-is. **Redditizer’s analyze and screenshot APIs require a backend**—they work locally via Vite’s proxy to the Node server on port 3001. On Netlify production, `/api/*` is not wired yet; use `pnpm dev` locally, or add Netlify Functions / an external API host in a follow-up.

## API

`POST /api/analyze`

```json
{
  "text": "Copy to review",
  "context": "optional — e.g. button label"
}
```

Returns structured analysis: summary, 5C rubric scores, issues, and suggested alternatives.

`POST /api/extract-text`

```json
{
  "imageBase64": "<base64-encoded image bytes>",
  "mimeType": "image/png"
}
```

Returns `{ "text": "...", "method": "vision", "provider": "google" }`. On quota/rate-limit errors, responds with `429` and `{ "quotaExceeded": true }` so the client can fall back to local OCR.
