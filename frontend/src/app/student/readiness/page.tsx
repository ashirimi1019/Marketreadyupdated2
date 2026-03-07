"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/api";
import { useSession } from "@/lib/session";

type MRIData = {
  score: number;
  components: { federal_standards: number; market_demand: number; evidence_density: number };
  weights: { federal_standards: number; market_demand: number; evidence_density: number };
  gaps: string[];
  recommendations: string[];
  band: string;
  formula: string;
  proficiency_breakdown?: { beginner: number; intermediate: number; professional: number };
  ai_verified_certs?: number;
};
type GitHubAudit = {
  username: string;
  verified_skills: string[];
  commit_skill_signals: string[];
  velocity: { velocity_score: number; recent_repos: number; total_repos: number; languages: string[]; stars: number };
  warnings: string[];
  bulk_upload_detected: boolean;
  profile?: { public_repos?: number; followers?: number; bio?: string | null };
};
type SimulatorResult = {
  acceleration: number; adjusted_score: number; original_score: number; delta: number;
  skill_profiles: { skill: string; multiplier: number; classification: string; verified: boolean }[];
  risk_level: string; recommendations: string[];
};
type StudentProfile = { github_username?: string | null };

function WhyThisScore({ mri }: { mri: MRIData }) {
  const [open, setOpen] = useState(false);
  const components = [
    {
      label: "Federal Standards (40%)", val: mri.components.federal_standards, color: "#22c55e", icon: "gavel",
      desc: "Based on NICE Cybersecurity and O*NET workforce frameworks. Skills are scored as present, missing, or partially satisfied. Non-negotiable items cap your max score at 75% if any are missing.",
    },
    {
      label: "Market Demand (30%)", val: mri.components.market_demand, color: "#7c3aed", icon: "trending_up",
      desc: "Live scan of 50,000+ job postings. Skills with high employer demand in your pathway carry more weight. This component updates as the market shifts.",
    },
    {
      label: "Evidence Density (30%)", val: mri.components.evidence_density, color: "#06b6d4", icon: "verified",
      desc: "How much proof you have per skill. AI-verified certificates earn an extra +15% bonus. GitHub commits, certifications, and portfolio projects all count more than self-assessments.",
    },
  ];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 18 }}>info</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)" }}>Why this score?</span>
        </div>
        <span className="material-symbols-outlined" style={{ color: "var(--muted)", fontSize: 18, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>expand_more</span>
      </button>
      {open && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            MRI = (Federal Standards × 0.40) + (Market Demand × 0.30) + (Evidence Density × 0.30)
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {components.map(c => (
              <div key={c.label} style={{ padding: "14px", borderRadius: 12, background: `${c.color}08`, border: `1px solid ${c.color}25` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: c.color, fontSize: 15 }}>{c.icon}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.color }}>{c.label}</span>
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: c.color, lineHeight: 1, marginBottom: 8 }}>{c.val.toFixed(0)}%</div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
          {mri.gaps.length > 0 && (
            <div>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 8 }}>Top gaps reducing your score</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mri.gaps.slice(0, 6).map(g => (
                  <span key={g} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ target }: { target: number }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    setCur(0);
    let s = 0; const steps = 45; const inc = target / steps;
    const t = setInterval(() => { s++; setCur(Math.min(Math.round(inc * s), target)); if (s >= steps) clearInterval(t); }, 22);
    return () => clearInterval(t);
  }, [target]);
  const r = 70, stroke = 10, circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(cur / 100, 1));
  const color = target >= 85 ? "#22c55e" : target >= 65 ? "#7c3aed" : target >= 45 ? "#f59e0b" : "#ef4444";
  const bandInfo = target >= 85
    ? { label: "Market Ready", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", c: "#22c55e" }
    : target >= 65
    ? { label: "Competitive", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)", c: "#a78bfa" }
    : { label: "Developing", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", c: "#f59e0b" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 170, height: 170 }}>
        <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="85" cy="85" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          <circle cx="85" cy="85" r={r} fill="none" stroke="url(#scoreGrad)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.04s linear", filter: `drop-shadow(0 0 8px ${color}80)` }} />
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} /><stop offset="100%" stopColor={color === "#7c3aed" ? "#06b6d4" : color} />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.05em", color, lineHeight: 1 }}>{cur}</span>
          <span style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 4 }}>Global Index</span>
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 9999, background: bandInfo.bg, border: `1px solid ${bandInfo.border}` }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: bandInfo.c, display: "inline-block" }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: bandInfo.c, letterSpacing: "0.06em", textTransform: "uppercase" }}>{bandInfo.label}</span>
      </div>
    </div>
  );
}

