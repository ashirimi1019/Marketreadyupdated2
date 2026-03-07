"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import type { RepoProofChecker, StudentProfile } from "@/types/api";

type GitHubAudit = {
  username: string;
  verified_skills: string[];
  commit_skill_signals: string[];
  velocity: { velocity_score: number; recent_repos: number; total_repos: number; languages: string[]; stars: number };
  warnings: string[];
  bulk_upload_detected: boolean;
  profile?: { public_repos?: number; followers?: number; bio?: string | null };
};

function adzunaModeLabel(value?: string | null): string {
  if (value === "role_rewrite") return "rewrite";
  if (value === "geo_widen") return "geo widen";
  if (value === "proxy_from_search") return "proxy";
  return "exact";
}

function formatSnapshotFreshness(timestamp?: string | null, ageMinutes?: number | null): string {
  if (!timestamp) return "Snapshot timestamp unavailable";
  if (typeof ageMinutes === "number") return `Snapshot: ${timestamp} (${ageMinutes.toFixed(0)} min old)`;
  return `Snapshot: ${timestamp}`;
}

export default function StudentGithubPage() {
  const { isLoggedIn } = useSession();
  const [githubUsername, setGithubUsername] = useState("");
  const [targetJob, setTargetJob] = useState("software engineer");
  const [location, setLocation] = useState("united states");
  const [repoUrl, setRepoUrl] = useState("");
  const [auditResult, setAuditResult] = useState<GitHubAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [proofResult, setProofResult] = useState<RepoProofChecker | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"audit" | "proof" | "sync">("audit");

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<StudentProfile>("/user/profile").then(profile => {
      if (profile.github_username) { setGithubUsername(profile.github_username); setRepoUrl(`https://github.com/${profile.github_username}`); }
      if (profile.state) setLocation(profile.state);
    }).catch(() => null);
  }, [isLoggedIn]);

  const runGithubSignalAudit = async () => {
    if (!isLoggedIn) { setAuditError("Please log in to run GitHub audit."); return; }
    if (!githubUsername.trim()) { setAuditError("Add your GitHub username first."); return; }
    setAuditLoading(true); setAuditError(null);
    try {
      const data = await apiGet<GitHubAudit>(`/github/audit/${encodeURIComponent(githubUsername.trim())}`);
      setAuditResult(data);
    } catch (error) { setAuditError(getErrorMessage(error) || "GitHub signal audit failed."); setAuditResult(null); }
    finally { setAuditLoading(false); }
  };

  const runProofAudit = async () => {
    if (!isLoggedIn) { setProofError("Please log in to verify by GitHub."); return; }
    if (!repoUrl.trim()) { setProofError("Enter a GitHub profile or repo URL."); return; }
    setProofLoading(true); setProofError(null);
    try {
      const data = await apiSend<RepoProofChecker>("/user/ai/proof-checker", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_job: targetJob.trim() || "software engineer", location: location.trim() || "united states", repo_url: repoUrl.trim() }),
      });
      setProofResult(data);
    } catch (error) { setProofError(getErrorMessage(error) || "GitHub proof audit failed."); setProofResult(null); }
    finally { setProofLoading(false); }
  };

  const runGithubSync = async () => {
    if (!isLoggedIn) return;
    setSyncLoading(true); setSyncMessage(null);
    try {
      const result = await apiSend<{ synced_count: number }>("/kanban/sync-github", { method: "POST" });
      setSyncMessage(`Synced ${result.synced_count || 0} task${result.synced_count === 1 ? "" : "s"} from GitHub activity.`);
    } catch (error) { setSyncMessage(getErrorMessage(error) || "GitHub task sync failed."); }
    finally { setSyncLoading(false); }
  };

  const tabs = [
    { id: "audit" as const, label: "Signal Audit", icon: "radar" },
    { id: "proof" as const, label: "Proof Auditor", icon: "verified_user" },
    { id: "sync" as const, label: "Plan Sync", icon: "sync" },
  ];

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.85rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>GitHub Workspace</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Signal audit, proof verification, and kanban sync — all in one place.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px 16px", borderRadius: 10, border: "none",
              background: activeTab === tab.id ? "rgba(124,58,237,0.15)" : "transparent",
              color: activeTab === tab.id ? "#a78bfa" : "var(--muted)",
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: "0.82rem",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: activeTab === tab.id ? "0 0 0 1px rgba(124,58,237,0.3)" : "none",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {!isLoggedIn && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to use GitHub features.
        </div>
      )}

      {/* SIGNAL AUDIT */}
      {activeTab === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#a78bfa" }}>radar</span>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>GitHub Signal Auditor</h3>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16 }}>
              Analyze repository velocity, languages, and skill signals from your public GitHub.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={githubUsername} onChange={e => setGithubUsername(e.target.value)} placeholder="GitHub username" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
              <button
                onClick={runGithubSignalAudit}
                disabled={!isLoggedIn || auditLoading}
                style={{ padding: "11px 22px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              >
                {auditLoading ? "Auditing..." : "Run Signal Audit"}
              </button>
              <Link href="/student/profile" style={{ padding: "11px 18px", borderRadius: 11, border: "1px solid var(--border)", background: "transparent", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center" }}>
                Edit Profile
              </Link>
            </div>
            {auditError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 10 }}>{auditError}</p>}
          </div>

          {auditResult && (
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 16 }}>
              {auditResult.warnings.length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", fontSize: "0.8rem" }}>
                  {auditResult.warnings.map(w => <p key={w}>{w}</p>)}
                </div>
              )}

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                {[
                  { label: "Velocity", value: `${auditResult.velocity.velocity_score}/100`, color: "#a78bfa" },
                  { label: "Recent Repos", value: auditResult.velocity.recent_repos, color: "#06b6d4" },
                  { label: "Total Repos", value: auditResult.velocity.total_repos, color: "var(--fg)" },
                  { label: "Stars", value: auditResult.velocity.stars.toLocaleString(), color: "#f59e0b" },
                  { label: "Followers", value: auditResult.profile?.followers ?? 0, color: "var(--fg)" },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--muted-2)", marginBottom: 4 }}>{stat.label}</p>
                    <p style={{ fontSize: "1.1rem", fontWeight: 800, color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Languages */}
              {auditResult.velocity.languages.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Languages</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {auditResult.velocity.languages.map(lang => (
                      <span key={lang} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>{lang}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#22c55e", marginBottom: 8 }}>Verified Skills</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {auditResult.verified_skills.length > 0 ? auditResult.verified_skills.slice(0, 20).map(skill => (
                      <span key={skill} style={{ fontSize: "0.7rem", padding: "3px 9px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>{skill}</span>
                    )) : <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No skills detected yet.</span>}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#06b6d4", marginBottom: 8 }}>Commit Signals</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {auditResult.commit_skill_signals.length > 0 ? auditResult.commit_skill_signals.slice(0, 20).map(signal => (
                      <span key={signal} style={{ fontSize: "0.7rem", padding: "3px 9px", borderRadius: 99, background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)" }}>{signal}</span>
                    )) : <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No commit signals detected yet.</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROOF AUDIT */}
      {activeTab === "proof" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#22c55e" }}>verified_user</span>
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>GitHub Proof Auditor</h3>
              </div>
              {proofResult?.source_mode && (
                <span style={{
                  fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, fontWeight: 600,
                  background: proofResult.source_mode === "snapshot_fallback" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                  color: proofResult.source_mode === "snapshot_fallback" ? "#f59e0b" : "#22c55e",
                  border: `1px solid ${proofResult.source_mode === "snapshot_fallback" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
                }}>
                  {proofResult.source_mode === "snapshot_fallback" ? "Snapshot data" : "Live data"}
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16 }}>
              Verify your GitHub evidence against required skills and market context.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Target Job", value: targetJob, onChange: setTargetJob, placeholder: "Target job" },
                { label: "Location", value: location, onChange: setLocation, placeholder: "Location" },
                { label: "GitHub URL", value: repoUrl, onChange: setRepoUrl, placeholder: "https://github.com/owner or /owner/repo" },
              ].map(field => (
                <div key={field.label}>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-2)", marginBottom: 5 }}>{field.label}</p>
                  <input value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={runProofAudit}
                disabled={!isLoggedIn || proofLoading}
                style={{ padding: "11px 22px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              >
                {proofLoading ? "Verifying..." : "Verify with GitHub"}
              </button>
              <Link href="/student/proofs" style={{ padding: "11px 18px", borderRadius: 11, border: "1px solid var(--border)", background: "transparent", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center" }}>
                Open Proof Vault
              </Link>
            </div>
            {proofError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 10 }}>{proofError}</p>}
          </div>

          {proofResult && (
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Match bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Skills matched: {proofResult.match_count} / {proofResult.required_skills_count}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Confidence: {proofResult.repo_confidence.toFixed(1)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7c3aed,#22c55e)", width: `${Math.max(0, Math.min(100, (proofResult.match_count / Math.max(proofResult.required_skills_count, 1)) * 100))}%` }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#22c55e", marginBottom: 8 }}>Verified by Code</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {proofResult.verified_by_repo_skills.length > 0 ? proofResult.verified_by_repo_skills.map(skill => (
                      <span key={skill} style={{ fontSize: "0.7rem", padding: "3px 9px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>{skill}</span>
                    )) : <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No verified skills found.</span>}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 8 }}>Skill Gaps</p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {proofResult.skills_required_but_missing.slice(0, 8).map(skill => (
                      <li key={skill} style={{ fontSize: "0.78rem", color: "var(--muted)", paddingLeft: 12, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: "#ef4444" }}>·</span>{skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, fontSize: "0.72rem", color: "var(--muted-2)", lineHeight: 1.8 }}>
                <div>Repos: {proofResult.repos_checked.join(", ") || "none"}</div>
                <div>Languages: {proofResult.languages_detected.join(", ") || "none"}</div>
                <div>Adzuna mode: {adzunaModeLabel(proofResult.adzuna_query_mode)} · {proofResult.adzuna_query_used || "n/a"} · {proofResult.adzuna_location_used || "n/a"}</div>
                {proofResult.source_mode === "snapshot_fallback" && (
                  <div style={{ color: "#f59e0b" }}>{formatSnapshotFreshness(proofResult.snapshot_timestamp, proofResult.snapshot_age_minutes)}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SYNC */}
      {activeTab === "sync" && (
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b" }}>sync</span>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>GitHub to Plan Sync</h3>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20 }}>
            Sync GitHub activity into your 90-day kanban progress board.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={runGithubSync}
              disabled={!isLoggedIn || syncLoading}
              style={{ padding: "11px 22px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
              {syncLoading ? "Syncing..." : "Run GitHub Sync"}
            </button>
            <Link href="/student/kanban" style={{ padding: "11px 18px", borderRadius: 11, border: "1px solid var(--border)", background: "transparent", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center" }}>
              Open Kanban Board
            </Link>
          </div>
          {syncMessage && (
            <div style={{ marginTop: 14, padding: "11px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: "0.82rem" }}>
              {syncMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
