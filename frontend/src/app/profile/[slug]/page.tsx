"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type PublicProfile = {
  username: string;
  university?: string | null;
  pathway?: string | null;
  mri_score: number;
  mri_band: string;
  mri_components: { federal_standards: number; market_demand: number; evidence_density: number };
  verified_skills: string[];
  proof_count: number;
  github_username?: string | null;
  semester?: string | null;
  profile_generated_at: string;
};

const BAND_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  "Market Ready": { color: "#22c55e", glow: "rgba(34,197,94,0.3)", label: "Market Ready" },
  "Competitive": { color: "#a78bfa", glow: "rgba(167,139,250,0.3)", label: "Competitive" },
  "Developing": { color: "#f59e0b", glow: "rgba(245,158,11,0.3)", label: "Developing" },
};

function getBandConfig(band: string) {
  return BAND_CONFIG[band] ?? { color: "#ef4444", glow: "rgba(239,68,68,0.3)", label: band };
}

function ScoreRing({ score, band }: { score: number; band: string }) {
  const { color } = getBandConfig(band);
  const r = 56;
  const stroke = 9;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score / 100, 1));
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={r * 2 + stroke + 4} height={r * 2 + stroke + 4} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={r + stroke / 2 + 2} cy={r + stroke / 2 + 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={r + stroke / 2 + 2} cy={r + stroke / 2 + 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: "2rem", fontWeight: 800, color, letterSpacing: "-0.04em", lineHeight: 1 }}>{score.toFixed(0)}</span>
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>/ 100</span>
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/public/${slug}`)
      .then(r => { if (!r.ok) throw new Error("Profile not found"); return r.json(); })
      .then(setProfile)
      .catch(() => setError("Profile not found or unavailable"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(124,58,237,0.2)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Loading profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#ef4444" }}>error</span>
          </div>
          <p style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 8 }}>Profile Not Found</p>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 24 }}>This link may have expired or doesn&apos;t exist.</p>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 11, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  const { color, glow } = getBandConfig(profile.mri_band);
  const generatedDate = new Date(profile.profile_generated_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const initials = profile.username.slice(0, 2).toUpperCase();

  const COMPONENT_COLORS = ["#a78bfa", "#06b6d4", "#f59e0b"];
  const components = [
    { label: "Federal Standards", value: profile.mri_components.federal_standards },
    { label: "Market Demand", value: profile.mri_components.market_demand },
    { label: "Evidence Density", value: profile.mri_components.evidence_density },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "48px 16px" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: `radial-gradient(ellipse at center, ${glow} 0%, transparent 70%)`, opacity: 0.15, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 1 }}>
        {/* Verified badge */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#22c55e" }}>verified</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#22c55e", letterSpacing: "0.08em", textTransform: "uppercase" }}>Verified by Market Ready</span>
          </div>
        </div>

        {/* Header card */}
        <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }} data-testid="public-profile-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem", fontWeight: 800, color: "#fff",
              boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em" }} data-testid="public-username">
                {profile.username}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {profile.pathway && <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>{profile.pathway}</span>}
                {profile.university && <span style={{ fontSize: "0.68rem", padding: "3px 10px", borderRadius: 99, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>{profile.university}</span>}
                {profile.semester && <span style={{ fontSize: "0.68rem", padding: "3px 10px", borderRadius: 99, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>{profile.semester}</span>}
              </div>
            </div>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>Profile generated {generatedDate}</p>
        </div>

        {/* MRI Score card */}
        <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: `1px solid ${color}35` }} data-testid="public-mri-card">
          <h2 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 20 }}>Market-Ready Index (MRI)</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ flexShrink: 0, filter: `drop-shadow(0 0 16px ${glow})` }}>
              <ScoreRing score={profile.mri_score} band={profile.mri_band} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "5px 12px", borderRadius: 99, background: `${color}20`, color, border: `1px solid ${color}40` }}>
                  {profile.mri_band}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{profile.proof_count} verified proofs</span>
              </div>
              {components.map(({ label, value }, i) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{label}</span>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: COMPONENT_COLORS[i] }}>{value.toFixed(0)}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${value}%`, background: COMPONENT_COLORS[i], transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verified Skills */}
        {profile.verified_skills.length > 0 && (
          <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }} data-testid="public-skills-card">
            <h2 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14 }}>Verified Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {profile.verified_skills.map(skill => (
                <span key={skill} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, padding: "5px 12px", borderRadius: 99, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* GitHub */}
        {profile.github_username && (
          <div style={{ background: "var(--surface)", borderRadius: 20, padding: 20, border: "1px solid var(--border)" }} data-testid="public-github-card">
            <h2 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 12 }}>Engineering Signal</h2>
            <a
              href={`https://github.com/${profile.github_username}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem", transition: "border-color 0.15s" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              github.com/{profile.github_username}
            </a>
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", marginBottom: 8 }}>Profile verified by Market Ready · Built for proof-first hiring</p>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 99, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.78rem", textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
            Get your Market Ready profile
          </Link>
        </div>
      </div>
    </main>
  );
}
