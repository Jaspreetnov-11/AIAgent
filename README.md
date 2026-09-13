# Limelight design agent (Claude × GPT Image)

A closed-loop design agent. Claude plays two roles, GPT Image renders, and the loop keeps going until the work clears a quality bar or you step in.

```
brief ──► art director (Claude) ──► spec ──► renderer (GPT Image) ──► N candidates
                 ▲                                                        │
                 │ direction                                              ▼
                 └──────────── creative director / critic (Claude, vision) ◄┘
                                          │
                                  score ≥ threshold ──► done
                                  else ──► next round (max N)
                       your note ──► "Push it further" ──► art director again
```

## Run

```
npm install
cp .env.example .env.local     # add both API keys
npm run dev                    # http://localhost:3000
```

## What each part does

| File | Role |
|---|---|
| `lib/brand.ts` | Brand + craft rules. The stable, cached prefix of every Claude call. Edit this to retrain the agent's taste. |
| `lib/types.ts` | Zod schemas for the design spec and the critique, plus the event types streamed to the UI. |
| `lib/claude.ts` | `planDesign`, `reviseDesign`, `critiqueCandidates`. Structured outputs via `messages.parse`, references and renders passed as images. Weighted totals are computed in code so scores are comparable across rounds. |
| `lib/image.ts` | `renderCandidates`. Builds the final prompt from the spec (text, palette, avoid-list) and calls `images.generate`, or `images.edit` when a reference is flagged for compositing (logo, product). |
| `lib/agent.ts` | The loop as an async generator: plan → render → critique → revise. Stops on pass, on empty direction, or at max rounds (best seen wins). Accepts `resume` for a human note. |
| `app/api/agent` | POST, streams newline-delimited JSON events. Clamps rounds/candidates against `AGENT_MAX_*` so a client cannot run up the bill. |
| `app/api/prompt`, `app/api/image` | Manual, single-step endpoints if you want to script the pieces yourself. |
| `app/page.tsx` | Brief, references, loop settings, live candidates, approved result, round-by-round scorecards, and a feedback box that re-enters the loop. |

## How the critic scores

Five dimensions, 0–10 each: brief fidelity, brand, text accuracy, composition, craft. The total is weighted in `scoreCritique`; text carries 25 % when the spec requires rendered text and almost nothing otherwise. A round passes when the best total ≥ the threshold (default 8) or when the critic has no direction left.

Text accuracy is checked letter by letter, because image models misspell non-Latin scripts. The art director is told to keep rendered text minimal and to leave space for typesetting when the brief allows.

## Settings

| Env | Default | Notes |
|---|---|---|
| `ANTHROPIC_MODEL` | `claude-opus-5` | Both Claude roles. |
| `ANTHROPIC_EFFORT` | `high` | `low`–`max`. `medium` is a fine cost saver for the critic. |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-flare` | `gpt-image-2.5-sunburst` for premium or edit-heavy work. |
| `AGENT_MAX_ROUNDS` / `AGENT_MAX_CANDIDATES` | `4` / `3` | Hard caps enforced server-side. |

Per run (in the UI): rounds, candidates per round, render quality, and the ship threshold.

## Cost shape

Each round is one art-director call, one render call with `n` candidates, and one critique call carrying `n` images. A 3-round, 2-candidate run at high quality is roughly 6 image renders and 6 Claude calls, worst case.

## Next steps

- Persist runs (spec, scores, images) so the critic can learn house preferences from approved work.
- Split the critic across models (a cheap first pass, Opus for the final call) once you have an eval set of approved and rejected renders.
- Add a mask tool so the client note can target a region and route through `images.edit` with a mask.
