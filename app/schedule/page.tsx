"use client";
import { useEffect, useMemo, useState } from "react";
import type { Schedule } from "@/lib/schedule";
import { BulbIcon, CopyButton, Hero, KindIcon, OpenIcon, Sec, SparkIcon, TrashIcon, Writing } from "@/components/ui";

type Meta = { platforms: { id: string; name: string; sub: string }[]; langs: string[] };
type Saved = { plan: Schedule; start: string; done: Record<string, boolean>; savedAt: string };
const KEY = "limelight.schedule";
const OPEN_URL: Record<string, string> = {
  instagram: "https://business.facebook.com/latest/planner",
  facebook: "https://business.facebook.com/latest/planner",
  linkedin: "https://www.linkedin.com/feed/",
  x: "https://x.com/compose/post",
  youtube_shorts: "https://studio.youtube.com/",
  whatsapp: "https://web.whatsapp.com/",
};

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, d: number) => { const t = new Date(iso + "T00:00:00"); t.setDate(t.getDate() + d); return t; };
const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const pad = (n: number) => String(n).padStart(2, "0");
function gcal(d: Date, time: string, title: string, details: string) {
  const mt = /(\d{1,2}):(\d{2})/.exec(time);
  const h = mt ? Number(mt[1]) : 19, m = mt ? Number(mt[2]) : 0;
  const s = new Date(d); s.setHours(h || 0, m || 0, 0, 0);
  const e = new Date(s.getTime() + 30 * 60000);
  const f = (x: Date) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(details)}`;
}
function csv(plan: Schedule, start: string) {
  const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [["date", "time", "platform", "format", "pillar", "title", "caption", "hashtags", "asset"]];
  for (const p of plan.posts) {
    const d = addDays(start, p.day);
    rows.push([`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, p.time, p.platform, p.format, p.pillar, p.title, p.caption, p.hashtags.join(" "), p.asset]);
  }
  return rows.map((r) => r.map(q).join(",")).join("\n");
}

