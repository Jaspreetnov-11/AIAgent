import { NextResponse } from "next/server";
import { generateJSON, pickProvider } from "@/lib/llm";
import { CONTENT_SYSTEM, ContentPackSchema, contentUser, LANGS, mockContent, PLATFORMS, TONES } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ platforms: PLATFORMS.map(({ id, name, sub }) => ({ id, name, sub })), tones: TONES, langs: LANGS });
}

/** POST { brief, platforms, tone, lang, ads, variants } -> content pack */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const brief = String(body?.brief ?? "").trim();
  if (!brief) return NextResponse.json({ error: "Brief is empty." }, { status: 400 });

  const valid = new Set(PLATFORMS.map((p) => p.id));
  const platforms: string[] = (Array.isArray(body?.platforms) ? body.platforms : []).filter((id: unknown) => typeof id === "string" && valid.has(id));
  if (!platforms.length) return NextResponse.json({ error: "Pick at least one platform." }, { status: 400 });

  const tone = (TONES as readonly string[]).includes(body?.tone) ? body.tone : "Editorial";
  const lang = (LANGS as readonly string[]).includes(body?.lang) ? body.lang : "English";
  const ads = !!body?.ads;
  const variants = Math.min(3, Math.max(1, Number(body?.variants) || 1));

  const { provider } = pickProvider();
  if (provider === "none") return NextResponse.json({ pack: mockContent(brief, platforms, ads), demo: true });

  try {
    const { data } = await generateJSON({ system: CONTENT_SYSTEM, user: contentUser({ brief, platforms, tone, lang, ads, variants }), schema: ContentPackSchema });
    const posts = data.posts.filter((p) => valid.has(p.platform));
    return NextResponse.json({ pack: { ...data, posts, ads: ads ? data.ads : [] }, demo: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Content writer failed." }, { status: 502 });
  }
}
