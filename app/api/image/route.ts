import { NextResponse } from "next/server";
import { renderCandidates } from "@/lib/image";
import { DesignSpecSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Manual mode: render a spec once. Body: { spec, n?, quality? } */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = DesignSpecSchema.safeParse(body?.spec);
  if (!parsed.success) return NextResponse.json({ error: "Body must contain a valid spec." }, { status: 400 });

  try {
    const images = await renderCandidates({
      spec: parsed.data,
      n: Math.min(3, Math.max(1, Number(body?.n) || 1)),
      quality: (["low", "medium", "high"] as const).includes(body?.quality) ? body.quality : "high",
    });
    return NextResponse.json({ images });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Image generation failed." }, { status: 502 });
  }
}
