import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * One text-in, JSON-out call, on whichever provider has a key.
 *   gemini    - free tier, no card needed (default when GEMINI_API_KEY is set)
 *   anthropic - paid per token, best quality (used when only ANTHROPIC_API_KEY is set)
 *   none      - demo output
 */
export type Provider = "gemini" | "anthropic" | "none";

export function pickProvider(): { provider: Provider; model: string } {
  const forced = process.env.LLM_PROVIDER as Provider | undefined;
  const hasGemini = !!process.env.GEMINI_API_KEY?.trim();
  const hasClaude = !!process.env.ANTHROPIC_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const claudeModel = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

  if (forced === "gemini" && hasGemini) return { provider: "gemini", model: geminiModel };
  if (forced === "anthropic" && hasClaude) return { provider: "anthropic", model: claudeModel };
  if (hasGemini) return { provider: "gemini", model: geminiModel };
  if (hasClaude) return { provider: "anthropic", model: claudeModel };
  return { provider: "none", model: "" };
}

function stripFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

async function gemini(system: string, user: string, model: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message ?? res.statusText}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error(`Gemini returned no text${data?.candidates?.[0]?.finishReason ? ` (${data.candidates[0].finishReason})` : ""}.`);
  return text;
}

let _claude: Anthropic | null = null;

export async function generateJSON<S extends z.ZodTypeAny>(args: {
  system: string;
  user: string;
  schema: S;
}): Promise<{ data: z.infer<S>; provider: Provider; model: string }> {
  const { system, user, schema } = args;
  const { provider, model } = pickProvider();

  if (provider === "gemini") {
    const raw = await gemini(system, user, model);
    let json: unknown;
    try {
      json = JSON.parse(stripFences(raw));
    } catch {
      throw new Error("Gemini returned text that is not JSON. Try again.");
    }
    // Some responses wrap the object in a single top-level key; unwrap that.
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const keys = Object.keys(json as object);
      if (keys.length === 1 && typeof (json as any)[keys[0]] === "object") {
        const inner = (json as any)[keys[0]];
        if (!schema.safeParse(json).success && schema.safeParse(inner).success) json = inner;
      }
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      const why = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      throw new Error(`Gemini returned JSON in the wrong shape (${why}). Try again.`);
    }
    return { data: parsed.data, provider, model };
  }

  if (provider === "anthropic") {
    _claude ??= new Anthropic();
    const res = await _claude.messages.parse({
      model,
      max_tokens: 16000,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      output_config: { effort: (process.env.ANTHROPIC_EFFORT as any) ?? "high", format: zodOutputFormat(schema) },
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new Error("Claude declined this brief.");
    if (!res.parsed_output) throw new Error("Claude returned JSON in the wrong shape. Try again.");
    return { data: res.parsed_output as z.infer<S>, provider, model };
  }

  throw new Error("No LLM key configured.");
}
