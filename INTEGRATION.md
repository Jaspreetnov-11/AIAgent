# Integrating Prompt studio with Lighthouse

Three ways, from simplest to deepest. All of them work against the local URL now and against the deployed URL later.

| Where it runs | Base URL |
|---|---|
| Local (this machine) | `http://localhost:3000` |
| Deployed on Vercel | `https://<your-project>.vercel.app` (see "Deploy" below) |

## 1. Link or iframe (no code)

Open it in a new tab from Lighthouse's menu:

```
https://<base>/            Prompts
https://<base>/content     Content
https://<base>/schedule    Schedule
```

Or embed a tab inside a Lighthouse page. `?embed=1` hides the studio's own header and footer:

```html
<iframe
  src="https://<base>/content?embed=1"
  style="width:100%;height:calc(100vh - 80px);border:0;background:#070b11"
  allow="clipboard-write"
></iframe>
```

## 2. Call the API from Lighthouse's Express backend

Every agent is one `POST` with JSON in, JSON out. Set `STUDIO_API_KEY` in the studio's `.env.local` and send it as `x-api-key` so nobody else can spend your Gemini quota.

```js
// backend/services/studio.js
const STUDIO_URL = process.env.STUDIO_URL;      // e.g. https://prompt-studio.vercel.app
const STUDIO_KEY = process.env.STUDIO_API_KEY;  // same value as in the studio's .env.local

async function studio(path, body) {
  const r = await fetch(`${STUDIO_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": STUDIO_KEY },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Studio ${r.status}`);
  return data;
}

module.exports = {
  prompts:  (brief, targets)              => studio("/api/prompts",  { brief, targets }),
  content:  (brief, platforms, opts = {}) => studio("/api/content",  { brief, platforms, ...opts }),
  schedule: (brief, platforms, opts = {}) => studio("/api/schedule", { brief, platforms, ...opts }),
};
```

Then in a route:

```js
const studio = require("../services/studio");

router.post("/campaigns/:id/content", async (req, res) => {
  const { brief } = req.body;
  const { pack } = await studio.content(brief, ["instagram", "linkedin"], { tone: "Warm", lang: "Hinglish", ads: true });
  // save pack.posts / pack.ads to Supabase against the campaign
  res.json(pack);
});
```

### Endpoints

**`GET /api/prompts`** → `{ provider, model, targets: [{id, name, kind, url, free}], defaults }`
Use it to know whether the studio has a key (`provider` is `gemini`, `anthropic` or `none`) and to list tools.

**`POST /api/prompts`**
```json
{ "brief": "Diwali greeting, one diya, Hindi headline", "targets": ["gpt_image", "nano_banana", "suno"] }
```
→
```json
{ "pack": { "concept": "...", "targets": [ { "id": "gpt_image", "prompt": "...", "settings": [{"label":"Aspect","value":"9:16"}], "extras": [], "tip": "..." } ] }, "provider": "gemini", "demo": false }
```
Tool ids: `gpt_image`, `nano_banana`, `ideogram`, `higgsfield`, `kling`, `suno`, `elevenlabs`.

**`GET /api/content`** → `{ platforms: [{id, name, sub}], tones, langs }`

**`POST /api/content`**
```json
{ "brief": "...", "platforms": ["instagram", "facebook", "linkedin"], "tone": "Editorial", "lang": "English", "ads": false, "variants": 1 }
```
→
```json
{ "pack": { "angle": "...", "posts": [ { "platform": "instagram", "format": "Reel", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#..."], "visual": "...", "best_time": "Fri 19:00" } ], "ads": [ { "platform": "facebook", "headline": "...", "primary_text": "...", "description": "...", "cta": "Learn more" } ] }, "demo": false }
```
Platform ids: `instagram`, `facebook`, `linkedin`, `x`, `youtube_shorts`, `whatsapp`. Tones: Editorial, Warm, Bold, Playful, Corporate. Langs: English, Hindi, Hinglish, Punjabi.

**`POST /api/schedule`**
```json
{ "brief": "...", "platforms": ["instagram", "facebook"], "days": 14, "perWeek": 3, "lang": "English", "start": "2026-10-01" }
```
→
```json
{ "plan": { "campaign": "...", "strategy": "...", "posts": [ { "day": 0, "time": "19:00", "platform": "instagram", "format": "Carousel", "pillar": "Launch", "title": "...", "caption": "...", "hashtags": ["#..."], "asset": "..." } ] }, "start": "2026-10-01", "demo": false }
```
`day` is an offset from `start` (0 = start date). `days` is 7, 14 or 30.

Errors come back as `{ "error": "..." }` with 400 (bad input), 401 (wrong key), or 502 (model failed, retry).

### CORS

If Lighthouse's **frontend** (browser) calls the studio directly instead of going through Express, set the studio's `ALLOWED_ORIGINS` to Lighthouse's origin(s), for example:

```
ALLOWED_ORIGINS=https://lighthouse.vercel.app,http://localhost:3001
```

Empty means any origin. Preflight (`OPTIONS`) is handled.

## 3. Copy the agents into Lighthouse itself

If you would rather not run two apps, the studio has no database and no state; each agent is one file plus one route:

| Agent | Copy these |
|---|---|
| Prompts | `lib/brand.ts`, `lib/llm.ts`, `lib/targets.ts`, `lib/promptpack.ts`, `app/api/prompts/route.ts` |
| Content | `lib/brand.ts`, `lib/llm.ts`, `lib/content.ts`, `app/api/content/route.ts` |
| Schedule | `lib/brand.ts`, `lib/llm.ts`, `lib/content.ts`, `lib/schedule.ts`, `app/api/schedule/route.ts` |

They need `zod` and (only for the Claude path) `@anthropic-ai/sdk`, which Lighthouse already has. `lib/llm.ts` reads `GEMINI_API_KEY` from the environment.

## Deploy (free) to get a public link

Vercel's hobby plan is free and Lighthouse already uses it.

```bash
npm i -g vercel
vercel login
vercel            # from C:\Users\user\Desktop\AIAgent, accept the defaults
```

Then in the Vercel dashboard → Project → Settings → Environment Variables, add:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | your free key |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `STUDIO_API_KEY` | any long random string; use the same in Lighthouse |
| `ALLOWED_ORIGINS` | Lighthouse's URL(s), only if the browser calls the API directly |

Redeploy (`vercel --prod`) and the URL Vercel prints is your link. Since the repo is on GitHub, you can instead import `Jaspreetnov-11/AIAgent` at vercel.com/new and every push to `main` deploys automatically.
