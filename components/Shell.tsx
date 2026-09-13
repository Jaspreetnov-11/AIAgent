"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type Status = { provider: "gemini" | "anthropic" | "none"; model: string };

const TABS = [
  { href: "/", label: "Prompts" },
  { href: "/content", label: "Content" },
  { href: "/schedule", label: "Schedule" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [embed, setEmbed] = useState(false);

  useEffect(() => {
    fetch("/api/prompts").then((r) => r.json()).then(setStatus).catch(() => setStatus({ provider: "none", model: "" }));
    // ?embed=1 hides the header and footer so the page can sit inside another app's iframe.
    try { setEmbed(new URLSearchParams(window.location.search).get("embed") === "1"); } catch {}
  }, []);

  if (embed) return <>{children}</>;

  const label = !status ? "Connecting" : status.provider === "gemini" ? "Gemini connected" : status.provider === "anthropic" ? "Claude connected" : "No key · demo";

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="logo" href="/">
            <svg viewBox="0 0 40 40" fill="none" stroke="var(--cyan)" strokeWidth="2.2" aria-hidden>
              <path d="M20 3 35 11.5v17L20 37 5 28.5v-17L20 3z" />
              <path d="M20 11 28 15.5v9L20 29l-8-4.5v-9L20 11z" opacity=".7" />
            </svg>
            <span>Prompt studio</span>
          </a>
          <nav className="tabs">
            {TABS.map((t) => (
              <a key={t.href} href={t.href} className={path === t.href ? "on" : ""}>{t.label}</a>
            ))}
          </nav>
          <div className="top-right">
            <span className="pill-status" title={status?.model || ""}>
              <span className={`dot ${status && status.provider === "none" ? "off" : ""}`} />
              <span className="lbl">{label}</span>
              <span className="chev">▾</span>
            </span>
            <span className="vbar" />
            <span className="avatar" aria-label="Limelight">L</span>
          </div>
        </div>
      </header>
      {children}
      <footer className="foot">
        <span className="deco"><i />Ideas across intelligence</span>
      </footer>
    </>
  );
}
