# Prompt studio · Limelight

Three agents behind one dark, high-contrast UI. Everything runs on Gemini's free tier, so the app itself costs nothing to run.

| Tab | What it does |
|---|---|
| **Prompts** (`/`) | One brief → a ready-to-paste prompt for each AI tool you pick (GPT Image, Nano Banana, Ideogram, Higgsfield, Kling, Suno, ElevenLabs), each in that tool's own grammar. Copy, open the tool, paste. |
| **Content** (`/content`) | One brief → captions, hooks, hashtags, CTA and a visual note per platform (Instagram, Facebook, LinkedIn, X, YouTube Shorts, WhatsApp), plus optional ad copy. Tone and language (English, Hindi, Hinglish, Punjabi). |
| **Schedule** (`/schedule`) | One campaign brief → a 7/14/30-day posting calendar with a caption per slot, content pillars, best times (IST), a "posted" checkbox that persists in the browser, CSV export, and Add-to-Google-Calendar links. |

Posting itself happens in each platform's own app. Meta Business Suite schedules Instagram and Facebook for free; the CSV imports into Buffer, Later or a sheet. Direct auto-posting needs platform API access and is not included.

## Run

```
npm install
cp .env.example .env.local     # add GEMINI_API_KEY (free, from aistudio.google.com/apikey)
npm run dev                    # http://localhost:3000
```

Without a key the app runs in demo mode and says so in the header pill.

## Files

| File | Role |
|---|---|
| `components/Shell.tsx`, `components/ui.tsx` | Header, tabs, status pill, section labels, tiles, copy buttons, loader, icons |
| `app/globals.css` | The dark theme (tokens at the top) |
| `lib/brand.ts` | Limelight brand rules, shared by every agent |
| `lib/llm.ts` | One JSON call on Gemini (free) or Claude, with schema validation |
| `lib/targets.ts`, `lib/promptpack.ts`, `app/api/prompts` | Prompts agent |
| `lib/content.ts`, `app/api/content` | Content agent (platform guidance lives here) |
| `lib/schedule.ts`, `app/api/schedule` | Schedule agent |

Add a tool or platform by adding one entry with its guidance in `lib/targets.ts` or `lib/content.ts`.

## Env

| Var | Notes |
|---|---|
| `GEMINI_API_KEY` | Free. Powers all three agents. |
| `GEMINI_MODEL` | default `gemini-3.6-flash` |
| `LLM_PROVIDER` | `gemini` or `anthropic`; empty = auto |
| `ANTHROPIC_API_KEY` | Optional, paid. Used only if no Gemini key, or if `LLM_PROVIDER=anthropic`. |
