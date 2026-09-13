import OpenAI, { toFile } from "openai";
import type { DesignSpec, ReferenceImage } from "./types";

// Lazy so `next build` (no keys) can import the route modules.
let _openai: OpenAI | null = null;
const openai = () => (_openai ??= new OpenAI());
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-flare";

function dataUrlToFile(dataUrl: string, name: string) {
  const m = /^data:(image\/[a-z]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error(`Reference "${name}" is not an image data URL.`);
  const sub = m[1].split("/")[1];
  const ext = sub === "jpeg" ? "jpg" : sub;
  const safe = name.replace(/[^a-z0-9._-]/gi, "_");
  return toFile(Buffer.from(m[2], "base64"), `${safe}.${ext}`, { type: m[1] });
}

/** Turn the spec into the final prompt string the renderer sees. */
export function renderPrompt(spec: DesignSpec): string {
  const parts = [spec.prompt.trim()];
  if (spec.text_to_render.length) {
    const quoted = spec.text_to_render.map((t) => `"${t}"`).join(", ");
    parts.push(`The image must contain exactly this text, spelled precisely, and no other text: ${quoted}.`);
  }
  if (spec.palette.length) parts.push(`Palette: ${spec.palette.join(", ")}.`);
  if (spec.avoid.length) parts.push(`Do not include: ${spec.avoid.join("; ")}.`);
  return parts.join("\n\n");
}

/**
 * Render n candidates for a spec. If any reference is flagged useInRender we go through
 * images.edit so the model can composite the real logo / product; otherwise plain generate.
 * Returns PNG data URLs.
 */
export async function renderCandidates(args: {
  spec: DesignSpec;
  n: number;
  quality: "low" | "medium" | "high";
  refs?: ReferenceImage[];
}): Promise<string[]> {
  const { spec, n, quality, refs = [] } = args;
  const prompt = renderPrompt(spec);
  const renderRefs = refs.filter((r) => r.useInRender);

  const result = renderRefs.length
    ? await openai().images.edit({
        model: MODEL,
        image: await Promise.all(renderRefs.map((r) => dataUrlToFile(r.dataUrl, r.name))),
        prompt:
          `${prompt}\n\nUse the supplied reference image(s) as-is ` +
          `(${renderRefs.map((r) => `${r.name}: ${r.role}`).join(", ")}); do not redraw or distort them.`,
        size: spec.size,
        quality,
        n,
      })
    : await openai().images.generate({ model: MODEL, prompt, size: spec.size, quality, n, output_format: "png" });

  const images = (result.data ?? [])
    .map((d) => d.b64_json)
    .filter((b): b is string => !!b)
    .map((b) => `data:image/png;base64,${b}`);
  if (!images.length) throw new Error("Renderer returned no images.");
  return images;
}
