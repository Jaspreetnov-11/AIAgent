import { critiqueCandidates, planDesign, reviseDesign } from "./claude";
import { renderCandidates } from "./image";
import type { AgentEvent, AgentInput, DesignSpec } from "./types";

type Best = { round: number; index: number; dataUrl: string; spec: DesignSpec; total: number };

/**
 * The design agent loop.
 *
 *   plan (Claude) -> render N candidates (GPT Image) -> critique (Claude, vision)
 *        ^                                                     |
 *        +---------------- revise (Claude) <-- direction ------+
 *
 * Stops when the critic's best candidate clears the threshold, when the critic has no
 * direction left, or when maxRounds is hit (then the best candidate seen wins).
 * With `resume`, the loop starts from a previous spec plus a note from the client.
 */
export async function* runDesignAgent(input: AgentInput): AsyncGenerator<AgentEvent> {
  const { brief, references: refs, options, resume } = input;

  let round = 0;
  let spec: DesignSpec | null = resume?.spec ?? null;
  let direction: string[] = resume ? [resume.feedback] : [];
  let from: "critic" | "client" = resume ? "client" : "critic";
  let lastImage: string | undefined = resume?.image;
  let best: Best | null = null;

  try {
    while (round < options.maxRounds) {
      round++;

      // 1. Spec: plan on the first pass, revise on later ones.
      if (!spec) {
        yield { type: "status", round, message: "Art director is reading the brief…" };
        spec = await planDesign(brief, refs);
        yield { type: "spec", round, source: "plan", spec };
      } else {
        yield { type: "status", round, message: from === "client" ? "Art director is working your note in…" : "Art director is revising…" };
        spec = await reviseDesign({ brief, previous: spec, direction, from, image: lastImage, refs });
        yield { type: "spec", round, source: from === "client" ? "human" : "revise", spec };
      }

      // 2. Render.
      yield { type: "status", round, message: `Rendering ${options.candidates} candidate${options.candidates > 1 ? "s" : ""}…` };
      let images: string[];
      try {
        images = await renderCandidates({ spec, n: options.candidates, quality: options.quality, refs });
      } catch (e) {
        yield { type: "image_error", round, message: e instanceof Error ? e.message : "Render failed." };
        if (!best) throw e;
        break;
      }
      for (let i = 0; i < images.length; i++) yield { type: "image", round, index: i, dataUrl: images[i] };

      // 3. Critique.
      yield { type: "status", round, message: "Creative director is reviewing…" };
      const critique = await critiqueCandidates({ brief, spec, images, refs, threshold: options.threshold });
      yield { type: "critique", round, critique };

      const pick: Best = { round, index: critique.best_index, dataUrl: images[critique.best_index], spec, total: critique.best_total };
      if (!best || pick.total > best.total) best = pick;

      if (critique.pass) {
        yield { type: "done", ...pick, reason: "passed" };
        return;
      }
      direction = critique.direction;
      from = "critic";
      lastImage = pick.dataUrl;
    }

    if (best) yield { type: "done", ...best, reason: "max_rounds" };
  } catch (e) {
    yield { type: "error", round, message: e instanceof Error ? e.message : String(e) };
  }
}
