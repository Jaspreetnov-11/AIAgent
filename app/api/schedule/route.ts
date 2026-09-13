import { NextResponse } from "next/server";
import { generateJSON, pickProvider } from "@/lib/llm";
import { LANGS, PLATFORMS } from "@/lib/content";
import { mockSchedule, SCHEDULE_SYSTEM, ScheduleSchema, scheduleUser } from "@/lib/schedule";

export const runtime = "nodejs";
export const maxDuration = 180;

/** POST { brief, platforms, days, perWeek, lang, start } -> schedule */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const brief = String(body?.brief ?? "").trim();
  if (!brief) return NextResponse.json({ error: "Brief is empty." }, { status: 400 });

  const valid = new Set(PLATFORMS.map((p) => p.id));
  const platforms: string[] = (Array.isArray(body?.platforms) ? body.platforms : []).filter((id: unknown) => typeof id === "string" && valid.has(id));
  if (!platforms.length) return NextResponse.json({ error: "Pick at least one platform." }, { status: 400 });

  const days = [7, 14, 30].includes(Number(body?.days)) ? Number(body.days) : 14;
  const perWeek = Math.min(7, Math.max(1, Number(body?.perWeek) || 3));
  const lang = (LANGS as readonly string[]).includes(body?.lang) ? body.lang : "English";
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.start ?? "")) ? String(body.start) : new Date().toISOString().slice(0, 10);

  const { provider } = pickProvider();
  if (provider === "none") return NextResponse.json({ plan: mockSchedule(brief, platforms, days), start, demo: true });

  try {
    const { data } = await generateJSON({ system: SCHEDULE_SYSTEM, user: scheduleUser({ brief, platforms, days, perWeek, lang, start }), schema: ScheduleSchema });
    const posts = data.posts
      .filter((p) => valid.has(p.platform) && p.day >= 0 && p.day < days)
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    return NextResponse.json({ plan: { ...data, posts }, start, demo: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Scheduler failed." }, { status: 502 });
  }
}
