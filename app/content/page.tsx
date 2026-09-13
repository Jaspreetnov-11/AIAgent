"use client";
import { useEffect, useState } from "react";
import type { ContentPack } from "@/lib/content";
import { BulbIcon, CopyButton, Hero, KindIcon, Sec, SparkIcon, TrashIcon, Writing } from "@/components/ui";

type Meta = { platforms: { id: string; name: string; sub: string }[]; tones: string[]; langs: string[] };
const MAX = 2000;

export default function ContentStudio() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [brief, setBrief] = useState("");
  const [picked, setPicked] = useState<string[]>(["instagram", "linkedin", "facebook"]);
  const [tone, setTone] = useState("Editorial");
  const [lang, setLang] = useState("English");
  const [ads, setAds] = useState(false);
  const [variants, setVariants] = useState(1);
  const [pack, setPack] = useState<ContentPack | null>(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/content").then((r) => r.json()).then(setMeta).catch(() => setError("Could not reach the server.")); }, []);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const name = (id: string) => meta?.platforms.find((p) => p.id === id)?.name ?? id;

  async function write() {
    setBusy(true); setError(""); setPack(null);
    try {
      const r = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief, platforms: picked, tone, lang, ads, variants }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status}).`);
      setPack(data.pack); setDemo(!!data.demo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const postText = (p: ContentPack["posts"][number]) => `${p.caption}${p.hashtags.length ? `\n\n${p.hashtags.join(" ")}` : ""}`;
  const allText = pack ? pack.posts.map((p) => `## ${name(p.platform)} · ${p.format}\n${postText(p)}`).join("\n\n") + (pack.ads.length ? "\n\n## Ads\n" + pack.ads.map((a) => `${name(a.platform)}\nHeadline: ${a.headline}\nPrimary: ${a.primary_text}\nDescription: ${a.description}\nCTA: ${a.cta}`).join("\n\n") : "") : "";

  return (
    <main className="wrap">
      <Hero title="One brief. Every post and ad." sub="Captions, hooks, hashtags and ad copy, written for each platform." />

      <div className="cols">
        <div className="stack">
          <section className="card">
            <Sec n="01" title="Your brief" right={<button className="linkbtn" onClick={() => setBrief("")} disabled={busy || !brief}>Clear <TrashIcon /></button>} />
            <textarea value={brief} maxLength={MAX} onChange={(e) => setBrief(e.target.value)} disabled={busy} placeholder="What are we posting about? Product, offer, event, story, audience, what you want people to do..." />
            <div className="meta-row"><span>Tip: name the audience and the one thing they should do.</span><span>{brief.length}/{MAX}</span></div>
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
            <Sec n="03" title="Style" />
            <div className="fields">
              <label className="field">Tone
                <select value={tone} disabled={busy} onChange={(e) => setTone(e.target.value)}>{(meta?.tones ?? ["Editorial"]).map((t) => <option key={t}>{t}</option>)}</select>
              </label>
              <label className="field">Language
                <select value={lang} disabled={busy} onChange={(e) => setLang(e.target.value)}>{(meta?.langs ?? ["English"]).map((l) => <option key={l}>{l}</option>)}</select>
              </label>
              <label className="field">Posts / platform
                <select value={variants} disabled={busy} onChange={(e) => setVariants(Number(e.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </label>
              <label className="field switch" style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={ads} disabled={busy} onChange={(e) => setAds(e.target.checked)} /> Write ad copy too
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn cta" onClick={write} disabled={busy || !brief.trim() || !picked.length}>
                <SparkIcon /> {busy ? "Writing…" : "Generate content"} <span className="arr">→</span>
              </button>
            </div>
            {error && <p className="err">{error}</p>}
          </section>
        </div>

        <section className="card">
          <div className="out-head">
            <h2>Your content</h2>
            {pack && <span className="pill green">{pack.posts.length} posts{pack.ads.length ? ` · ${pack.ads.length} ads` : ""}</span>}
            <span className="grow" />
            {pack && <CopyButton text={allText} label="Copy all" />}
          </div>

          {busy ? <Writing /> : !pack ? (
            <div className="empty"><div>Your posts appear here.<br /><span style={{ fontSize: 13 }}>Brief, platforms, style, generate.</span></div></div>
          ) : (
            <>
              <div className="direction">
                <BulbIcon />
                <div><div className="lab">Angle</div><div className="txt">{pack.angle}</div></div>
              </div>
              {demo && <p className="note">Demo output. Add a key for real copy.</p>}
              {pack.posts.map((p, i) => (
                <article key={i} className="pcard">
                  <div className="pcard-head">
                    <span className="ico"><KindIcon kind={p.platform} /></span>
                    <span className="name">{name(p.platform)}</span>
                    <span className="badge">{p.format}</span>
                    <span className="badge">{p.best_time}</span>
                    <div className="acts"><CopyButton text={postText(p)} label="Copy post" /></div>
                  </div>
                  <div className="pcard-body">
                    <p className="tip" style={{ marginTop: 0, marginBottom: 10 }}><span>Hook: {p.hook}</span></p>
                    <pre className="ptext">{p.caption}</pre>
                    {p.hashtags.length > 0 && <div className="chips">{p.hashtags.map((h, k) => <span key={k} className="chip tag">{h}</span>)}</div>}
                    <div className="chips">
                      <span className="chip">CTA:<b>{p.cta}</b></span>
                    </div>
                    <p className="note">Visual: {p.visual}</p>
                  </div>
                </article>
              ))}
              {pack.ads.length > 0 && (
                <>
                  <div className="out-head" style={{ marginTop: 20 }}><h2 style={{ fontSize: 18 }}>Ad copy</h2></div>
                  {pack.ads.map((a, i) => (
                    <article key={i} className="pcard">
                      <div className="pcard-head">
                        <span className="ico"><KindIcon kind={a.platform} /></span>
                        <span className="name">{name(a.platform)}</span>
                        <span className="badge">Ad</span>
                        <div className="acts"><CopyButton text={`Headline: ${a.headline}\nPrimary text: ${a.primary_text}\nDescription: ${a.description}\nCTA: ${a.cta}`} label="Copy ad" /></div>
                      </div>
                      <div className="pcard-body">
                        <div className="extra"><div className="extra-head"><span>Headline</span></div><pre className="ptext">{a.headline}</pre></div>
                        <div className="extra"><div className="extra-head"><span>Primary text</span></div><pre className="ptext">{a.primary_text}</pre></div>
                        <div className="chips"><span className="chip">Description:<b>{a.description}</b></span><span className="chip">CTA:<b>{a.cta}</b></span></div>
                      </div>
                    </article>
                  ))}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
