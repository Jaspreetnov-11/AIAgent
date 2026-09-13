import { z } from "zod";

// ---------- Design spec (what the art director hands to the renderer) ----------

export const SizeSchema = z.enum(["1024x1024", "1024x1536", "1536x1024"]);
export type Size = z.infer<typeof SizeSchema>;

export const DesignSpecSchema = z.object({
  concept: z.string().describe("The single visual idea in one sentence. What a viewer should get in one second."),
  prompt: z.string().describe("Production-ready prompt for the image model, 80-200 words. Concrete: subject, composition, lens/lighting or illustration style, palette, mood, where negative space sits. Any required text is spelled out in double quotes."),
  size: SizeSchema.describe("1024x1024 post, 1024x1536 story/poster, 1536x1024 banner"),
  text_to_render: z.array(z.string()).describe("Exact strings that must appear in the image, verbatim. Empty array if none."),
  palette: z.array(z.string()).describe("3-5 hex colours in priority order"),
  avoid: z.array(z.string()).describe("Things the image must not contain (clichés, clutter, wrong cultural cues, extra text)."),
  rationale: z.string().describe("Why this answers the brief, one or two sentences"),
});
export type DesignSpec = z.infer<typeof DesignSpecSchema>;

// ---------- Critique (what the critic returns after looking at renders) ----------

export const CandidateScoreSchema = z.object({
  index: z.number().int().describe("0-based index of the candidate image, in the order given"),
  brief: z.number().describe("0-10: does it deliver what the brief asked for?"),
  brand: z.number().describe("0-10: follows the brand rules?"),
  text: z.number().describe("0-10: required text present, spelled exactly, legible, no stray text. 10 if no text was required and none appears."),
  composition: z.number().describe("0-10: hierarchy, balance, negative space where copy/logo must go, crop"),
  craft: z.number().describe("0-10: render quality - anatomy, hands, artefacts, banding, muddy detail"),
  verdict: z.string().describe("One sentence, plain and specific"),
  issues: z.array(z.string()).describe("Concrete defects, most severe first. Empty if none."),
});

export const CritiqueSchema = z.object({
  candidates: z.array(CandidateScoreSchema),
  best_index: z.number().int().describe("Index of the strongest candidate"),
  direction: z.array(z.string()).describe("If another round is needed: 2-5 specific changes for the art director. Empty if the best candidate ships as-is."),
});
export type Critique = z.infer<typeof CritiqueSchema>;

export type ScoredCandidate = z.infer<typeof CandidateScoreSchema> & { total: number };
export type ScoredCritique = Omit<Critique, "candidates"> & { candidates: ScoredCandidate[]; pass: boolean; best_total: number };

// ---------- Agent I/O ----------

export type ReferenceImage = {
  name: string;
  dataUrl: string;          // data:image/png;base64,...
  role: "logo" | "style" | "content";
  useInRender: boolean;     // also hand it to the image model (images.edit) so it can composite it
};

export type AgentOptions = {
  mode: "quick" | "loop";   // quick: brief -> spec -> render, done. loop: adds critique + revise rounds.
  maxRounds: number;        // 1-4
  candidates: number;       // 1-3 renders per round
  quality: "low" | "medium" | "high";
  threshold: number;        // 0-10, round passes when best total >= threshold
};

export type AgentInput = {
  brief: string;
  references?: ReferenceImage[];
  options: AgentOptions;
  // Human-in-the-loop continuation: previous best + a note from the user.
  resume?: { spec: DesignSpec; feedback: string; image?: string };
};

export type AgentEvent =
  | { type: "status"; round: number; message: string }
  | { type: "spec"; round: number; source: "plan" | "revise" | "human"; spec: DesignSpec }
  | { type: "image"; round: number; index: number; dataUrl: string }
  | { type: "image_error"; round: number; message: string }
  | { type: "critique"; round: number; critique: ScoredCritique }
  | { type: "done"; round: number; index: number; dataUrl: string; spec: DesignSpec; total: number; reason: "passed" | "max_rounds" | "quick" }
  | { type: "error"; round: number; message: string };
