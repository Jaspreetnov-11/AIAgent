"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Mascot, Mark } from "@/components/Mascot";

type Status = { provider: "gemini" | "anthropic" | "none"; model: string };

const NAV: [string, string, ReactNode][] = [
  ["/", "Prompts", <NavIcon key="p" d="M4 6h16M4 12h10M4 18h14" />],
  ["/content", "Content", <NavIcon key="c" d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />],
  ["/schedule", "Schedule", <NavIcon key="s" d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />],
];

function NavIcon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [embed, setEmbed] = useState(false);

  useEffect(() => {
    fetch("/api/prompts").then((r) => r.json()).then(setStatus).catch(() => setStatus({ provider: "none", model: "" }));
    // ?embed=1 hides the shell so a page can sit inside Lighthouse's own layout.
    try { setEmbed(new URLSearchParams(window.location.search).get("embed") === "1"); } catch {}
  }, []);

  if (embed) return <div className="content">{children}</div>;

  const live = status && status.provider !== "none";
  const label = !status ? "Connecting…" : status.provider === "gemini" ? "Live · Gemini" : status.provider === "anthropic" ? "Live · Claude" : "No key · demo mode";

  return (
    <div className="app">
      <aside className="side">
        <div className="side-logo">
          <a href="/" className="brand"><img src="/logo.png" alt="limelight" /></a>
        </div>
        <nav className="nav">
          {NAV.map(([href, label, icon]) => (
            <a key={href} href={href} className={path === href ? "active" : ""}>{icon}<span>{label}</span></a>
          ))}
        </nav>
        <div className="side-mascot" aria-hidden><Mascot /></div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="mark"><Mark /></span>
          <span className={`sync ${live ? "on" : "off"}`}><i /><span>{label}</span></span>
          <a className="tb-btn tb-text-btn" href="/schedule">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            <span className="tb-text">Calendar</span>
          </a>
          <a className="tb-btn solid" href="/"><span className="tb-text">New brief</span><span className="tb-plus">+</span></a>
          <span className="tb-btn tb-avatar"><span className="avatar">L</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg></span>
        </header>

        <section className="screen">{children}</section>

        <nav className="bnav" aria-label="Main">
          {NAV.map(([href, label, icon]) => (
            <a key={href} href={href} className={path === href ? "active" : ""}>{icon}<span>{label}</span></a>
          ))}
        </nav>
      </div>
    </div>
  );
}
