import { NextResponse } from "next/server";
import { generateJSON, pickProvider } from "@/lib/llm";
import { mockPack, normalizePack, PROMPT_WRITER_SYSTEM, PromptPackSchema, promptWriterUser } from "@/lib/promptpack";
import { DEFAULT_TARGETS, TARGETS } from "@/lib/targets";

export const runtime = "nodejs";
export const maxDuration = 120;

/** GET: which writer will be used, and the list of tools. */
export async function GET() {
  const { provider, model } = pickProvider();
  return NextResponse.json({
    provider,
    model,
    targets: TARGETS.map(({ id, name, kind, url, free }) => ({ id, name, kind, url, free })),
    defaults: DEFAULT_TARGETS,
  });
}

/** POST { brief, targets: string[] } -> prompt pack */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const brief = String(body?.brief ?? "").trim();
  if (!brief) return NextResponse.json({ error: "Brief is empty." }, { status: 400 });

  const valid = new Set(TARGETS.map((t) => t.id));
  const ids: string[] = (Array.isArray(body?.targets) ? body.targets : DEFAULT_TARGETS).filter((id: unknown) => typeof id === "string" && valid.has(id));
  if (!ids.length) return NextResponse.json({ error: "Pick at least one tool." }, { status: 400 });

  const { provider } = pickProvider();
  if (provider === "none") return NextResponse.json({ pack: mockPack(brief, ids), provider, model: "", demo: true });

  try {
    const { data, model } = await generateJSON({ system: PROMPT_WRITER_SYSTEM, user: promptWriterUser(brief, ids), schema: PromptPackSchema });
    return NextResponse.json({ pack: normalizePack(data, ids), provider, model, demo: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Prompt writer failed." }, { status: 502 });
  }
}
