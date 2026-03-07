"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";

/* ── Nav ────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn, username } = useSession();
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav className={`nav-glass${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 18 }}>bolt</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em", color: "var(--fg)" }}>
            MARKET<span style={{ color: "var(--primary-light)" }}>READY</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isLoggedIn ? (
            <>
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", marginRight: 4 }}>
                Hey, <strong style={{ color: "var(--fg)" }}>{username}</strong>
              </span>
              <Link href="/student/readiness" className="btn btn-primary btn-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>dashboard</span>
                Dashboard →
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Get Started →</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ── Floating orb ─────────────────────────────────────────── */
function Orb({ size, color, style: extraStyle }: { size: number; color: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute",
      width: size, height: size,
      borderRadius: "50%",
      background: color,
      filter: `blur(${size * 0.6}px)`,
      opacity: 0.18,
      pointerEvents: "none",
      ...extraStyle,
    }} />
  );
}

/* ── MRI Ring preview ───────────────────────────────────── */
function MRIPreview() {
  const r = 52, stroke = 9, circ = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);

  const TARGET_TOTAL = 85;
  const TARGET_FEDERAL = 88;
  const TARGET_MARKET = 82;
  const TARGET_EVIDENCE = 85;

  const score = Math.round(progress * TARGET_TOTAL);
  const federalPct = Math.round(progress * TARGET_FEDERAL);
  const marketPct = Math.round(progress * TARGET_MARKET);
  const evidencePct = Math.round(progress * TARGET_EVIDENCE);

  useEffect(() => {
    const t = setTimeout(() => {
      let p = 0;
      const iv = setInterval(() => {
        p = Math.min(p + 0.02, 1);
        setProgress(p);
        if (p >= 1) clearInterval(iv);
      }, 22);
      return () => clearInterval(iv);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const offset = circ * (1 - Math.min(score / 100, 1));

  return (
    <div style={{
      background: "rgba(11,11,30,0.95)",
      border: "1px solid rgba(124,58,237,0.3)",
      borderRadius: 20, padding: "24px",
      backdropFilter: "blur(24px)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 16 }}>analytics</span>
          </div>
          <div>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--fg-2)", display: "block" }}>Market-Ready Index</span>
            <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>Sample Profile</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 9999, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em" }}>Demo</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle cx="65" cy="65" r={r} fill="none"
              stroke="url(#mriGrad)" strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.05s linear" }} />
            <defs>
              <linearGradient id="mriGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2.1rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#a78bfa", lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>MRI</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
          {[
            { label: "Federal Standards", pct: federalPct, color: "#7c3aed" },
            { label: "Market Demand", pct: marketPct, color: "#06b6d4" },
            { label: "Evidence Density", pct: evidencePct, color: "#22c55e" },
          ].map(b => (
            <div key={b.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: 5 }}>
                <span style={{ color: "var(--muted)" }}>{b.label}</span>
                <span style={{ color: "var(--fg-2)", fontWeight: 700 }}>{b.pct}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 4, transition: "width 0.05s linear" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["React", "Python", "AWS", "TypeScript", "Go"].map(s => (
          <span key={s} style={{ fontSize: "0.65rem", fontWeight: 600, padding: "3px 10px", borderRadius: 9999, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>{s}</span>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 16, fontVariationSettings: "'FILL' 1" }}>verified</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#22c55e" }}>Market Ready — Top tier of verified CS talent</span>
      </div>
    </div>
  );
}

/* ── Testimonial ────────────────────────────────────────── */
function Testimonial({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px",
      display: "flex", flexDirection: "column", gap: 16, transition: "all 0.3s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.3)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", gap: 3 }}>{[...Array(5)].map((_, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 14 }}>★</span>)}</div>
      <p style={{ fontSize: "0.875rem", color: "var(--fg-2)", lineHeight: 1.75, flex: 1 }}>&ldquo;{quote}&rdquo;</p>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--fg)" }}>{name}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{role}</div>
      </div>
    </div>
  );
}

/* ── Resume Hook ────────────────────────────────────────── */
function ResumeHook() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setAnalyzing(true);
    setDone(false);
    // Store file in sessionStorage so it can be auto-uploaded after account creation
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataUrl = e.target?.result as string;
        sessionStorage.setItem("pending_resume_name", file.name);
        sessionStorage.setItem("pending_resume_type", file.type || "application/octet-stream");
        sessionStorage.setItem("pending_resume_data", dataUrl);
      } catch { /* sessionStorage unavailable or full — ignore */ }
    };
    reader.readAsDataURL(file);
    setTimeout(() => { setAnalyzing(false); setDone(true); }, 2200);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>No account needed to start</div>
        <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          See Your Real Market Score —{" "}
          <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Free</span>
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--muted)", marginBottom: 36 }}>
          Drop your resume and we&apos;ll show you exactly where you stand in the market.
        </p>

        {!done ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !analyzing && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "rgba(124,58,237,0.7)" : "rgba(124,58,237,0.3)"}`,
              borderRadius: 16, padding: "48px 32px",
              background: dragging ? "rgba(124,58,237,0.06)" : "rgba(124,58,237,0.02)",
              cursor: analyzing ? "default" : "pointer",
              transition: "all 0.2s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {analyzing ? (
              <>
                <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(124,58,237,0.2)", borderTop: "3px solid #7c3aed", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "0.9rem", color: "var(--fg-2)", fontWeight: 600 }}>Analyzing structure of {fileName}…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 40 }}>upload_file</span>
                <span style={{ fontSize: "0.9rem", color: "var(--fg-2)", fontWeight: 600 }}>
                  {fileName ? fileName : "Drop your resume here or click to browse"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>PDF, DOCX, or TXT — nothing is stored until you sign up</span>
              </>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: 16, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)", padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 28, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>Your MRI score is being generated</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Create a free account to see your full breakdown and personalized gaps.</div>
            </div>
            <Link href={`/register?source=resume_hook`} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 12,
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              color: "#fff", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            }}>
              Create Account &amp; See My Score
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", minHeight: "100dvh", overflowX: "hidden" }}>
      <Nav />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", paddingTop: 100, paddingBottom: 80 }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <Orb size={700} color="#7c3aed" style={{ top: "-5%", left: "-15%" }} />
          <Orb size={550} color="#06b6d4" style={{ top: "5%", right: "-12%", animationDelay: "2s" }} />
          <Orb size={400} color="#f43f5e" style={{ bottom: "0%", left: "25%", animationDelay: "4s" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 24px", width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 64, alignItems: "center" }}>
            {/* Copy */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px 5px 9px", borderRadius: 9999, border: "1px solid rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.08)", marginBottom: 28 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa" }}>Early Access — Completely Free</span>
              </div>
              <h1 style={{ fontSize: "clamp(2.8rem,5.2vw,4.8rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 24 }}>
                Stop Being<br />
                <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4,#a78bfa)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradientShift 5s ease infinite" }}>Hireable.</span>
                <br />Start Being<br />
                <span style={{ background: "linear-gradient(135deg,#f43f5e,#a78bfa,#06b6d4)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradientShift 5s ease infinite 1s" }}>Undeniable.</span>
              </h1>
              <p style={{ fontSize: "1.05rem", color: "var(--fg-2)", lineHeight: 1.72, maxWidth: 500, marginBottom: 36 }}>
                The traditional resume is dead. We build your proof-of-work profile using real market signals, GitHub evidence, and AI-driven insights — putting you in the top tier of CS talent.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Build My MRI Score
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                </Link>
                <a href="#how-it-works" className="btn btn-glass btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
                  See How It Works
                </a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex" }}>
                  {["#7c3aed","#06b6d4","#f43f5e","#22c55e","#f59e0b"].map((c, i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: "2px solid var(--bg)", marginLeft: i > 0 ? -9 : 0 }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--fg)" }}>Be among the first</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>early access program · completely free</div>
                </div>
              </div>
            </div>

            {/* MRI Preview */}
            <div style={{ animation: "float 6s ease-in-out infinite" }}>
              <MRIPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ══ TICKER ════════════════════════════════════════════ */}
      <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "10px 0", background: "rgba(124,58,237,0.04)" }}>
        <div style={{ display: "flex", minWidth: "max-content", animation: "tickerScroll 40s linear infinite", willChange: "transform" }}>
          {["React · 92k jobs", "Python · 148k jobs", "AWS · 87k jobs", "TypeScript · 71k jobs",
            "Kubernetes · 43k jobs", "Go · 38k jobs", "System Design · 95k jobs", "ML Ops · 52k jobs",
            "Rust · 19k jobs", "SQL · 124k jobs", "Docker · 67k jobs", "Node.js · 58k jobs"].map((item, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 28px", fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>
              <span style={{ color: "#a78bfa" }}>{item.split("·")[0].trim()}</span>
              <span style={{ color: "var(--muted-2)" }}>·</span>
              <span>{item.split("·")[1]?.trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section id="how-it-works" style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>The process</div>
          <h2 style={{ fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
            From resume to{" "}
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>undeniable</span>
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { n: "01", icon: "description", title: "Upload your resume", desc: "Instant draft MRI score generated from your existing experience, skills, and education.", color: "#7c3aed" },
            { n: "02", icon: "hub", title: "Connect GitHub", desc: "AI verifies your skills in real code — commits, repos, languages, and contribution depth.", color: "#06b6d4" },
            { n: "03", icon: "search_insights", title: "See your gaps", desc: "Get a personalized breakdown: what you have, what&apos;s missing, and what the market values most right now.", color: "#f59e0b" },
            { n: "04", icon: "rocket_launch", title: "Build evidence", desc: "Follow your 90-day roadmap. Ship proof artifacts. Watch your score rise as you close each gap.", color: "#22c55e" },
            { n: "05", icon: "share", title: "Share your verified profile", desc: "Recruiters see proof, not claims. A QR-code shareable page with your full evidence stack.", color: "#f43f5e" },
          ].map((step, i) => (
            <div key={step.n} style={{ display: "flex", gap: 24, padding: "28px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${step.color}15`, border: `1px solid ${step.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: step.color, fontSize: 22 }}>{step.icon}</span>
                </div>
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: step.color, fontWeight: 700 }}>{step.n}</span>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--fg)" }}>{step.title}</h3>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ BENTO FEATURES ════════════════════════════════════ */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Everything you need</div>
          <h2 style={{ fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Built for the era of<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>proof-first hiring</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--muted)", marginTop: 16, maxWidth: 480, margin: "16px auto 0" }}>
            Stop gambling with generic resumes. Get quantified, verifiable signals that make recruiters compete for you.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {/* MRI wide */}
          <div style={{ gridColumn: "span 2", background: "linear-gradient(135deg, var(--surface) 0%, rgba(124,58,237,0.08) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px", transition: "all 0.3s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.3)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 26 }}>monitoring</span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 10 }}>Market-Ready Index (MRI)</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 400 }}>
              A single composite score built from three real signals: federal employer standards (40%), live market demand (30%), and your evidence density (30%). Updated daily from 50k+ job postings.
            </p>
            <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["40% Federal Standards", "30% Market Demand", "30% Evidence"].map((b, i) => (
                <span key={b} style={{ fontSize: "0.7rem", fontWeight: 600, padding: "4px 12px", borderRadius: 9999, background: ["rgba(124,58,237,0.1)","rgba(6,182,212,0.1)","rgba(34,197,94,0.1)"][i], color: ["#a78bfa","#06b6d4","#22c55e"][i], border: `1px solid ${["rgba(124,58,237,0.25)","rgba(6,182,212,0.25)","rgba(34,197,94,0.25)"][i]}` }}>{b}</span>
              ))}
            </div>
          </div>

          {/* AI tall */}
          <div style={{ background: "linear-gradient(180deg, var(--surface) 0%, rgba(6,182,212,0.07) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px", transition: "all 0.3s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(6,182,212,0.3)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ color: "#06b6d4", fontSize: 24 }}>psychology</span>
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>AI Skill Verification</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
              LLMs analyze your GitHub commits, PR descriptions, and code quality to verify skill claims — not just buzzwords.
            </p>
            <div style={{ padding: "12px 14px", background: "rgba(6,182,212,0.06)", borderRadius: 10, border: "1px solid rgba(6,182,212,0.15)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "#06b6d4", lineHeight: 2 }}>
                <div>✓ React: 847 production commits</div>
                <div>✓ AWS: 12 deployed services</div>
                <div>✓ Python: 94th percentile</div>
              </div>
            </div>
          </div>

          {/* 3 smaller cards */}
          {[
            { icon: "hub", title: "GitHub Proof Engine", desc: "Extract language depth, commit patterns, project complexity, and collaboration signals from every repo.", accent: "#22c55e" },
            { icon: "trending_up", title: "Live Market Intel", desc: "Powered by Adzuna and O*NET APIs, tracking 50k+ job postings daily. Your checklist updates in real-time.", accent: "#f59e0b" },
            { icon: "view_kanban", title: "90-Day Sprint Board", desc: "AI generates a personalized 12-task roadmap synced to your GitHub. Track progress, ship proof every week.", accent: "#f43f5e" },
          ].map(f => (
            <div key={f.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px", transition: "all 0.3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${f.accent}40`; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.accent}15`, border: `1px solid ${f.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <span className="material-symbols-outlined" style={{ color: f.accent, fontSize: 22 }}>{f.icon}</span>
              </div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}

          {/* Wide bottom card */}
          <div style={{ gridColumn: "span 3", background: "linear-gradient(135deg, rgba(244,63,94,0.05) 0%, var(--surface) 40%, rgba(124,58,237,0.05) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
              {[
                { icon: "share", title: "Public Profile + QR", desc: "Shareable proof-of-work page with QR code for career fairs and interviews." },
                { icon: "description", title: "Resume Architect", desc: "AI-powered resume builder using your verified proof signals and market alignment." },
                { icon: "school", title: "Interview Coach", desc: "Domain-specific prep sessions based on your actual skill gaps and target roles." },
                { icon: "radar", title: "Sentinel Alerts", desc: "Get notified instantly when market shifts require action on your profile." },
              ].map(f => (
                <div key={f.title}>
                  <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 22, marginBottom: 10, display: "block" }}>{f.icon}</span>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6, color: "var(--fg)" }}>{f.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHAT WE ANALYZE ═══════════════════════════════════ */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>What we analyze</div>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Three real signals, one honest score
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { icon: "description", title: "Resume Data", color: "#7c3aed", items: ["Skills and proficiency claims", "Work experience and projects", "Education and certifications"] },
              { icon: "hub", title: "GitHub Activity", color: "#06b6d4", items: ["Commit depth and code quality", "Repos, languages, complexity", "Collaboration and open-source"] },
              { icon: "trending_up", title: "Live Market Intel", color: "#22c55e", items: ["50,000+ daily job postings analyzed", "Skills employers are hiring for now", "Pathway-specific demand trends"] },
            ].map(col => (
              <div key={col.title} style={{ background: "var(--void)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${col.color}15`, border: `1px solid ${col.color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ color: col.color, fontSize: 22 }}>{col.icon}</span>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 14, color: "var(--fg)" }}>{col.title}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.items.map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: col.color, fontSize: 13 }}>→</span>
                      <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MRI METHODOLOGY ═══════════════════════════════════ */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>How your score is built</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
            The MRI formula, explained
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
            No black boxes. Three independently scored components, weighted by what employers actually care about.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            {
              weight: "40%", label: "Federal Standards", color: "#7c3aed", icon: "gavel",
              desc: "Based on NICE Cybersecurity and O*NET workforce frameworks — the same standards federal employers and top tech companies use to benchmark talent. Non-negotiable skills are scored as present or absent.",
            },
            {
              weight: "30%", label: "Market Demand", color: "#06b6d4", icon: "trending_up",
              desc: "We scan 50,000+ live job postings every day. Skills that employers are actively hiring for right now carry more weight. Your score reflects what the market needs today, not last year.",
            },
            {
              weight: "30%", label: "Evidence Density", color: "#22c55e", icon: "verified",
              desc: "How much proof you have for each skill. A GitHub repo, certificate, or portfolio project is worth more than a self-assessment. AI-verified proof earns a higher score than a claim alone.",
            },
          ].map(card => (
            <div key={card.label} style={{ background: "var(--surface)", border: `1px solid ${card.color}30`, borderRadius: 20, padding: "28px", borderTop: `3px solid ${card.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: `${card.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: card.color, fontSize: 20 }}>{card.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.weight}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>{card.label}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.75 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TESTIMONIALS ══════════════════════════════════════ */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Student feedback</div>
            <h2 style={{ fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              From the students who<br />
              <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>made it happen</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            <Testimonial
              quote="I finally understood exactly what employers were looking for. The gap analysis showed me skills I had never thought to document — and how to prove them."
              name="Alex Chen"
              role="CS Senior, UC Berkeley"
            />
            <Testimonial
              quote="The GitHub proof engine found patterns in my code I hadn&apos;t thought to mention. Recruiters now ask me about specific projects before the interview even starts."
              name="Priya Patel"
              role="Software Engineer Candidate"
            />
            <Testimonial
              quote="The market intel showed me which skills were trending before the job postings spiked. I was already prepared when the opportunities came."
              name="Marcus Johnson"
              role="Recent CS Graduate"
            />
          </div>
        </div>
      </section>

      {/* ══ RESUME HOOK ═══════════════════════════════════════ */}
      <ResumeHook />

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{
          position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 50%, rgba(244,63,94,0.08) 100%)",
          border: "1px solid rgba(124,58,237,0.3)", borderRadius: 28, padding: "72px 48px", textAlign: "center",
        }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <Orb size={500} color="#7c3aed" style={{ top: "-30%", left: "-10%" }} />
            <Orb size={400} color="#06b6d4" style={{ bottom: "-30%", right: "-5%" }} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 20 }}>The offer is waiting</div>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16, lineHeight: 1.1 }}>
              Your first MRI score is<br />
              <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>completely free.</span>
            </h2>
            <p style={{ fontSize: "1rem", color: "var(--muted)", maxWidth: 440, margin: "0 auto 36px" }}>
              Stop hoping and start proving. Setup takes 3 minutes.
            </p>
            <Link href="/register" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "15px 36px", borderRadius: 14,
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              color: "#fff", fontWeight: 800, fontSize: "1rem", textDecoration: "none",
              boxShadow: "0 8px 32px rgba(124,58,237,0.45)",
              transition: "all 0.2s",
            }}>
              Get My Free MRI Score
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "56px 24px 32px", background: "var(--void)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 16 }}>bolt</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.75, maxWidth: 230 }}>
              Proof-first career acceleration for CS students. Stop being hireable. Start being undeniable.
            </p>
          </div>
          {[
            { title: "Product", links: ["MRI Score", "Checklist", "GitHub Proof", "Resume Architect", "Interview Coach"] },
            { title: "Company", links: ["About"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "FERPA Compliance"] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted-2)", marginBottom: 16 }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--fg-2)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>© 2026 MarketReady. Built for the proof-first generation.</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["Twitter", "LinkedIn", "GitHub"].map(s => (
              <a key={s} href="#" style={{ fontSize: "0.72rem", color: "var(--muted-2)", textDecoration: "none", padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--fg)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted-2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}>{s}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
