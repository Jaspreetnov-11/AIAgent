"use client";
import { useEffect, useState } from "react";
import type { PromptPack } from "@/lib/promptpack";
import { BoltIcon, BulbIcon, CopyButton, Hero, KindIcon, OpenIcon, Sec, SparkIcon, TrashIcon, Writing } from "@/components/ui";

type TargetInfo = { id: string; name: string; kind: "image" | "video" | "music" | "voice"; url: string; free: string };
type Status = { provider: "gemini" | "anthropic" | "none"; model: string; targets: TargetInfo[]; defaults: string[] };
const KIND = { image: "Image", video: "Video", music: "Music", voice: "Voice" } as const;
const MAX = 2000;

export default function PromptStudio() {
  const [status, setStatus] = useState<Status | null>(null);
  const [brief, setBrief] = useState("");
  const [refOpen, setRefOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pack, setPack] = useState<PromptPack | null>(null);
  const [demo, setDemo] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/prompts").then((r) => r.json()).then((s: Status) => { setStatus(s); setPicked(s.defaults); }).catch(() => setError("Could not reach the server."));
  }, []);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const byId = new Map((status?.targets ?? []).map((t) => [t.id, t]));

  async function write() {
    setBusy(true); setError(""); setPack(null);
    try {
      const fullBrief = reference.trim() ? `${brief}\n\nReference notes: ${reference.trim()}` : brief;
      const r = await fetch("/api/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: fullBrief, targets: picked }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status}).`);
      setPack(data.pack); setDemo(!!data.demo);
      setOpen(new Set(data.pack.targets.slice(0, 2).map((t: { id: string }) => t.id)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const allText = pack ? pack.targets.map((t) => `## ${byId.get(t.id)?.name ?? t.id}\n${t.prompt}${t.extras.map((x) => `\n\n${x.label}:\n${x.value}`).join("")}`).join("\n\n") : "";

  return (
    <main className="wrap">
      <Hero title="One idea. Every AI tool." sub="Turn your brief into ready-to-use prompts." />

      <div className="cols">
        <div className="stack">
          <section className="card">
            <Sec n="01" title="Your brief" right={<button className="linkbtn" onClick={() => { setBrief(""); setReference(""); }} disabled={busy || !brief}>Clear <TrashIcon /></button>} />
            <textarea value={brief} maxLength={MAX} onChange={(e) => setBrief(e.target.value)} disabled={busy} placeholder="Describe what you want to create..." />
            <div className="meta-row">
              <button className="linkbtn" onClick={() => setRefOpen((o) => !o)} disabled={busy}>📎 Add reference (optional)</button>
              <span>{brief.length}/{MAX}</span>
            </div>
            {refOpen && (
              <textarea style={{ minHeight: 72, marginTop: 8 }} value={reference} onChange={(e) => setReference(e.target.value)} disabled={busy} placeholder="Links, past posts, style notes, must-keep details..." />
            )}
          </section>

          <section className="card">
            <Sec n="02" title="Select tools" right={<><span className="dot" />{picked.length} tools selected</>} />
            <div className="tiles">
              {(status?.targets ?? []).map((t) => {
                const [brand, product] = t.name.split(" · ");
                return (
                  <button key={t.id} type="button" className={`tile ${picked.includes(t.id) ? "on" : ""}`} aria-pressed={picked.includes(t.id)} aria-label={t.name} disabled={busy} onClick={() => toggle(t.id)}>
                    <span className="ico"><KindIcon kind={t.kind} /></span>
                    <span>
                      <span className="t1">{brand}</span><br />
                      <span className="t2">{product ?? KIND[t.kind]}</span><br />
                      <span className="t3">{KIND[t.kind]} · {t.free}</span>
                    </span>
                    <span className="box" />
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn cta" onClick={write} disabled={busy || !brief.trim() || !picked.length}>
                <SparkIcon /> {busy ? "Writing…" : "Generate prompts"} <span className="arr">→</span>
              </button>
            </div>
            {error && <p className="err">{error}</p>}
            {status?.provider === "none" && <p className="note">Demo mode. Add a free GEMINI_API_KEY to .env.local and restart for real prompts.</p>}
          </section>
        </div>

        <section className="card">
          <div className="out-head">
            <h2>Your prompts</h2>
            {pack && <span className="pill green">{pack.targets.length} generated</span>}
            <span className="grow" />
            {pack && <CopyButton text={allText} label="Copy all" />}
          </div>

          {busy ? <Writing /> : !pack ? (
            <div className="empty"><div>Your prompts appear here.<br /><span style={{ fontSize: 13 }}>Write a brief, pick tools, generate.</span></div></div>
          ) : (
            <>
              <div className="direction">
                <BulbIcon />
                <div><div className="lab">Creative direction</div><div className="txt">{pack.concept}</div></div>
                <span className="chev">›</span>
              </div>
              {demo && <p className="note">Demo output. Add a key for real prompts.</p>}
              {pack.targets.map((t) => {
                const info = byId.get(t.id);
                const [brand, product] = (info?.name ?? t.id).split(" · ");
                const isOpen = open.has(t.id);
                return (
                  <article key={t.id} className="pcard">
                    <div className="pcard-head">
                      <span className="ico"><KindIcon kind={info?.kind ?? "image"} /></span>
                      <span className="name">{brand}{product && <><span className="dotsep">·</span>{product}</>}</span>
                      {info && <span className="badge">{KIND[info.kind]}</span>}
                      {isOpen ? (
                        <div className="acts">
                          <CopyButton text={t.prompt} label="Copy prompt" />
                          <span className="vbar" />
                          {info && <a href={info.url} target="_blank" rel="noopener noreferrer" className="btn ghost">Open <OpenIcon /></a>}
                        </div>
                      ) : (
                        <button className="showbtn" onClick={() => setOpen((s) => new Set(s).add(t.id))}>Show prompt ⌄</button>
                      )}
                    </div>
                    {isOpen && (
                      <div className="pcard-body">
                        <pre className="ptext">{t.prompt}</pre>
                        {t.settings.length > 0 && <div className="chips">{t.settings.map((s, i) => <span key={i} className="chip">{s.label}:<b>{s.value}</b></span>)}</div>}
                        {t.extras.map((x, i) => (
                          <div key={i} className="extra">
                            <div className="extra-head"><span>{x.label}</span><CopyButton text={x.value} label={`Copy ${x.label}`} className="btn sm" /></div>
                            <pre className="ptext">{x.value}</pre>
                          </div>
                        ))}
                        {t.tip && <p className="tip"><BoltIcon /><span>Tip: {t.tip}</span></p>}
                        <button className="showbtn" onClick={() => setOpen((s) => { const n = new Set(s); n.delete(t.id); return n; })}>Hide prompt ⌃</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