export default function ScheduleStudio() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [brief, setBrief] = useState("");
  const [picked, setPicked] = useState<string[]>(["instagram", "facebook", "linkedin"]);
  const [days, setDays] = useState(14);
  const [perWeek, setPerWeek] = useState(3);
  const [lang, setLang] = useState("English");
  const [start, setStart] = useState(today());
  const [saved, setSaved] = useState<Saved | null>(null);
  const [demo, setDemo] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/content").then((r) => r.json()).then(setMeta).catch(() => setError("Could not reach the server."));
    try { const raw = localStorage.getItem(KEY); if (raw) setSaved(JSON.parse(raw)); } catch {}
  }, []);

  function persist(next: Saved | null) {
    setSaved(next);
    try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY); } catch {}
  }

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const name = (id: string) => meta?.platforms.find((p) => p.id === id)?.name ?? id;

  async function build() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief, platforms: picked, days, perWeek, lang, start }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status}).`);
      persist({ plan: data.plan, start: data.start, done: {}, savedAt: new Date().toISOString() });
      setDemo(!!data.demo); setOpenIdx(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const groups = useMemo(() => {
    if (!saved) return [];
    const m = new Map<number, { i: number; p: Schedule["posts"][number] }[]>();
    saved.plan.posts.forEach((p, i) => { if (!m.has(p.day)) m.set(p.day, []); m.get(p.day)!.push({ i, p }); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [saved]);

  const doneCount = saved ? Object.values(saved.done).filter(Boolean).length : 0;
  const postText = (p: Schedule["posts"][number]) => `${p.caption}${p.hashtags.length ? `\n\n${p.hashtags.join(" ")}` : ""}`;

  return (
    <main className="wrap">
      <Hero title="Schedule" sub="A posting calendar with captions ready, day by day." />

      <div className="cols">
        <div className="stack">
          <section className="card">
            <Sec n="01" title="Campaign brief" right={<button className="linkbtn" onClick={() => setBrief("")} disabled={busy || !brief}>Clear <TrashIcon /></button>} />
            <textarea value={brief} maxLength={2000} onChange={(e) => setBrief(e.target.value)} disabled={busy} placeholder="What is the campaign? Launch, festival, offer, event. Who is it for, what should they do, any key dates..." />
          </section>

          <section className="card">
            <Sec n="02" title="Platforms" right={<><span className="dot" />{picked.length} selected</>} />
            <div className="tiles">
              {(meta?.platforms ?? []).map((p) => (
                <button key={p.id} type="button" className={`tile ${picked.includes(p.id) ? "on" : ""}`} aria-pressed={picked.includes(p.id)} aria-label={p.name} disabled={busy} onClick={() => toggle(p.id)}>
                  <span className="ico"><KindIcon kind={p.id} /></span>
                  <span><span className="t1">{p.name}</span><br /><span className="t3">{p.sub}</span></span>
                  <span className="box" />
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <Sec n="03" title="Plan" />
            <div className="fields">
              <label className="field">Start date<input type="date" value={start} disabled={busy} onChange={(e) => setStart(e.target.value)} /></label>
              <label className="field">Length
                <select value={days} disabled={busy} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select>
              </label>
              <label className="field">Posts / week / platform
                <select value={perWeek} disabled={busy} onChange={(e) => setPerWeek(Number(e.target.value))}>{[1, 2, 3, 4, 5, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </label>
              <label className="field">Language
                <select value={lang} disabled={busy} onChange={(e) => setLang(e.target.value)}>{(meta?.langs ?? ["English"]).map((l) => <option key={l}>{l}</option>)}</select>
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn cta" onClick={build} disabled={busy || !brief.trim() || !picked.length}>
                <SparkIcon /> {busy ? "Planning…" : "Build calendar"} <span className="arr">→</span>
              </button>
            </div>
            {error && <p className="err">{error}</p>}
            <p className="note">Posting itself happens in each platform's own app. Meta Business Suite schedules Instagram and Facebook for free; the calendar exports as CSV for Buffer, Later or a sheet.</p>
          </section>
        </div>

        <section className="card">
          <div className="out-head">
            <h2>{saved ? saved.plan.campaign : "Your calendar"}</h2>
            {saved && <span className="pill green">{doneCount}/{saved.plan.posts.length} posted</span>}
            <span className="grow" />
            {saved && (
              <div className="btn-group">
                <a className="btn" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv(saved.plan, saved.start))}`} download={`${saved.plan.campaign.replace(/\s+/g, "-").toLowerCase()}-calendar.csv`}>Export CSV</a>
                <button className="btn ghost" onClick={() => persist(null)}>Clear</button>
              </div>
            )}
          </div>

          {busy ? <Writing label="Planning" /> : !saved ? (
            <div className="empty"><div>Your calendar appears here.<br /><span style={{ fontSize: 13 }}>It stays saved in this browser, with a posted checkbox per item.</span></div></div>
          ) : (
            <>
              <div className="direction">
                <BulbIcon />
                <div><div className="lab">Strategy</div><div className="txt">{saved.plan.strategy}</div></div>
              </div>
              {demo && <p className="note">Demo output. Add a key for a real plan.</p>}
              {groups.map(([day, items]) => {
                const d = addDays(saved.start, day);
                return (
                  <div key={day} className="day">
                    <div className="day-head"><span>{fmtDay(d)}</span><i /><span>Day {day + 1}</span></div>
                    {items.map(({ i, p }) => {
                      const key = String(i);
                      const done = !!saved.done[key];
                      const isOpen = openIdx === i;
                      return (
                        <article key={i} className={`post ${done ? "done" : ""}`}>
                          <div className="post-row">
                            <span className="time">{p.time}</span>
                            <span className="ico" style={{ width: 22, height: 22, color: "var(--cyan)" }}><KindIcon kind={p.platform} /></span>
                            <span className="title">{p.title}</span>
                            <span className="badge">{name(p.platform)}</span>
                            <span className="badge">{p.format}</span>
                            <label className="check"><input type="checkbox" checked={done} onChange={(e) => persist({ ...saved, done: { ...saved.done, [key]: e.target.checked } })} /> posted</label>
                            <button className="showbtn" style={{ marginLeft: 0 }} onClick={() => setOpenIdx(isOpen ? null : i)}>{isOpen ? "Hide ⌃" : "Open ⌄"}</button>
                          </div>
                          {isOpen && (
                            <div className="post-body">
                              <pre className="ptext">{p.caption}</pre>
                              {p.hashtags.length > 0 && <div className="chips">{p.hashtags.map((h, k) => <span key={k} className="chip tag">{h}</span>)}</div>}
                              <div className="chips"><span className="chip">Pillar:<b>{p.pillar}</b></span><span className="chip">Asset:<b>{p.asset}</b></span></div>
                              <div className="btn-group" style={{ marginTop: 12, flexWrap: "wrap" }}>
                                <CopyButton text={postText(p)} label="Copy caption" />
                                <a className="btn ghost" href={gcal(d, p.time, `${name(p.platform)}: ${p.title}`, postText(p))} target="_blank" rel="noopener noreferrer">Add to Google Calendar <OpenIcon /></a>
                                <a className="btn ghost" href={OPEN_URL[p.platform] ?? "#"} target="_blank" rel="noopener noreferrer">Open {name(p.platform)} <OpenIcon /></a>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
