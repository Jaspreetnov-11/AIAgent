"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentOptions, DesignSpec, ReferenceImage, ScoredCritique } from "@/lib/types";

type RoundView = {
  round: number;
  source?: "plan" | "revise" | "human";
  spec?: DesignSpec;
  images: string[];
  imageError?: string;
  critique?: ScoredCritique;
};
type Best = { round: number; index: number; dataUrl: string; spec: DesignSpec; total: number; reason: "passed" | "max_rounds" | "quick" };
type MockInfo = { mock: boolean; forced: boolean; missing: string[] };

const DEFAULTS: AgentOptions = { mode: "quick", maxRounds: 3, candidates: 1, quality: "high", threshold: 8 };

export default function Studio() {
  const [brief, setBrief] = useState("");
  const [refs, setRefs] = useState<ReferenceImage[]>([]);
  const [options, setOptions] = useState<AgentOptions>(DEFAULTS);
  const [rounds, setRounds] = useState<RoundView[]>([]);
  const [status, setStatus] = useState("");
  const [best, setBest] = useState<Best | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [running, setRunning] = useState(false);
  const [mockInfo, setMockInfo] = useState<MockInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const offsetRef = useRef(0);
  const quick = options.mode === "quick";

  useEffect(() => {
    fetch("/api/agent").then((r) => r.json()).then(setMockInfo).catch(() => setMockInfo(null));
  }, []);

  // ---- references ----
  function addFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).slice(0, 4 - refs.length).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () =>
        setRefs((r) => [...r, { name: f.name, dataUrl: String(reader.result), role: "style", useInRender: false }]);
      reader.readAsDataURL(f);
    });
  }
  const updateRef = (i: number, patch: Partial<ReferenceImage>) =>
    setRefs((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  // ---- agent run (streams NDJSON) ----
  async function run(resume?: { spec: DesignSpec; feedback: string; image?: string }) {
    setRunning(true);
    setError("");
    setBest(null);
    if (!resume) {
      setRounds([]);
      offsetRef.current = 0;
    }
    const offset = offsetRef.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const upsert = (round: number, patch: (r: RoundView) => RoundView) =>
      setRounds((rs) => {
        const n = round + offset;
        const i = rs.findIndex((r) => r.round === n);
        if (i === -1) return [...rs, patch({ round: n, images: [] })];
        return rs.map((r, k) => (k === i ? patch(r) : r));
      });

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, references: refs, options, resume }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let lastRound = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as AgentEvent;
          lastRound = Math.max(lastRound, ev.round);
          switch (ev.type) {
            case "status": setStatus(`Round ${ev.round + offset} · ${ev.message}`); break;
            case "spec": upsert(ev.round, (r) => ({ ...r, spec: ev.spec, source: ev.source })); break;
            case "image": upsert(ev.round, (r) => { const images = [...r.images]; images[ev.index] = ev.dataUrl; return { ...r, images }; }); break;
            case "image_error": upsert(ev.round, (r) => ({ ...r, imageError: ev.message })); break;
            case "critique": upsert(ev.round, (r) => ({ ...r, critique: ev.critique })); break;
            case "done": setBest({ ...ev, round: ev.round + offset }); break;
            case "error": setError(ev.message); break;
          }
        }
      }
      offsetRef.current = offset + lastRound;
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setRunning(false);
      setStatus("");
      abortRef.current = null;
    }
  }

  const stop = () => abortRef.current?.abort();

  return (
    <main className="wrap">
      <header className="head">
        <div>
          <h1>Design agent</h1>
          <p className="tag">Claude art-directs and critiques. GPT Image renders. The loop runs until the work is good, or you step in.</p>
        </div>
        <div className="loop" aria-hidden>
          <span>brief</span><i /><span>spec</span><i /><span>render</span><i /><span>critique</span><b>↺</b>
        </div>
      </header>

      {mockInfo?.mock && (
        <div className="notice" role="status">
          <strong>Demo mode, no real images.</strong>{" "}
          {mockInfo.missing.length > 0
            ? <>Add {mockInfo.missing.join(" and ")} to <code>.env.local</code> and restart <code>npm run dev</code>.</>
            : <>Set <code>AGENT_MOCK=0</code> in <code>.env.local</code> and restart <code>npm run dev</code>.</>}
        </div>
      )}

      <div className="grid">
        {/* ------------------------------------------------ left: brief + controls */}
        <section>
          <div className={`step ${!rounds.length ? "live" : ""}`}>
            <h2>Brief</h2>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={running}
              placeholder="e.g. Diwali greeting for a state tourism department. Hindi headline 'शुभ दीपावली'. Warm evening light, clay diyas, space for the logo bottom-right."
            />
          </div>

          <div className="step">
            <h2>References <span className="meta">optional · logo, style, product</span></h2>
            <label className={`drop ${refs.length >= 4 ? "off" : ""}`}>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden disabled={running || refs.length >= 4} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              Drop images or click to add ({refs.length}/4)
            </label>
            {refs.length > 0 && (
              <ul className="refs">
                {refs.map((r, i) => (
                  <li key={i}>
                    <img src={r.dataUrl} alt={r.name} />
                    <div className="refmeta">
                      <div className="refname" title={r.name}>{r.name}</div>
                      <div className="row tight">
                        <select value={r.role} disabled={running} onChange={(e) => updateRef(i, { role: e.target.value as ReferenceImage["role"] })}>
                          <option value="logo">logo</option>
                          <option value="style">style reference</option>
                          <option value="content">product / subject</option>
                        </select>
                        <label className="check">
                          <input type="checkbox" checked={r.useInRender} disabled={running} onChange={(e) => updateRef(i, { useInRender: e.target.checked })} />
                          composite into render
                        </label>
                        <button className="x" disabled={running} onClick={() => setRefs((rs) => rs.filter((_, k) => k !== i))} aria-label="Remove">×</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="step">
            <h2>Mode</h2>
            <div className="opts">
              <label className="span2">How it runs
                <select value={options.mode} disabled={running} onChange={(e) => setOptions({ ...options, mode: e.target.value as AgentOptions["mode"] })}>
                  <option value="quick">Quick: brief → prompt → image</option>
                  <option value="loop">Agent loop: render, critique, revise</option>
                </select>
              </label>
              {!quick && (
                <label>Rounds
                  <select value={options.maxRounds} disabled={running} onChange={(e) => setOptions({ ...options, maxRounds: Number(e.target.value) })}>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
              <label>{quick ? "Images" : "Candidates / round"}
                <select value={options.candidates} disabled={running} onChange={(e) => setOptions({ ...options, candidates: Number(e.target.value) })}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label>Quality
                <select value={options.quality} disabled={running} onChange={(e) => setOptions({ ...options, quality: e.target.value as AgentOptions["quality"] })}>
                  <option value="low">low (fast)</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              {!quick && (
                <label>Ship at
                  <select value={options.threshold} disabled={running} onChange={(e) => setOptions({ ...options, threshold: Number(e.target.value) })}>
                    {[7, 7.5, 8, 8.5, 9].map((n) => <option key={n} value={n}>{n} / 10</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="row">
              {running ? (
                <button className="ghost" onClick={stop}>Stop</button>
              ) : (
                <button onClick={() => run()} disabled={!brief.trim()}>{quick ? "Generate" : "Run agent"}</button>
              )}
              {status && <span className="status"><span className="dot" />{status}</span>}
            </div>
            {error && <p className="err">{error}</p>}
          </div>
        </section>

        {/* ------------------------------------------------ right: result */}
        <section>
          <div className="canvas">
            {best ? (
              <img src={best.dataUrl} alt={best.spec.concept} />
            ) : running && rounds.length ? (
              <LiveGrid rounds={rounds} />
            ) : (
              <p className="empty">{running ? "Working…" : "The approved image appears here."}</p>
            )}
          </div>

          {best && (
            <div className="result">
              <div className="row between">
                <div>
                  <span className={`badge ${best.reason === "max_rounds" ? "warn" : "ok"}`}>
                    {best.reason === "quick" ? "Rendered" : best.reason === "passed" ? `Approved · ${best.total.toFixed(1)} / 10` : `Best of run · ${best.total.toFixed(1)} / 10`}
                  </span>
                  <span className="meta"> round {best.round}, candidate {best.index + 1} · {best.spec.size}</span>
                </div>
                <a href={best.dataUrl} download={`limelight-r${best.round}-c${best.index + 1}.png`}><button className="ghost">Download PNG</button></a>
              </div>
              <p className="concept">{best.spec.concept}</p>
              <div className="row">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={running}
                  style={{ minHeight: 64 }}
                  placeholder="Your note to the art director, e.g. warmer light, headline bigger, lose the second diya"
                />
                <button disabled={running || !feedback.trim()} onClick={() => { const f = feedback; setFeedback(""); run({ spec: best.spec, feedback: f, image: best.dataUrl }); }}>
                  Push it further
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ------------------------------------------------ rounds */}
      {rounds.length > 0 && (
        <section className="rounds">
          <h2 className="rh">Rounds</h2>
          {rounds.map((r) => <RoundCard key={r.round} r={r} best={best} />)}
        </section>
      )}
    </main>
  );
}

function LiveGrid({ rounds }: { rounds: RoundView[] }) {
  const last = rounds[rounds.length - 1];
  if (!last.images.length) return <p className="empty">Round {last.round}: {last.spec?.concept ?? "planning…"}</p>;
  return <div className="live-grid">{last.images.map((img, i) => <img key={i} src={img} alt={`candidate ${i + 1}`} />)}</div>;
}

function RoundCard({ r, best }: { r: RoundView; best: Best | null }) {
  const src = { plan: "Plan", revise: "Revision from the critic", human: "Revision from your note" }[r.source ?? "plan"];
  return (
    <article className="round">
      <header>
        <span className="rn">Round {r.round}</span>
        <span className="meta">{src}</span>
        {r.critique && (
          <span className={`badge ${r.critique.pass ? "ok" : "warn"}`}>
            {r.critique.pass ? "Approved" : "Sent back"} · best {r.critique.best_total.toFixed(1)}
          </span>
        )}
      </header>

      {r.spec && (
        <div className="spec">
          <p className="concept">{r.spec.concept}</p>
          <p className="meta">{r.spec.rationale}</p>
          <div className="chips">
            <span className="chip mono">{r.spec.size}</span>
            {r.spec.text_to_render.map((t) => <span key={t} className="chip">“{t}”</span>)}
            {r.spec.palette.map((c) => <span key={c} className="swatch" style={{ background: c }} title={c} />)}
          </div>
          <details>
            <summary>Prompt</summary>
            <pre>{r.spec.prompt}</pre>
            {r.spec.avoid.length > 0 && <p className="meta">Avoid: {r.spec.avoid.join("; ")}</p>}
          </details>
        </div>
      )}

      {r.imageError && <p className="err">{r.imageError}</p>}

      {r.images.length > 0 && (
        <div className="cands">
          {r.images.map((img, i) => {
            const s = r.critique?.candidates.find((c) => c.index === i);
            const isBest = best?.round === r.round && best.index === i;
            const isRoundBest = r.critique?.best_index === i;
            return (
              <figure key={i} className={`cand ${isBest ? "best" : ""}`}>
                <img src={img} alt={`Round ${r.round} candidate ${i + 1}`} />
                <figcaption>
                  <div className="row between">
                    <strong>#{i + 1}{isRoundBest ? " · pick" : ""}</strong>
                    {s ? <span className="score">{s.total.toFixed(1)}</span> : null}
                  </div>
                  {s && (
                    <>
                      <div className="dims">
                        {(["brief", "brand", "text", "composition", "craft"] as const).map((k) => (
                          <span key={k} title={k}><em>{k.slice(0, 4)}</em>{s[k]}</span>
                        ))}
                      </div>
                      <p className="verdict">{s.verdict}</p>
                      {s.issues.length > 0 && <ul className="issues">{s.issues.map((x, k) => <li key={k}>{x}</li>)}</ul>}
                    </>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {r.critique && r.critique.direction.length > 0 && (
        <div className="direction">
          <strong>Direction for the next round</strong>
          <ol>{r.critique.direction.map((d, k) => <li key={k}>{d}</li>)}</ol>
        </div>
      )}
    </article>
  );
}
