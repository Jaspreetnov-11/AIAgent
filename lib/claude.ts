import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ART_DIRECTOR_SYSTEM, CRITIC_SYSTEM } from "./brand";
import {
  CritiqueSchema,
  DesignSpecSchema,
  type Critique,
  type DesignSpec,
  type ReferenceImage,
  type ScoredCritique,
} from "./types";

// Lazy so `next build` (no keys) can import the route modules.
let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max";

type Block = Anthropic.ImageBlockParam | Anthropic.TextBlockParam;
type MediaType = Anthropic.Base64ImageSource["media_type"];

/** data:image/png;base64,... -> Anthropic image block */
export function imageBlock(dataUrl: string): Anthropic.ImageBlockParam {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("Image must be a PNG, JPEG, WebP or GIF data URL.");
  return { type: "image", source: { type: "base64", media_type: m[1] as MediaType, data: m[2] } };
}

function referenceBlocks(refs: ReferenceImage[] = []): Block[] {
  return refs.flatMap((r, i): Block[] => [
    {
      type: "text",
      text: `Reference ${i + 1} (${r.role}${r.useInRender ? ", will be handed to the renderer for compositing" : ", for your eyes only"}): ${r.name}`,
    },
    imageBlock(r.dataUrl),
  ]);
}

function system(text: string): Anthropic.TextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

function assertOk(res: Anthropic.Message, what: string) {
  if (res.stop_reason === "refusal") {
    const why = res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : ".";
    throw new Error(`Claude declined to ${what}${why}`);
  }
  if (res.stop_reason === "max_tokens") throw new Error(`Claude ran out of tokens while trying to ${what}.`);
}

/** Round 1: brief (+ optional references) -> design spec */
export async function planDesign(brief: string, refs?: ReferenceImage[]): Promise<DesignSpec> {
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: system(ART_DIRECTOR_SYSTEM),
    output_config: { effort: EFFORT, format: zodOutputFormat(DesignSpecSchema) },
    messages: [
      {
        role: "user",
        content: [...referenceBlocks(refs), { type: "text", text: `Brief:\n${brief}\n\nWrite the design spec.` }],
      },
    ],
  });
  assertOk(res, "write the design spec");
  if (!res.parsed_output) throw new Error("Art director returned an unparseable spec.");
  return res.parsed_output;
}

/** Later rounds: previous spec + direction (from the critic or the client) + the render it refers to -> revised spec */
export async function reviseDesign(args: {
  brief: string;
  previous: DesignSpec;
  direction: string[];
  from: "critic" | "client";
  image?: string;
  refs?: ReferenceImage[];
}): Promise<DesignSpec> {
  const { brief, previous, direction, from, image, refs } = args;
  const content: Block[] = [...referenceBlocks(refs)];
  if (image) content.push({ type: "text", text: "The render this feedback is about:" }, imageBlock(image));
  content.push({
    type: "text",
    text:
      `Brief:\n${brief}\n\nCurrent spec:\n${JSON.stringify(previous, null, 2)}\n\n` +
      `Feedback from the ${from}:\n${direction.map((d) => `- ${d}`).join("\n")}\n\nRevise the spec.`,
  });
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: system(ART_DIRECTOR_SYSTEM),
    output_config: { effort: EFFORT, format: zodOutputFormat(DesignSpecSchema) },
    messages: [{ role: "user", content }],
  });
  assertOk(res, "revise the design spec");
  if (!res.parsed_output) throw new Error("Art director returned an unparseable revision.");
  return res.parsed_output;
}

/** Look at every candidate for this round and score them. */
export async function critiqueCandidates(args: {
  brief: string;
  spec: DesignSpec;
  images: string[];
  refs?: ReferenceImage[];
  threshold: number;
}): Promise<ScoredCritique> {
  const { brief, spec, images, refs, threshold } = args;
  const content: Block[] = [...referenceBlocks(refs)];
  images.forEach((img, i) => content.push({ type: "text", text: `Candidate ${i}:` }, imageBlock(img)));
  const required = spec.text_to_render.length ? spec.text_to_render.map((t) => JSON.stringify(t)).join(", ") : "none";
  content.push({
    type: "text",
    text:
      `Brief:\n${brief}\n\nSpec the renderer was given:\n${JSON.stringify(spec, null, 2)}\n\n` +
      `Required text (verbatim): ${required}\n\n` +
      `Score all ${images.length} candidate(s), pick the best, and give direction only if another round would clearly beat it.`,
  });
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: system(CRITIC_SYSTEM),
    output_config: { effort: EFFORT, format: zodOutputFormat(CritiqueSchema) },
    messages: [{ role: "user", content }],
  });
  assertOk(res, "critique the candidates");
  if (!res.parsed_output) throw new Error("Critic returned an unparseable review.");
  return scoreCritique(res.parsed_output, spec, images.length, threshold);
}

/** Weighted totals are computed here, not by the model, so they are consistent across rounds. */
export function scoreCritique(c: Critique, spec: DesignSpec, n: number, threshold: number): ScoredCritique {
  const needsText = spec.text_to_render.length > 0;
  const w = needsText
    ? { brief: 0.3, text: 0.25, brand: 0.15, composition: 0.15, craft: 0.15 }
    : { brief: 0.35, text: 0.05, brand: 0.2, composition: 0.2, craft: 0.2 };
  const clamp = (x: number) => Math.max(0, Math.min(10, Number.isFinite(x) ? x : 0));

  const candidates = c.candidates
    .filter((k) => k.index >= 0 && k.index < n)
    .map((k) => {
      const s = {
        brief: clamp(k.brief),
        brand: clamp(k.brand),
        text: clamp(k.text),
        composition: clamp(k.composition),
        craft: clamp(k.craft),
      };
      const raw = s.brief * w.brief + s.text * w.text + s.brand * w.brand + s.composition * w.composition + s.craft * w.craft;
      return { ...k, ...s, total: Math.round(raw * 10) / 10 };
    });
  if (!candidates.length) throw new Error("Critic did not score any candidate.");

  const top = candidates.reduce((a, b) => (b.total > a.total ? b : a));
  const best_index = candidates.some((k) => k.index === c.best_index) ? c.best_index : top.index;
  const best_total = candidates.find((k) => k.index === best_index)!.total;
  const pass = best_total >= threshold || c.direction.length === 0;
  return { candidates, best_index, best_total, direction: c.direction, pass };
}
