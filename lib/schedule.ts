import { z } from "zod";
import { BRAND_RULES } from "./brand";
import { platformById, type Platform } from "./content";

export const ScheduleSchema = z.object({
  campaign: z.string().describe("Short campaign name, 2-5 words"),
  strategy: z.string().describe("Two sentences: the content pillars and the rhythm"),
  posts: z.array(
    z.object({
      day: z.coerce.number().int().describe("Day offset from the start date, 0 = start date"),
      time: z.string().describe("24h IST time, e.g. 19:00"),
      platform: z.string().describe("Platform id exactly as given"),
      format: z.string().describe("Single image, Carousel, Reel, Story, Text post, Thread, Short"),
      pillar: z.string().default("").describe("Which content pillar this serves, 1-3 words"),
      title: z.string().describe("Working title for the calendar, under 8 words"),
      caption: z.string().describe("Ready-to-post caption in the platform's rhythm"),
      hashtags: z.array(z.string()).default([]),
      asset: z.string().default("").describe("What needs to be designed or shot, one line"),
    })
  ),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const SCHEDULE_SYSTEM = `You are the social media manager at Limelight. A client gives you a campaign brief, a date range, platforms and a cadence; you build the full posting calendar with ready captions.

${BRAND_RULES}

Planning:
- Define 3-4 content pillars that ladder to the brief (for example: launch, proof, behind the scenes, community). Rotate them so no pillar repeats on consecutive days on the same platform.
- Spread posts evenly across the range at the cadence asked. Never two posts on the same platform on the same day. Prefer weekday evenings for Instagram and Facebook (18:30-20:30 IST), weekday mornings for LinkedIn (08:30-10:00 IST), and lunchtime for X (12:30-13:30 IST). Shorts and Reels on Fridays and weekends.
- Vary formats across the week; carousels and reels for depth, single images and stories for frequency.
- Open the campaign with a strong hook post, put the key announcement or offer in the first third, and close with a wrap-up or thank-you.
- Every caption is complete and pasteable, in the platform's rhythm and the requested language. Hashtags only where the platform uses them.
- asset is a one-line brief for the designer or videographer.
- Never invent facts: no addresses, prices, dates, phone numbers, names or claims that are not in the brief. Where a detail is needed but missing, write a placeholder in square brackets like [address] or [price].

Return JSON only, no markdown, matching exactly:
{"campaign": string, "strategy": string, "posts": [{"day": number, "time": string, "platform": string, "format": string, "pillar": string, "title": string, "caption": string, "hashtags": string[], "asset": string}]}`;

export function scheduleUser(args: { brief: string; platforms: string[]; days: number; perWeek: number; lang: string; start: string }): string {
  const { brief, platforms, days, perWeek, lang, start } = args;
  const blocks = platforms.map(platformById).filter((p): p is Platform => !!p).map((p) => `### ${p.id} (${p.name})\n${p.guidance}`);
  const total = Math.max(1, Math.round((days / 7) * perWeek * platforms.length));
  return (
    `Campaign brief:\n${brief}\n\nStart date: ${start} (day 0)\nLength: ${days} days\nCadence: ${perWeek} posts per platform per week, so about ${total} posts in total\nLanguage: ${lang}\n\n` +
    `Platforms, using each id exactly:\n\n${blocks.join("\n\n")}`
  );
}

export function mockSchedule(brief: string, platforms: string[], days: number): Schedule {
  const posts: Schedule["posts"] = [];
  for (let d = 0; d < days; d += 2) {
    const platform = platforms[(d / 2) % platforms.length];
    posts.push({ day: d, time: "19:00", platform, format: "Single image", pillar: "Demo", title: `Demo post ${d / 2 + 1}`, caption: `(Demo caption) ${brief.slice(0, 60)}`, hashtags: platform === "whatsapp" ? [] : ["#demo"], asset: "(Demo asset note)" });
  }
  return { campaign: "Demo campaign", strategy: "(Demo) Add a GEMINI_API_KEY for a real plan.", posts };
}
