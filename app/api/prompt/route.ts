import { NextResponse } from "next/server";
import { planDesign, reviseDesign } from "@/lib/claude";
import { DesignSpecSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Manual mode: one art-director call, no loop.
 *   { brief }                                  -> fresh spec
 *   { brief, previous, feedback, image? }      -> revised spec
 */
export async function POST(req: Request) {
  const { brief, previous, feedback, image } = await req.json();
  if (!brief?.trim()) return NextResponse.json({ error: "Brief is empty." }, { status: 400 });

  try {
    if (previous) {
      const spec = DesignSpecSchema.parse(previous);
      if (!feedback?.trim()) return NextResponse.json({ error: "Feedback is empty." }, { status: 400 });
      return NextResponse.json(await reviseDesign({ brief, previous: spec, direction: [feedback], from: "client", image }));
    }
    return NextResponse.json(await planDesign(brief));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Prompt writer failed." }, { status: 502 });
  }
}
