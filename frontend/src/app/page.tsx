"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";

/* ── Nav ─────────────────────────────────────────────────── */
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
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

/* ── Animated MRI Ring ──────────────────────────────────── */
function MRIRing({ score, size = 130, strokeWidth = 9 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size / 2) - (strokeWidth * 1.5);
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score / 100, 1));
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="url(#mriGrad)" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      <defs>
        <linearGradient id="mriGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Hero Score Card ────────────────────────────────────── */
function HeroScoreCard() {
  const [progress, setProgress] = useState(0);
  const TARGET = 87;

  useEffect(() => {
    const t = setTimeout(() => {
      let p = 0;
      const iv = setInterval(() => {
        p = Math.min(p + 0.018, 1);
        setProgress(p);
        if (p >= 1) clearInterval(iv);
      }, 20);
      return () => clearInterval(iv);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const score = Math.round(progress * TARGET);
  const federal = Math.round(progress * 91);
  const market = Math.round(progress * 84);
  const evidence = Math.round(progress * 86);

  return (
    <div style={{
      background: "rgba(11,11,30,0.97)",
      border: "1px solid rgba(124,58,237,0.3)",
      borderRadius: 22,
      padding: "24px",
      backdropFilter: "blur(24px)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 16 }}>analytics</span>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--fg-2)" }}>Market-Ready Index</div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>Jordan M. · Software Engineering</div>
          </div>
        </div>
        <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "3px 9px", borderRadius: 9999, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live</span>
      </div>

      {/* Score + Bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
          <MRIRing score={score} size={110} strokeWidth={8} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#a78bfa", lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: "0.55rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>MRI</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Federal Standards", pct: federal, color: "#7c3aed", weight: "40%" },
            { label: "Market Demand", pct: market, color: "#06b6d4", weight: "30%" },
            { label: "Evidence Density", pct: evidence, color: "#22c55e", weight: "30%" },
          ].map(b => (
            <div key={b.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.66rem", marginBottom: 4 }}>
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

      {/* Verified skills */}
      <div style={{ marginTop: 14, display: "flex", gap: 5, flexWrap: "wrap" }}>
        {[
          { label: "React", verified: true },
          { label: "Python", verified: true },
          { label: "AWS", verified: true },
          { label: "TypeScript", verified: true },
          { label: "SQL", verified: false },
        ].map(s => (
          <span key={s.label} style={{
            fontSize: "0.62rem", fontWeight: 600, padding: "3px 9px", borderRadius: 9999,
            background: s.verified ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${s.verified ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.08)"}`,
            color: s.verified ? "#a78bfa" : "var(--muted)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {s.verified && <span style={{ fontSize: 9, color: "#22c55e" }}>✓</span>}
            {s.label}
          </span>
        ))}
      </div>

      {/* Band */}
      <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", gap: 7 }}>
        <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 15, fontVariationSettings: "'FILL' 1" }}>verified</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22c55e" }}>Market Ready</span>
        <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: "auto" }}>Top 15% of applicants</span>
      </div>
    </div>
  );
}

/* ── Worked Example ─────────────────────────────────────── */
function WorkedExample() {
  const [active, setActive] = useState<number | null>(null);

  const steps = [
    {
      n: "01",
      color: "#7c3aed",
      weight: "× 0.40",
      label: "Federal Standards",
      score: 91,
      contribution: 36.4,
      detail: "Jordan has Python, React, SQL, and AWS certified — 4 of 5 non-negotiable skills for a Software Engineer role per O*NET framework. Missing: System Design.",
      items: [
        { name: "Python", status: "✓", note: "4 repos, 2k+ commits" },
        { name: "SQL / Databases", status: "✓", note: "3 projects" },
        { name: "React / Frontend", status: "✓", note: "AI-verified via GitHub" },
        { name: "AWS / Cloud", status: "✓", note: "12 deployed services" },
        { name: "System Design", status: "–", note: "No evidence found" },
      ],
    },
    {
      n: "02",
      color: "#06b6d4",
      weight: "× 0.30",
      label: "Market Demand",
      score: 84,
      contribution: 25.2,
      detail: "Live scan of 47,300 job postings today. React appears in 61% of roles, Python in 73%. System Design missing costs points here too.",
      items: [
        { name: "React", status: "↑", note: "61% of postings · High demand" },
        { name: "Python", status: "↑", note: "73% of postings · Very high" },
        { name: "AWS", status: "↑", note: "44% of postings · Rising" },
        { name: "TypeScript", status: "↑", note: "38% of postings" },
        { name: "System Design", status: "↓", note: "52% of postings · Gap" },
      ],
    },
    {
      n: "03",
      color: "#22c55e",
      weight: "× 0.30",
      label: "Evidence Density",
      score: 86,
      contribution: 25.8,
      detail: "GitHub-linked proof counts more than resume claims. Jordan has 847 React commits and 2 live AWS projects — strong evidence density.",
      items: [
        { name: "React", status: "✓", note: "847 commits · AI-verified" },
        { name: "AWS", status: "✓", note: "2 live projects" },
        { name: "Python", status: "✓", note: "Portfolio + cert" },
        { name: "SQL", status: "✓", note: "1 project demo" },
        { name: "System Design", status: "–", note: "No proof artifact" },
      ],
    },
  ];

  const total = steps.reduce((s, x) => s + x.contribution, 0);

  return (
    <section id="how-score-works" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "88px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>No black boxes</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>
            How Jordan&apos;s score was calculated
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", maxWidth: 480, margin: "0 auto" }}>
            A CS junior at Georgia Tech. Here&apos;s exactly what went into her 87 — component by component.
          </p>
        </div>

        {/* Step cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((step, i) => (
            <div
              key={step.n}
              onClick={() => setActive(active === i ? null : i)}
              style={{
                background: "var(--void)",
                border: `1px solid ${active === i ? step.color + "50" : "var(--border)"}`,
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            >
              {/* Row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: `${step.color}15`, border: `1px solid ${step.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: step.color }}>{step.n}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--fg)" }}>{step.label}</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: step.color, background: `${step.color}12`, padding: "2px 8px", borderRadius: 9999, border: `1px solid ${step.color}25` }}>{step.weight}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{step.detail}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: step.color, lineHeight: 1 }}>{step.score}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontWeight: 600 }}>raw score</div>
                </div>
                <div style={{ width: 1, height: 32, background: "var(--border)", flexShrink: 0 }} />
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--fg-2)", lineHeight: 1 }}>+{step.contribution.toFixed(1)}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontWeight: 600 }}>contribution</div>
                </div>
                <span className="material-symbols-outlined" style={{ color: "var(--muted)", fontSize: 18, transition: "transform 0.2s", transform: active === i ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>expand_more</span>
              </div>

              {/* Expanded breakdown */}
              {active === i && (
                <div style={{ borderTop: `1px solid ${step.color}20`, padding: "16px 20px 20px", background: `${step.color}05` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {step.items.map(item => (
                      <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                          background: item.status === "–" ? "rgba(255,255,255,0.05)" : `${step.color}15`,
                          color: item.status === "–" ? "var(--muted-2)" : step.color,
                          border: `1px solid ${item.status === "–" ? "rgba(255,255,255,0.07)" : step.color + "30"}`,
                        }}>{item.status}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: item.status === "–" ? "var(--muted)" : "var(--fg-2)", flex: 1 }}>{item.name}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{item.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ marginTop: 20, padding: "20px 24px", borderRadius: 16, background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.06) 100%)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>MRI Formula</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--fg-2)" }}>
              <span style={{ color: "#7c3aed" }}>36.4</span> + <span style={{ color: "#06b6d4" }}>25.2</span> + <span style={{ color: "#22c55e" }}>25.8</span> = <span style={{ color: "#a78bfa", fontWeight: 700 }}>{total.toFixed(1)}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#a78bfa", lineHeight: 1 }}>{Math.round(total)}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Final MRI Score</div>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#22c55e" }}>Market Ready</div>
              <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>Score ≥ 85</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Bands: <strong style={{ color: "#22c55e" }}>Market Ready ≥ 85</strong> · <strong style={{ color: "#f59e0b" }}>Competitive ≥ 65</strong> · <strong style={{ color: "var(--muted-2)" }}>Developing &lt; 65</strong></span>
        </div>
      </div>
    </section>
  );
}

/* ── Profile Artifact Mock ──────────────────────────────── */
function ProfileArtifact() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>What recruiters actually see</div>
        <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>
          A verified proof profile — not a resume
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", maxWidth: 500, margin: "0 auto" }}>
          Every claim is backed by evidence. When you share your MarketReady profile, recruiters see proof — GitHub commits, live projects, and an auditable score breakdown.
        </p>
      </div>

      <div style={{ position: "relative" }}>
        {/* Glow behind card */}
        <div style={{ position: "absolute", inset: -40, background: "radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.12), transparent 70%)", pointerEvents: "none" }} />

        <div style={{
          position: "relative",
          background: "rgba(11,11,30,0.98)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}>
          {/* Browser chrome */}
          <div style={{ background: "#070714", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "4px 12px", fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              marketready.app/profile/jordan-mitchell
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "block" }} />
              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#22c55e" }}>Verified</span>
            </div>
          </div>

          {/* Profile content */}
          <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 28 }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Avatar + name */}
              <div style={{ textAlign: "center", padding: "20px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid var(--border)" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff" }}>JM</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--fg)" }}>Jordan Mitchell</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>Georgia Tech · CS Junior</div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 12px", borderRadius: 9999, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 13, fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#22c55e" }}>Market Ready · 87</span>
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid var(--border)", padding: "16px" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted-2)", marginBottom: 12 }}>Score Breakdown</div>
                {[
                  { label: "Federal Standards", pct: 91, color: "#7c3aed" },
                  { label: "Market Demand", pct: 84, color: "#06b6d4" },
                  { label: "Evidence Density", pct: 86, color: "#22c55e" },
                ].map(b => (
                  <div key={b.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: 4 }}>
                      <span style={{ color: "var(--muted)" }}>{b.label}</span>
                      <span style={{ color: b.color, fontWeight: 700 }}>{b.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* QR code mock */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid var(--border)", padding: "14px", textAlign: "center" }}>
                <div style={{ width: 80, height: 80, margin: "0 auto 8px", borderRadius: 8, background: "#fff", padding: 4, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.5 }}>
                  {Array.from({ length: 64 }, (_, i) => (
                    <div key={i} style={{ background: Math.random() > 0.45 ? "#030311" : "#fff", borderRadius: 1 }} />
                  ))}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>Scan to view profile</div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Verified skills */}
              <div>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted-2)", marginBottom: 12 }}>AI-Verified Skills</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {[
                    { skill: "React", level: "Professional", evidence: "847 commits · 6 repos", color: "#7c3aed" },
                    { skill: "Python", level: "Professional", evidence: "2,341 commits · cert", color: "#06b6d4" },
                    { skill: "AWS", level: "Intermediate", evidence: "12 live services", color: "#22c55e" },
                    { skill: "TypeScript", level: "Intermediate", evidence: "3 production projects", color: "#f59e0b" },
                    { skill: "SQL", level: "Intermediate", evidence: "Portfolio demo", color: "#06b6d4" },
                    { skill: "System Design", level: "Gap", evidence: "No proof found", color: "#ef4444" },
                  ].map(s => (
                    <div key={s.skill} style={{
                      padding: "10px 12px", borderRadius: 10,
                      background: s.level === "Gap" ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${s.level === "Gap" ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: s.level === "Gap" ? "#ef4444" : "var(--fg)" }}>{s.skill}</span>
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: s.color, background: `${s.color}12`, padding: "1px 7px", borderRadius: 9999, border: `1px solid ${s.color}25` }}>{s.level}</span>
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{s.evidence}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GitHub evidence */}
              <div>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted-2)", marginBottom: 12 }}>Proof Artifacts</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { icon: "hub", title: "github.com/jordanm/ecommerce-platform", type: "GitHub Repo", badges: ["React", "Node.js", "AWS"], verified: true },
                    { icon: "description", title: "AWS Solutions Architect – Associate", type: "Certificate", badges: ["AWS", "Cloud"], verified: true },
                    { icon: "code", title: "Open-source contributions · 14 PRs merged", type: "GitHub Activity", badges: ["Python", "SQL"], verified: true },
                  ].map(p => (
                    <div key={p.title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 16 }}>{p.icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                          {p.verified && <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 13, fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>verified</span>}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {p.badges.map(b => (
                            <span key={b} style={{ fontSize: "0.58rem", fontWeight: 600, padding: "1px 6px", borderRadius: 9999, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", color: "#a78bfa" }}>{b}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>The shareable profile your interviewers will see — QR-code accessible, no account required to view.</span>
        </div>
      </div>
    </section>
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
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataUrl = e.target?.result as string;
        sessionStorage.setItem("pending_resume_name", file.name);
        sessionStorage.setItem("pending_resume_type", file.type || "application/octet-stream");
        sessionStorage.setItem("pending_resume_data", dataUrl);
      } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
    setTimeout(() => { setAnalyzing(false); setDone(true); }, 2200);
  }

  return (
    <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>No account needed to start</div>
        <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          See your score in{" "}
          <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>3 minutes</span>
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 32 }}>
          Drop your resume and we&apos;ll show you exactly where you stand — before you create an account.
        </p>

        {/* Trust bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { icon: "lock", label: "Nothing stored until signup" },
            { icon: "verified_user", label: "FERPA compliant" },
            { icon: "shield", label: "No credit card" },
          ].map(t => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--muted)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#22c55e" }}>{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>

        {!done ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => !analyzing && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "rgba(124,58,237,0.7)" : "rgba(124,58,237,0.3)"}`,
              borderRadius: 16, padding: "48px 32px",
              background: dragging ? "rgba(124,58,237,0.06)" : "rgba(124,58,237,0.02)",
              cursor: analyzing ? "default" : "pointer",
              transition: "all 0.2s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {analyzing ? (
              <>
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(124,58,237,0.2)", borderTop: "3px solid #7c3aed", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "0.9rem", color: "var(--fg-2)", fontWeight: 600 }}>Analyzing {fileName}…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 38 }}>upload_file</span>
                <span style={{ fontSize: "0.9rem", color: "var(--fg-2)", fontWeight: 600 }}>
                  {fileName ? fileName : "Drop your resume here or click to browse"}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>PDF, DOCX, or TXT</span>
              </>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: 16, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 26, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--fg)", marginBottom: 5 }}>Resume analyzed — your score is ready</div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Create a free account to see your full breakdown and gap plan.</div>
            </div>
            <Link href="/register?source=resume_hook" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 12,
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              color: "#fff", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            }}>
              Create Free Account &amp; See Score
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Supporting Features (3 only) ───────────────────────── */
function SupportingFeatures() {
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "88px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>How the score stays accurate</div>
        <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Three engines behind the index
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {[
          {
            icon: "hub",
            title: "GitHub Proof Engine",
            color: "#06b6d4",
            desc: "Connects to your real repos. Counts commits, reads code quality, and verifies skill depth — so your score reflects what you can actually build.",
            detail: "React: 847 commits · Python: 2,341 commits · 14 PRs merged",
          },
          {
            icon: "trending_up",
            title: "Live Market Intel",
            color: "#f59e0b",
            desc: "Powered by Adzuna and O*NET. Your checklist and score weights update automatically when what employers are hiring for shifts.",
            detail: "Python in 73% of today's postings · React in 61%",
          },
          {
            icon: "view_kanban",
            title: "90-Day Gap Roadmap",
            color: "#22c55e",
            desc: "Once your gaps are identified, an AI generates a 12-task sprint plan. Close a gap, upload evidence, watch your score rise.",
            detail: "Avg. score increase: +14 pts in 90 days",
          },
        ].map(f => (
          <div key={f.title} style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px",
            transition: "all 0.25s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${f.color}40`; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${f.color}12`, border: `1px solid ${f.color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ color: f.color, fontSize: 22 }}>{f.icon}</span>
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8, color: "var(--fg)" }}>{f.title}</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>{f.desc}</p>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: `${f.color}08`, border: `1px solid ${f.color}18`, fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: f.color }}>{f.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── CTA ─────────────────────────────────────────────────── */
function CTA() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 96px" }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(6,182,212,0.07) 100%)",
        border: "1px solid rgba(124,58,237,0.28)", borderRadius: 26, padding: "64px 48px", textAlign: "center",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "#7c3aed", filter: "blur(140px)", opacity: 0.12, top: "-30%", left: "-10%" }} />
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "#06b6d4", filter: "blur(120px)", opacity: 0.1, bottom: "-20%", right: "-5%" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 18 }}>For CS students — completely free</div>
          <h2 style={{ fontSize: "clamp(1.9rem,4vw,3.2rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16, lineHeight: 1.1 }}>
            Know exactly where you stand.<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Before your next interview.</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--muted)", maxWidth: 420, margin: "0 auto 32px" }}>
            Takes 3 minutes. No credit card. Your score is ready when you are.
          </p>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "15px 36px", borderRadius: 14,
            background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
            color: "#fff", fontWeight: 800, fontSize: "1rem", textDecoration: "none",
            boxShadow: "0 8px 32px rgba(124,58,237,0.45)",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 40px rgba(124,58,237,0.6)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.45)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; }}>
            Build My Free MRI Score
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </Link>
        </div>
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
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "#7c3aed", filter: "blur(160px)", opacity: 0.14, top: "-5%", left: "-15%" }} />
          <div style={{ position: "absolute", width: 550, height: 550, borderRadius: "50%", background: "#06b6d4", filter: "blur(140px)", opacity: 0.12, top: "5%", right: "-12%" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 24px", width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 64, alignItems: "center" }}>

            {/* Copy — ICP-tight, single wedge */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px 5px 9px", borderRadius: 9999, border: "1px solid rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.08)", marginBottom: 28 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa" }}>Free for CS Students</span>
              </div>

              <h1 style={{ fontSize: "clamp(2.6rem,4.8vw,4.4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 22 }}>
                Your skills,{" "}
                <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>verified.</span>
                <br />Your score,{" "}
                <span style={{ background: "linear-gradient(135deg,#06b6d4,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>provable.</span>
              </h1>

              <p style={{ fontSize: "1rem", color: "var(--fg-2)", lineHeight: 1.72, maxWidth: 480, marginBottom: 14 }}>
                MarketReady turns your GitHub and resume into a single verified score — built on live job data and federal workforce standards — so recruiters see proof, not claims.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 32 }}>
                For CS students who are tired of guessing why they don&apos;t hear back.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Build My MRI Score — Free
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                </Link>
                <a href="#how-score-works" className="btn btn-glass btn-lg">
                  See How It&apos;s Calculated
                </a>
              </div>

              {/* Trust signals — hero-level */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {[
                  { icon: "lock", text: "Nothing stored until signup" },
                  { icon: "verified_user", text: "FERPA compliant" },
                  { icon: "schedule", text: "Score ready in 3 min" },
                ].map(t => (
                  <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--muted)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#22c55e" }}>{t.icon}</span>
                    {t.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Score card */}
            <div style={{ animation: "float 6s ease-in-out infinite" }}>
              <HeroScoreCard />
            </div>
          </div>
        </div>
      </section>

      {/* ══ LIVE TICKER ════════════════════════════════════════ */}
      <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "10px 0", background: "rgba(124,58,237,0.04)" }}>
        <div style={{ display: "flex", minWidth: "max-content", animation: "tickerScroll 42s linear infinite" }}>
          {["Python · 148k jobs today", "React · 92k jobs today", "AWS · 87k jobs today",
            "TypeScript · 71k jobs today", "System Design · 95k jobs today", "Machine Learning · 63k jobs today",
            "SQL · 124k jobs today", "Node.js · 58k jobs today", "LLMs / GenAI · 41k jobs today",
            "Docker · 67k jobs today", "Go · 38k jobs today", "Kubernetes · 43k jobs today"].map((item, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 28px", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>
              <span style={{ color: "#a78bfa" }}>{item.split("·")[0].trim()}</span>
              <span style={{ color: "var(--muted-2)" }}>·</span>
              <span>{item.split("·")[1]?.trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ WORKED EXAMPLE ════════════════════════════════════ */}
      <WorkedExample />

      {/* ══ PROFILE ARTIFACT ══════════════════════════════════ */}
      <ProfileArtifact />

      {/* ══ RESUME HOOK ═══════════════════════════════════════ */}
      <ResumeHook />

      {/* ══ SUPPORTING FEATURES ═══════════════════════════════ */}
      <SupportingFeatures />

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <CTA />

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "56px 24px 32px", background: "var(--void)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 16 }}>bolt</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.75, maxWidth: 240, marginBottom: 20 }}>
                Proof-first career readiness for CS students. Know your score. Close your gaps. Get hired.
              </p>
              {/* Trust badges — footer but prominent */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: "verified_user", label: "FERPA Compliant", desc: "Student data protected under federal law" },
                  { icon: "lock", label: "Privacy First", desc: "Nothing stored without explicit consent" },
                  { icon: "gavel", label: "O*NET & NICE Standards", desc: "Federal workforce frameworks" },
                ].map(t => (
                  <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#22c55e" }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--fg-2)" }}>{t.label}</div>
                      <div style={{ fontSize: "0.63rem", color: "var(--muted)" }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted-2)", marginBottom: 14 }}>Product</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["MRI Score", "GitHub Proof Engine", "90-Day Sprint Board", "Verified Public Profile", "Resume Architect"].map(l => (
                  <a key={l} href="#" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--fg-2)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>{l}</a>
                ))}
              </div>
            </div>

            {/* Legal — treated as real assets */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted-2)", marginBottom: 14 }}>Trust & Legal</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Privacy Policy", desc: "How we handle your data" },
                  { label: "Terms of Service", desc: "What you agree to" },
                  { label: "FERPA Compliance", desc: "Student rights under federal law" },
                  { label: "Data Deletion", desc: "Remove your account and data" },
                ].map(l => (
                  <a key={l.label} href="#" style={{ textDecoration: "none", transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    <div style={{ fontSize: "0.8rem", color: "var(--fg-2)", fontWeight: 600 }}>{l.label}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{l.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>© 2026 MarketReady · Built for CS students</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["Twitter", "LinkedIn", "GitHub"].map(s => (
                <a key={s} href="#" style={{ fontSize: "0.7rem", color: "var(--muted-2)", textDecoration: "none", padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--fg)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted-2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}>{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
