# Limelight prompt studio + design agent

Two tools in one Next.js app.

## 1. Prompt studio (`/`) — free path

One brief in. A ready-to-paste prompt for each AI tool you pick, written in that tool's own grammar. You paste them into the tools' free web apps, so nothing here costs money.

| Tool | Kind | What the writer produces |
|---|---|---|
| ChatGPT · GPT Image | image | prose prompt, quoted text, aspect in words |
| Gemini · Nano Banana | image | conversational create/edit instruction, aspect ratio |
| Ideogram | image | text-first poster prompt, typography notes |
| Higgsfield | video | one-shot 5–8 s prompt with camera move and preset |
| Kling | video | full-scene text-to-video prompt, duration, aspect |
| Suno | music | style line, title, tagged lyrics |
| ElevenLabs | voice | voice note + voiceover script |

The list lives in `lib/targets.ts`. Add a tool by adding an entry with its prompt guidance.

**The writer itself** needs one LLM. Gemini's free tier works with no card:

1. Get a key at https://aistudio.google.com/apikey
2. Put it in `.env.local` as `GEMINI_API_KEY=...`
3. `npm run dev`

If only `ANTHROPIC_API_KEY` is set, Claude writes the prompts instead (paid per token, small amounts). With no key the page runs in demo mode and says so.

## 2. Image agent (`/agent`) — paid path

Claude art-directs, GPT Image renders, Claude critiques and revises until the work clears a bar. Needs `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`; both are paid. Quick mode (brief → prompt → image) is the default; the critique loop is a mode switch. Without keys it shows placeholder images and a banner.

```
brief ──► art director (Claude) ──► spec ──► GPT Image ──► candidates
                 ▲                                            │
                 └──── direction ──── critic (Claude, vision) ◄┘
```

## Run

```
npm install
cp .env.example .env.local     # add whichever keys you have
npm run dev                    # http://localhost:3000
```

## Files

| File | Role |
|---|---|
| `lib/targets.ts` | The tools and how to write for each |
| `lib/promptpack.ts` | Prompt-writer system prompt, output schema, demo output |
| `lib/llm.ts` | One JSON call on Gemini (free) or Claude |
| `app/api/prompts` | GET status, POST brief → prompt pack |
| `lib/brand.ts` | Limelight brand + craft rules, shared by both tools |
| `lib/agent.ts`, `lib/claude.ts`, `lib/image.ts` | The image agent loop |
| `app/api/agent` | Streams the image agent's events |

## Env

| Var | Notes |
|---|---|
| `GEMINI_API_KEY` | Free. Prompt writer. |
| `GEMINI_MODEL` | default `gemini-3.6-flash` |
| `LLM_PROVIDER` | `gemini` or `anthropic`; empty = auto |
| `ANTHROPIC_API_KEY` | Paid. Image agent, or prompt writer if no Gemini key |
| `OPENAI_API_KEY` | Paid. Image agent renders |
| `OPENAI_IMAGE_MODEL` | default `gpt-image-2.5-flare` |
| `AGENT_MOCK` | `1` forces placeholder images in the image agent |
