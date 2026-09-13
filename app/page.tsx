"use client";
import { useEffect, useState } from "react";
import type { PromptPack } from "@/lib/promptpack";

type TargetInfo = { id: string; name: string; kind: "image" | "video" | "music" | "voice"; url: string; free: string };
type Status = { provider: "gemini" | "anthropic" | "none"; model: string; targets: TargetInfo[]; defaults: string[] };

const KIND_LABEL = { image: "Image", video: "Video", music: "Music", voice: "Voice" } as const;

export default function PromptStudio() {
  const [status, setStatus] = useState<Status | null>(null);
  const [brief, setBrief] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pack, setPack] = useState<PromptPack | null>(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((s: Status) => { setStatus(s); setPicked(s.defaults); })
      .catch(() => setError("Could not reach the server."));
  }, []);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function write() {
    setBusy(true); setError(""); setPack(null);
    try {
      const r = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, targets: picked }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status}).`);
      setPack(data.pack); setDemo(!!data.demo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const targetsById = new Map((status?.targets ?? []).map((t) => [t.id, t]));

  return (
    <main className="wrap">
      <header className="head">
        <div>
          <h1>Prompt studio</h1>
          <p className="tag">One brief in. A ready-to-paste prompt for every AI tool you use, each in that tool's own grammar. Paste them into the free apps.</p>
        </div>
        <nav className="nav">
          <a className="on" href="/">Prompts</a>
          <a href="/agent">Image agent</a>
        </nav>
      </header>

      {status?.provider === "none" && (
        <div className="notice" role="status">
          <strong>Demo mode.</strong> Add a free <code>GEMINI_API_KEY</code> to <code>.env.local</code> (from aistudio.google.com, no card needed) and restart <code>npm run dev</code> to get real prompts.
        </div>
      )}
      {status && status.provider !== "none" && (
        <p className="meta provider">Writer: {status.provider === "gemini" ? "Gemini (free tier)" : "Claude"} · {status.model}</p>
      )}

      <div className="grid">
        <section>
          <div className={`step ${!pack ? "live" : ""}`}>
            <h2>Brief</h2>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={busy}
              placeholder="e.g. Diwali campaign for a state tourism board. Warm, one diya, Hindi headline 'शुभ दीपावली'. Need a post, a 6-second reel, and a short jingle."
            />
          </div>

          <div className="step">
            <h2>Tools <span className="meta">pick any</span></h2>
            <div className="tools">
              {(status?.targets ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tool ${picked.includes(t.id) ? "on" : ""}`}
                  aria-pressed={picked.includes(t.id)}
                  aria-label={t.name}
                  disabled={busy}
                  onClick={() => toggle(t.id)}
                >
                  <span className="tool-name">{t.name}</span>
                  <span className="tool-kind">{KIND_LABEL[t.kind]} · {t.free}</span>
                </button>
              ))}
            </div>
            <div className="row">
              <button onClick={write} disabled={busy || !brief.trim() || !picked.length}>
                {busy ? "Writing…" : "Write prompts"}
              </button>
              {busy && <span className="status"><span className="dot" />Thinking through the idea, then each tool…</span>}
            </div>
            {error && <p className="err">{error}</p>}
          </div>
        </section>

        <section>
          {!pack ? (
            <div className="canvas"><p className="empty">{busy ? "Working…" : "Your prompts appear here."}</p></div>
          ) : (
            <div className="pack">
              <p className="concept">{pack.concept}</p>
              {demo && <p className="meta">Demo output. Add a key for real prompts.</p>}
              {pack.targets.map((t) => {
                const info = targetsById.get(t.id);
                return (
                  <article key={t.id} className="card">
                    <header>
                      <div>
                        <strong>{info?.name ?? t.id}</strong>
                        {info && <span className="badge kind">{KIND_LABEL[info.kind]}</span>}
                      </div>
                      <div className="row tight">
                        <CopyButton text={t.prompt} label="Copy prompt" />
                        {info && <a href={info.url} target="_blank" rel="noopener noreferrer"><button className="ghost">Open ↗</button></a>}
                      </div>
                    </header>
                    <pre className="prompt">{t.prompt}</pre>
                    {t.settings.length > 0 && (
                      <div className="chips">
                        {t.settings.map((s, i) => <span key={i} className="chip mono">{s.label}: {s.value}</span>)}
                      </div>
                    )}
                    {t.extras.map((x, i) => (
                      <div key={i} className="extra">
                        <div className="row between tight">
                          <span className="extra-label">{x.label}</span>
                          <CopyButton text={x.value} label={`Copy ${x.label}`} small />
                        </div>
                        <pre className="prompt">{x.value}</pre>
                      </div>
                    ))}
                    {t.tip && <p className="tip">{t.tip}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CopyButton({ text, label, small }: { text: string; label: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // Clipboard blocked: select-all fallback is the user's, we just say so.
      alert("Copy blocked by the browser. Select the text and press Ctrl+C.");
    }
  }
  return (
    <button type="button" className={small ? "ghost small" : ""} onClick={copy} aria-live="polite">
      {done ? "Copied ✓" : label}
    </button>
  );
}
