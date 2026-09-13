// The AI tools we write prompts for. Each one has its own prompt grammar, so the
// guidance here is what turns one brief into a prompt that actually works there.

export type TargetKind = "image" | "video" | "music" | "voice";

export type Target = {
  id: string;
  name: string;
  kind: TargetKind;
  url: string;
  free: string;          // what you get without paying
  guidance: string;      // how to write for this tool
  extras: string[];      // named extra fields the writer must fill (e.g. lyrics for Suno)
};

export const TARGETS: Target[] = [
  {
    id: "gpt_image",
    name: "ChatGPT · GPT Image",
    kind: "image",
    url: "https://chatgpt.com/",
    free: "A few images a day on the free plan",
    guidance:
      "Natural prose, 60-150 words, one paragraph. Lead with medium and subject (editorial photograph / flat illustration / 3D render), then composition, lighting, palette, mood, and where empty space sits. Any text that must appear goes in double quotes exactly once, with the script named (Devanagari, Latin). Say the aspect in words (square, tall portrait, wide). End with one sentence of what to leave out.",
    extras: [],
  },
  {
    id: "nano_banana",
    name: "Gemini · Nano Banana",
    kind: "image",
    url: "https://gemini.google.com/",
    free: "Free in the Gemini app, generous daily limit",
    guidance:
      "Conversational instruction to an assistant, 40-120 words. Start with 'Create an image of…' for new work, or 'Using the attached image, …' for edits, and say explicitly what must stay unchanged. Strong at consistency, edits, and realistic light; keep on-image text to two or three words. Name camera, lens and lighting for photo looks. Ask for exactly one image and give the aspect ratio (1:1, 9:16, 16:9).",
    extras: [],
  },
  {
    id: "ideogram",
    name: "Ideogram",
    kind: "image",
    url: "https://ideogram.ai/",
    free: "Daily free credits",
    guidance:
      "Best tool for posters with text. Put the headline in double quotes in the first sentence, then describe typography (weight, style, placement), layout, colour palette and background. Keep to 40-90 words. Mention 'Design' or 'Poster' style. Under 6 words of on-image text renders reliably.",
    extras: [],
  },
  {
    id: "higgsfield",
    name: "Higgsfield",
    kind: "video",
    url: "https://higgsfield.ai/",
    free: "Free credits on signup, daily top-ups",
    guidance:
      "One continuous shot, 5-8 seconds, present tense, 40-80 words. Order: subject and action, then camera move (slow dolly in, orbit, crane up, handheld push, whip pan), lens and lighting, mood. Name a Higgsfield camera preset when one fits. No on-screen text, no cuts, no multiple scenes. If it is image-to-video, describe only the motion and camera, not the scene.",
    extras: [],
  },
  {
    id: "kling",
    name: "Kling",
    kind: "video",
    url: "https://klingai.com/",
    free: "Daily free credits",
    guidance:
      "Text-to-video, 5 or 10 seconds, 40-90 words. Describe the scene fully (it does not see a reference), then the single action, then camera movement and lighting. Realistic physics and people work well; avoid fast cuts and text. Give aspect ratio and duration.",
    extras: [],
  },
  {
    id: "suno",
    name: "Suno",
    kind: "music",
    url: "https://suno.com/",
    free: "About 10 songs a day free",
    guidance:
      "Two parts. STYLE (under 200 characters): genre, sub-genre, mood, tempo in BPM, key instruments, vocal type (male / female / duet / none), language. No artist names. LYRICS: use section tags [Intro] [Verse] [Chorus] [Bridge] [Outro]; keep lines short and singable; for Hindi or Punjabi write in the script the singer should pronounce, and keep the hook to 4-6 words repeated. For instrumental, write [Instrumental] only. Also give a short TITLE.",
    extras: ["title", "style", "lyrics"],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    kind: "voice",
    url: "https://elevenlabs.io/",
    free: "10 minutes of speech a month free",
    guidance:
      "A voiceover script ready to paste, 30-60 seconds when read (75-150 words). Short sentences, natural pauses marked with '…' or line breaks, numbers written as words, brand names spelled the way they are pronounced. Before the script, a one-line VOICE note: gender, age, tone, pace, language and accent.",
    extras: ["voice", "script"],
  },
];

export const DEFAULT_TARGETS = ["gpt_image", "nano_banana", "higgsfield", "suno"];

export const targetById = (id: string) => TARGETS.find((t) => t.id === id);