export default function StudentReadinessPage() {
  const { isLoggedIn } = useSession();
  const [mri, setMri] = useState<MRIData | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [audit, setAudit] = useState<GitHubAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulatorResult | null>(null);
  const [acceleration, setAcceleration] = useState(50);
  const [simLoading, setSimLoading] = useState(false);
  const simTimer = useRef<NodeJS.Timeout | null>(null);
  const simAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<MRIData>("/score/mri").then(setMri).catch(() => setMri(null));
    apiGet<StudentProfile>("/user/profile").then(setProfile).catch(() => setProfile(null));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !profile?.github_username) return;
    setAuditLoading(true);
    apiGet<GitHubAudit>(`/github/audit/${profile.github_username}`)
      .then(setAudit).catch(() => setAudit(null)).finally(() => setAuditLoading(false));
  }, [profile, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (simTimer.current) clearTimeout(simTimer.current);
    simTimer.current = setTimeout(() => {
      // Cancel any in-flight simulator request before starting new one
      if (simAbort.current) simAbort.current.abort();
      simAbort.current = new AbortController();
      setSimLoading(true);
      apiSend<SimulatorResult>("/simulator/future-shock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceleration }),
        signal: simAbort.current.signal,
      }).then(setSimResult).catch(err => {
        if ((err as Error).name !== "AbortError") setSimResult(null);
      }).finally(() => setSimLoading(false));
    }, 700);
    return () => {
      if (simTimer.current) clearTimeout(simTimer.current);
    };
  }, [acceleration, isLoggedIn]);

  const score = mri?.score ?? 0;
  const gaps  = mri?.gaps ?? [];
  const recs  = mri?.recommendations ?? [];

  if (!isLoggedIn) return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>Please log in to view your Market Ready Index score.</p>
      <Link href="/login" style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", textDecoration: "none", fontWeight: 700 }}>Log In</Link>
    </div>
  );

  const bars = [
    { label: "Federal Standards (O*NET)", val: mri?.components.federal_standards ?? 0, weight: mri?.weights.federal_standards ?? 0.4, color: "#22c55e" },
    { label: "Market Demand (Adzuna)", val: mri?.components.market_demand ?? 0, weight: mri?.weights.market_demand ?? 0.3, color: "#7c3aed" },
    { label: "Evidence Density", val: mri?.components.evidence_density ?? 0, weight: mri?.weights.evidence_density ?? 0.3, color: "#06b6d4" },
  ];

  return (
    <div data-testid="mri-title">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Market Ready Index</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
          Proof-verified career readiness — federal standards × live market × evidence density.
        </p>
        {mri?.formula && <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--muted-2)", marginTop: 6 }}>{mri.formula}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Score card */}
          <div data-testid="mri-score-card" style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "32px", position: "relative", overflow: "hidden",
          }}>
            {/* glow */}
            <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 300, borderRadius: "50%", background: score >= 85 ? "#22c55e" : score >= 65 ? "#7c3aed" : "#f59e0b", filter: "blur(80px)", opacity: 0.06, pointerEvents: "none" }} />
            <div style={{ display: "flex", gap: 48, alignItems: "center", position: "relative" }}>
              <ScoreRing target={score} />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  {bars.map(b => (
                    <div key={b.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 6 }}>
                        <span style={{ color: "var(--muted)" }}>{b.label} <span style={{ color: "var(--muted-2)", fontSize: "0.68rem" }}>({(b.weight * 100).toFixed(0)}%)</span></span>
                        <span style={{ color: "var(--fg-2)", fontWeight: 700 }}>{b.val.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${b.val}%`, background: b.color, borderRadius: 6, transition: "width 0.7s ease", boxShadow: `0 0 6px ${b.color}60` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Proficiency mix */}
                {mri?.proficiency_breakdown && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Beginner", val: mri.proficiency_breakdown.beginner, color: "#f59e0b" },
                      { label: "Intermediate", val: mri.proficiency_breakdown.intermediate, color: "#7c3aed" },
                      { label: "Professional", val: mri.proficiency_breakdown.professional, color: "#22c55e" },
                    ].filter(x => x.val > 0).map(x => (
                      <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: x.color, display: "inline-block" }} />
                        <span style={{ color: x.color, fontWeight: 600 }}>{x.val} {x.label}</span>
                      </div>
                    ))}
                    {(mri.ai_verified_certs ?? 0) > 0 && (
                      <span style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: 9999, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", fontWeight: 600 }}>
                        ✦ {mri.ai_verified_certs} AI-verified cert{(mri.ai_verified_certs ?? 0) > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                <Link href="/student/checklist" style={{ display: "inline-block", marginTop: 16, fontSize: "0.78rem", color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>
                  Boost score by upgrading proficiency levels →
                </Link>
              </div>
            </div>
          </div>

          {/* Why this score? */}
          {mri && (
            <WhyThisScore mri={mri} />
          )}

          {/* GitHub Audit */}
          <div data-testid="github-audit-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 18 }}>code_blocks</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>GitHub Signal Auditor</h3>
              </div>
              {audit && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Velocity Score</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#22c55e", letterSpacing: "-0.03em" }}>{audit.velocity.velocity_score}<span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>/100</span></div>
                </div>
              )}
            </div>

            {!profile?.github_username ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 14 }}>Connect your GitHub to verify skills automatically</p>
                <Link href="/student/profile" style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Add GitHub Username</Link>
              </div>
            ) : auditLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: "0.85rem", padding: "16px 0" }}>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18, color: "#a78bfa" }}>refresh</span>
                Analyzing @{profile.github_username}...
              </div>
            ) : audit ? (
              <>
                {audit.warnings.length > 0 && (
                  <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: "0.82rem" }}>
                    {audit.warnings.map(w => <p key={w}>{w}</p>)}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Total Repos", val: audit.velocity.total_repos },
                    { label: "Recent Repos", val: audit.velocity.recent_repos },
                    { label: "Stars", val: audit.velocity.stars.toLocaleString() },
                    { label: "Followers", val: audit.profile?.followers ?? "—" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                {audit.verified_skills.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>Verified by Code</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {audit.verified_skills.slice(0, 20).map(s => (
                        <span key={s} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {audit.velocity.languages.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>Languages Detected</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {audit.velocity.languages.map(l => (
                        <span key={l} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-2)", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", padding: "16px 0" }}>Could not load GitHub audit. Check your username in profile.</p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Score Leakage */}
          <div data-testid="mri-gaps-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: 17 }}>trending_down</span>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Score Leakage</h3>
            </div>
            {gaps.length === 0 && recs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 28, display: "block", marginBottom: 8 }}>verified</span>
                <p style={{ fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>No gaps detected — keep it up!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {gaps.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>Critical Gaps</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {gaps.map(gap => (
                        <Link key={gap} href="/student/checklist" style={{ fontSize: "0.72rem", padding: "4px 12px", borderRadius: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 600, textDecoration: "none" }}>{gap} ↑</Link>
                      ))}
                    </div>
                  </div>
                )}
                {recs.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>Exposure Alerts</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {recs.slice(0, 3).map(rec => (
                        <div key={rec} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: 6 }}>{rec}</p>
                          <Link href="/student/checklist" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa", textDecoration: "none" }}>Fix Exposure →</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(mri?.proficiency_breakdown?.beginner ?? 0) > 0 && (
                  <Link href="/student/checklist" style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                    Upgrade Proficiency Levels →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* 2027 Simulator */}
          <div style={{ background: "linear-gradient(160deg, rgba(124,58,237,0.08) 0%, var(--surface) 100%)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 20, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 17 }}>bolt</span>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>2027 Future-Shock</h3>
            </div>

            {/* Projected score */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Projected Index</div>
                {simLoading ? (
                  <div style={{ height: 44, width: 80, borderRadius: 8, background: "rgba(255,255,255,0.05)", animation: "pulse 2s infinite" }} />
                ) : simResult ? (
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#a78bfa" }}>
                    {simResult.adjusted_score.toFixed(0)}<span style={{ fontSize: "1rem", color: "var(--muted)", fontWeight: 400 }}>/100</span>
                  </div>
                ) : (
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--muted-2)" }}>—</div>
                )}
              </div>
              {simResult && <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic" }}>Risk: {simResult.risk_level}</div>}
            </div>

            {simResult?.delta !== undefined && simResult.delta !== 0 && (
              <div style={{ marginBottom: 16, fontSize: "0.82rem", fontWeight: 700, color: simResult.delta > 0 ? "#22c55e" : "#ef4444" }}>
                {simResult.delta > 0 ? "+" : ""}{simResult.delta.toFixed(1)} vs current
              </div>
            )}

            {/* Slider */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 8 }}>
                <span style={{ color: "var(--muted)" }}>AI Acceleration</span>
                <span style={{ color: "#a78bfa", fontWeight: 700 }}>{acceleration}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={acceleration}
                onChange={e => setAcceleration(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--muted-2)", marginTop: 4 }}>
                <span>Low AI Impact</span><span>High AI Impact</span>
              </div>
            </div>

            {simResult?.recommendations && simResult.recommendations.length > 0 && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", marginBottom: 14 }}>
                <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6 }}>{simResult.recommendations[0]}</p>
              </div>
            )}

            {simResult?.skill_profiles && simResult.skill_profiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>Top Affected Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {simResult.skill_profiles.slice(0, 5).map(s => (
                    <span key={s.skill} style={{ fontSize: "0.7rem", padding: "2px 9px", borderRadius: 9999, background: s.multiplier > 1 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${s.multiplier > 1 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, color: s.multiplier > 1 ? "#22c55e" : "#ef4444" }}>{s.skill}</span>
                  ))}
                </div>
              </div>
            )}

            <Link href="/student/checklist" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 11, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>
              Adapt Stack Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
