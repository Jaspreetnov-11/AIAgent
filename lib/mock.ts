import type { AgentEvent, AgentInput, DesignSpec, ScoredCritique } from "./types";

/**
 * AGENT_MOCK=1: runs the same event sequence with no API calls, so the UI can be
 * developed and demoed without spending on renders. Images are flat SVG placeholders.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function svg(size: DesignSpec["size"], label: string, tone: string) {
  const [w, h] = size.split("x").map(Number);
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${tone}"/>
  <circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.05}" fill="#FCD30A"/>
  <text x="${w * 0.08}" y="${h * 0.85}" font-family="Helvetica, Arial" font-weight="800" font-size="${Math.min(w, h) * 0.09}" fill="#fff">${label}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
}

export async function* runMockAgent(input: AgentInput): AsyncGenerator<AgentEvent> {
  const { options, resume } = input;
  const base: DesignSpec = resume?.spec ?? {
    concept: "One clay diya on black, its flame the only warmth in the frame.",
    prompt: "Editorial still-life photograph, 85mm lens, single lit clay diya on a matte black surface, warm flame light falling off fast into darkness, generous empty space in the upper two thirds for the headline, tiny yellow #FCD30A dot accent bottom right where the logo will sit. Devanagari headline \"शुभ दीपावली\" set large, white, top-left.",
    size: "1024x1536",
    text_to_render: ["शुभ दीपावली"],
    palette: ["#000000", "#ffffff", "#FCD30A", "#c9782a"],
    avoid: ["fireworks", "rangoli clip-art", "multiple diyas", "gold gradients", "extra text"],
    rationale: "One object, one light source, one line of type. The brief asked for warmth and room for the logo; darkness gives both.",
  };
  const tones = ["#1a1a1a", "#2b2320", "#101820"];

  for (let round = 1; round <= options.maxRounds; round++) {
    const last = round === options.maxRounds;
    yield { type: "status", round, message: round === 1 && !resume ? "Art director is reading the brief…" : "Art director is revising…" };
    await sleep(600);
    const spec: DesignSpec = { ...base, rationale: round === 1 ? base.rationale : `Round ${round}: headline moved up and enlarged, flame warmer, as directed.` };
    yield { type: "spec", round, source: round === 1 ? (resume ? "human" : "plan") : "revise", spec };

    yield { type: "status", round, message: `Rendering ${options.candidates} candidate(s)…` };
    for (let i = 0; i < options.candidates; i++) {
      await sleep(500);
      yield { type: "image", round, index: i, dataUrl: svg(spec.size, `R${round} · C${i + 1}`, tones[(round + i) % tones.length]) };
    }

    if (options.mode === "quick") {
      yield { type: "done", round, index: 0, dataUrl: svg(spec.size, `R${round} · C1`, tones[round % tones.length]), spec, total: 0, reason: "quick" };
      return;
    }

    yield { type: "status", round, message: "Creative director is reviewing…" };
    await sleep(800);
    const lift = (round - 1) * 1.2;
    const candidates = Array.from({ length: options.candidates }, (_, i) => {
      const s = { brief: Math.min(10, 6.5 + lift + i * 0.4), brand: 8, text: Math.min(10, 5 + lift * 1.5), composition: Math.min(10, 6 + lift), craft: 8.5 };
      const total = Math.round((s.brief * 0.3 + s.text * 0.25 + s.brand * 0.15 + s.composition * 0.15 + s.craft * 0.15) * 10) / 10;
      return {
        index: i, ...s, total,
        verdict: total >= 8 ? "Ships. Headline reads cleanly and the flame carries the frame." : "Right idea, but the headline is too small and one matra is wrong.",
        issues: total >= 8 ? [] : ["Headline occupies less than 10% of height", "Second glyph of दीपावली rendered with a broken matra"],
      };
    });
    const best = candidates.reduce((a, b) => (b.total > a.total ? b : a));
    const pass = best.total >= options.threshold;
    const critique: ScoredCritique = {
      candidates, best_index: best.index, best_total: best.total, pass,
      direction: pass ? [] : ["Set the headline at least 3x larger, top third", "Spell the headline once more, letter by letter, in the prompt", "Warm the flame to amber and let the falloff go darker"],
    };
    yield { type: "critique", round, critique };
    if (pass || last) {
      yield { type: "done", round, index: best.index, dataUrl: svg(spec.size, `R${round} · C${best.index + 1}`, tones[(round + best.index) % tones.length]), spec, total: best.total, reason: pass ? "passed" : "max_rounds" };
      return;
    }
  }
}
