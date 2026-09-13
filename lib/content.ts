import { z } from "zod";
import { BRAND_RULES } from "./brand";

export type Platform = { id: string; name: string; sub: string; guidance: string };

export const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", sub: "Feed · Reels · Stories", guidance: "Caption up to 2,200 characters, but the first 125 carry the hook (shown before 'more'). Short lines with breaks. 5-8 hashtags at the end, mixed reach (2 broad, 3 niche, 1 branded). Emojis sparingly and on-brand. For Reels the hook is the spoken or on-screen first line; end with a save/share ask." },
  { id: "facebook", name: "Facebook", sub: "Page posts · Ads", guidance: "40-120 words, conversational, a question drives comments. 0-3 hashtags. Ad copy: headline under 40 characters, primary text with the payoff in the first 125 characters, description under 30 characters, one clear CTA button label." },
  { id: "linkedin", name: "LinkedIn", sub: "Posts · Articles", guidance: "Professional but human, first person. A one-line hook, then short paragraphs separated by blank lines, 120-200 words. 3-5 hashtags. No clickbait, no 'agree?'. End with a point of view or a real question." },
  { id: "x", name: "X (Twitter)", sub: "Posts · Threads", guidance: "Under 280 characters, one idea, punchy. 0-2 hashtags. If a thread is warranted, give 3-5 numbered posts with the payoff in post 1." },
  { id: "youtube_shorts", name: "YouTube Shorts", sub: "Titles · Descriptions", guidance: "Title under 60 characters, keyword first. Description 2-3 lines with #Shorts plus 2-4 hashtags. Hook is the spoken first line of the video, under 8 words." },
  { id: "whatsapp", name: "WhatsApp", sub: "Status · Broadcast", guidance: "Reads like a message from a person: 40-80 words, plain text, at most 2 emojis, no hashtags, one link at most, a soft ask at the end." },
];

export const TONES = ["Editorial", "Warm", "Bold", "Playful", "Corporate"] as const;
export const LANGS = ["English", "Hindi", "Hinglish", "Punjabi"] as const;

export const platformById = (id: string) => PLATFORMS.find((p) => p.id === id);

export const ContentPackSchema = z.object({
  angle: z.string().describe("The one creative angle every post shares, one sentence"),
  posts: z.array(
    z.object({
      platform: z.string().describe("Platform id exactly as given"),
      format: z.string().describe("e.g. Single image, Carousel (5 slides), Reel, Story, Text post, Thread"),
      hook: z.string().describe("First line that stops the scroll"),
      caption: z.string().describe("The full post text, ready to paste, with line breaks"),
      cta: z.string().describe("The ask at the end, one line"),
      hashtags: z.array(z.string()).describe("With the # sign. Empty for platforms that do not use them."),
      visual: z.string().describe("What the image or video should show, one or two sentences, for the designer"),
      best_time: z.string().describe("Best posting time in IST, e.g. 'Tue 19:00'"),
    })
  ),
  ads: z.array(
    z.object({
      platform: z.string().describe("Platform id"),
      headline: z.string(),
      primary_text: z.string(),
      description: z.string(),
      cta: z.string().describe("Button label, e.g. Learn more"),
    })
  ).describe("Paid ad variants. Empty unless ads were requested."),
});
export type ContentPack = z.infer<typeof ContentPackSchema>;

export const CONTENT_SYSTEM = `You are the content lead at Limelight. A client gives you one brief; you write ready-to-post copy for each social platform they choose, all carrying one angle, each in that platform's own rhythm.

${BRAND_RULES}

Writing:
- Decide the angle first, then write every post from it. No two platforms get the same text reworded; each gets its own shape.
- Specific beats generic. Concrete nouns, real details from the brief, no "elevate", "unlock", "journey", "seamless".
- Hooks are the first line and must work alone. No "Are you ready?", no rhetorical filler.
- Hindi and Punjabi in their own script unless Hinglish is asked, in which case write Roman-script Hindi the way people type on phones.
- Hashtags: only where the platform uses them, lowercase-agnostic, no spaces, no more than the platform norm.
- Ads only when asked: three tight variants across the platforms that run ads (Facebook, Instagram, LinkedIn), each with a different angle: benefit, proof, urgency.
- visual is a note for the designer, not a prompt.
- Never invent facts: no addresses, prices, dates, phone numbers, timings, names or claims that are not in the brief. Where a detail is needed but missing, write a placeholder in square brackets like [address] or [timings].

Return JSON only, no markdown, matching exactly:
{"angle": string, "posts": [{"platform": string, "format": string, "hook": string, "caption": string, "cta": string, "hashtags": string[], "visual": string, "best_time": string}], "ads": [{"platform": string, "headline": string, "primary_text": string, "description": string, "cta": string}]}`;

export function contentUser(args: { brief: string; platforms: string[]; tone: string; lang: string; ads: boolean; variants: number }): string {
  const { brief, platforms, tone, lang, ads, variants } = args;
  const blocks = platforms.map(platformById).filter((p): p is Platform => !!p).map((p) => `### ${p.id} (${p.name})\n${p.guidance}`);
  return (
    `Brief:\n${brief}\n\nTone: ${tone}\nLanguage: ${lang}\nPosts per platform: ${variants}${variants > 1 ? " (each a different format or hook)" : ""}\nPaid ads: ${ads ? "yes, write ad variants" : "no, leave ads empty"}\n\n` +
    `Platforms, in this order, using each id exactly:\n\n${blocks.join("\n\n")}`
  );
}

export function mockContent(brief: string, platforms: string[], ads: boolean): ContentPack {
  const short = brief.trim().slice(0, 60);
  return {
    angle: `(Demo) One angle for "${short}". Add a GEMINI_API_KEY for real copy.`,
    posts: platforms.map((id) => ({
      platform: id,
      format: "Single image",
      hook: `(Demo hook for ${platformById(id)?.name ?? id})`,
      caption: `(Demo caption) ${short}\n\nReal copy is written per platform once a key is set.`,
      cta: "(Demo CTA)",
      hashtags: id === "whatsapp" ? [] : ["#demo", "#limelight"],
      visual: "(Demo visual note)",
      best_time: "Tue 19:00",
    })),
    ads: ads ? [{ platform: "facebook", headline: "(Demo headline)", primary_text: "(Demo primary text)", description: "(Demo)", cta: "Learn more" }] : [],
  };
}
