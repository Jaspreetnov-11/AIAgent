import { NextResponse } from "next/server";
import { runDesignAgent } from "@/lib/agent";
import { runMockAgent } from "@/lib/mock";
import { DesignSpecSchema, type AgentInput, type AgentOptions, type ReferenceImage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_ROUNDS = Number(process.env.AGENT_MAX_ROUNDS ?? 4);
const MAX_CANDIDATES = Number(process.env.AGENT_MAX_CANDIDATES ?? 3);

const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

function parseInput(body: any): AgentInput {
  const brief = String(body?.brief ?? "").trim();
  if (!brief) throw new Error("Brief is empty.");

  const o = body?.options ?? {};
  const options: AgentOptions = {
    maxRounds: clampInt(o.maxRounds, 1, MAX_ROUNDS, Math.min(3, MAX_ROUNDS)),
    candidates: clampInt(o.candidates, 1, MAX_CANDIDATES, Math.min(2, MAX_CANDIDATES)),
    quality: (["low", "medium", "high"] as const).includes(o.quality) ? o.quality : "high",
    threshold: Math.min(10, Math.max(0, Number(o.threshold) || 8)),
  };

  const references: ReferenceImage[] = Array.isArray(body?.references)
    ? body.references.slice(0, 4).map((r: any, i: number) => ({
        name: String(r?.name ?? `reference-${i + 1}`).slice(0, 80),
        dataUrl: String(r?.dataUrl ?? ""),
        role: (["logo", "style", "content"] as const).includes(r?.role) ? r.role : "style",
        useInRender: !!r?.useInRender,
      }))
    : [];
  for (const r of references) {
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(r.dataUrl)) throw new Error(`Reference "${r.name}" is not a PNG/JPEG/WebP/GIF.`);
  }

  let resume: AgentInput["resume"];
  if (body?.resume) {
    const spec = DesignSpecSchema.parse(body.resume.spec);
    const feedback = String(body.resume.feedback ?? "").trim();
    if (!feedback) throw new Error("Feedback is empty.");
    const image = typeof body.resume.image === "string" && body.resume.image.startsWith("data:image/") ? body.resume.image : undefined;
    resume = { spec, feedback, image };
  }

  return { brief, references, options, resume };
}

/** POST: runs the loop and streams newline-delimited JSON events. */
export async function POST(req: Request) {
  let input: AgentInput;
  try {
    input = parseInput(await req.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request." }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const run = process.env.AGENT_MOCK === "1" ? runMockAgent : runDesignAgent;
        for await (const ev of run(input)) {
          controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
          if (req.signal.aborted) break;
        }
      } catch (e) {
        controller.enqueue(enc.encode(JSON.stringify({ type: "error", round: 0, message: e instanceof Error ? e.message : String(e) }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
