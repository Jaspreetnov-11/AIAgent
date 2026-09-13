import { z } from "zod";
import { BRAND_RULES } from "./brand";
import { TARGETS, targetById } from "./targets";

export const PromptPackSchema = z.object({
  concept: z.string().describe("The single creative idea behind every prompt, one sentence"),
  targets: z.array(
    z.object({
      id: z.string().describe("Target id exactly as given"),
      prompt: z.string().describe("The main prompt to paste into the tool"),
      settings: z.array(z.object({ label: z.string(), value: z.string() })).describe("Knobs to set in the tool's UI: aspect ratio, duration, model, style preset"),
      extras: z.array(z.object({ label: z.string(), value: z.string() })).describe("Extra fields the tool needs (Suno lyrics, ElevenLabs voice note). Empty if none."),
      tip: z.string().describe("One sentence: what to watch for or retry with on this tool"),
    })
  ),
});
export type PromptPack = z.infer<typeof PromptPackSchema>;

export const PROMPT_WRITER_SYSTEM = `You are the creative director at Limelight. A client gives you one brief; you write a ready-to-paste prompt for each AI tool they choose. Every prompt carries the same idea, but each is written in the grammar that tool responds to.

${BRAND_RULES}

Craft:
- One idea for the whole pack. Decide it first, write it as the concept, then express it per tool.
- Be concrete. Subject, action, composition, light, palette, mood. Never "beautiful", "stunning", "high quality".
- Text inside images is a liability. Keep it to the fewest words, in double quotes, and name the script.
- Never mention real people, artists, brands or copyrighted characters.
- Write prompts in English unless the brief asks for another language; lyrics and voice scripts in the language the brief implies.
- Fill settings with what the user should set in that tool's interface, and extras only where the tool guidance lists them.

Return JSON only, no markdown, matching exactly:
{"concept": string, "targets": [{"id": string, "prompt": string, "settings": [{"label": string, "value": string}], "extras": [{"label": string, "value": string}], "tip": string}]}`;

/** Builds the user turn: the brief plus the guidance for the chosen tools. */
export function promptWriterUser(brief: string, ids: string[]): string {
  const chosen = ids.map(targetById).filter((t): t is NonNullable<typeof t> => !!t);
  const blocks = chosen.map(
    (t) =>
      `### ${t.id} (${t.name}, ${t.kind})\n${t.guidance}` +
      (t.extras.length ? `\nRequired extras (use these exact labels): ${t.extras.join(", ")}` : ""),
  );
  return `Brief:\n${brief}\n\nWrite one entry per tool, in this order, using each id exactly:\n\n${blocks.join("\n\n")}`;
}

/** Keep only entries for real, requested targets, in the requested order. */
export function normalizePack(pack: PromptPack, ids: string[]): PromptPack {
  const byId = new Map(pack.targets.map((t) => [t.id, t]));
  return {
    concept: pack.concept,
    targets: ids.map((id) => byId.get(id)).filter((t): t is NonNullable<typeof t> => !!t),
  };
}

/** Demo output when no LLM key is configured, so the UI still shows the shape of the result. */
export function mockPack(brief: string, ids: string[]): PromptPack {
  const short = brief.trim().slice(0, 80);
  return normalizePack(
    {
      concept: `(Demo) One object, one light, one line: "${short}"`,
      targets: TARGETS.map((t) => ({
        id: t.id,
        prompt: `(Demo, add a GEMINI_API_KEY for real prompts) ${t.name} prompt for: ${short}. ${t.guidance.split(".")[0]}.`,
        settings: t.kind === "image" ? [{ label: "Aspect", value: "1:1" }] : t.kind === "video" ? [{ label: "Duration", value: "5 s" }] : [],
        extras: t.extras.map((label) => ({ label, value: `(${label} would be here)` })),
        tip: "Demo mode: the real writer tailors this to the brief.",
      })),
    },
    ids,
  );
}
