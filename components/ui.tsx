"use client";
import { useState, type ReactNode } from "react";

/** "01 / YOUR BRIEF" style section label with an optional right slot. */
export function Sec({ n, title, right }: { n: string; title: string; right?: ReactNode }) {
  return (
    <div className="sec">
      <span className="n">{n}</span>
      <span className="sl">/</span>
      <span>{title}</span>
      {right && <span className="r">{right}</span>}
    </div>
  );
}

export function CopyButton({ text, label = "Copy", className = "btn", done = "Copied ✓" }: { text: string; label?: string; className?: string; done?: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      alert("Copy blocked by the browser. Select the text and press Ctrl+C.");
    }
  }
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      <CopyIcon /> {ok ? done : label}
    </button>
  );
}

export function Writing({ label = "Writing" }: { label?: string }) {
  return (
    <div className="writing" role="status" aria-live="polite" aria-label={label}>
      <div className="writing-lines" aria-hidden>
        <i /><i /><i /><i />
        <span className="writing-cursor" />
      </div>
      <p className="writing-label" aria-hidden>
        {label}<span className="writing-dots"><b>.</b><b>.</b><b>.</b></span>
      </p>
    </div>
  );
}

export function Hero({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="hero">
      <div>
        <h1>{title} <span className="i" title={sub}>i</span></h1>
        <p>{sub}</p>
      </div>
    </div>
  );
}

/* ---------- icons (simple, monochrome, no third-party logos) ---------- */

export function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
export function OpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
export function BoltIcon() {
  return (
    <svg className="bolt" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
  );
}
export function BulbIcon() {
  return (
    <svg className="bulb" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </svg>
  );
}
export function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
export function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2zM5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17zM19 16l.7 1.6 1.6.7-1.6.7L19 20.6l-.7-1.6-1.6-.7 1.6-.7L19 16z" /></svg>
  );
}

/** One glyph per kind of output. */
export function KindIcon({ kind }: { kind: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "image":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-8 8" /></svg>;
    case "video":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><path d="M4 6v12M8 4v16M12 9v6M16 5v14M20 8v8" /></svg>;
    case "music":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><path d="M9 18V6l11-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>;
    case "voice":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case "text":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><path d="M4 6h16M4 12h10M4 18h14" /></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "instagram":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg>;
    case "facebook":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg>;
    case "linkedin":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10v7M8 7v.5M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></svg>;
    case "x":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><path d="M4 4l16 16M20 4 4 20" /></svg>;
    case "youtube_shorts":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><rect x="6" y="2" width="12" height="20" rx="3" /><path d="m10 9 5 3-5 3z" fill="currentColor" /></svg>;
    case "whatsapp":
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><path d="M4 20l1.5-4A8 8 0 1 1 8 18.5L4 20z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-.8-.8.8a4 4 0 0 1-2.2-2.2l.8-.8-.8-2L9 9.5z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" {...p} aria-hidden><circle cx="12" cy="12" r="9" /></svg>;
  }
}
