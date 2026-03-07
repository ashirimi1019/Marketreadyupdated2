"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend, API_BASE } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import type {
  Proof,
  ChecklistItem,
  RepoProofChecker,
  StudentProfile,
  AiCrucibleEvaluation,
  ShareLinkResponse,
} from "@/types/api";

const CRUCIBLE_SCENARIO_ID = "sql-injection-outage";

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    verified: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Verified" },
    rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Rejected" },
    submitted: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Under Review" },
    needs_more_evidence: { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "Needs More Evidence" },
  };
  const c = cfg[status] || { color: "var(--muted)", bg: "var(--surface-2)", label: status.replace(/_/g, " ") };
  return (
    <span style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: c.bg, color: c.color, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

export default function StudentProofsPage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [itemMap, setItemMap] = useState<Record<string, string>>({});
  const [targetJob, setTargetJob] = useState("software engineer");
  const [location, setLocation] = useState("united states");
  const [repoUrl, setRepoUrl] = useState("");
  const [verifyingProofId, setVerifyingProofId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastRepoSource, setLastRepoSource] = useState<{
    source_mode: "live" | "snapshot_fallback";
    snapshot_timestamp?: string | null;
    snapshot_age_minutes?: number | null;
    adzuna_query_mode?: string | null;
    adzuna_query_used?: string | null;
    adzuna_location_used?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crucibleAnswer, setCrucibleAnswer] = useState("");
  const [crucibleLoading, setCrucibleLoading] = useState(false);
  const [crucibleError, setCrucibleError] = useState<string | null>(null);
  const [crucibleResult, setCrucibleResult] = useState<AiCrucibleEvaluation | null>(null);
  const [crucibleDeadline, setCrucibleDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [truthLink, setTruthLink] = useState<ShareLinkResponse | null>(null);
  const [truthLinkLoading, setTruthLinkLoading] = useState(false);
  const [truthLinkError, setTruthLinkError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"proofs" | "crucible" | "truthlink">("proofs");

  useEffect(() => {
    if (!isLoggedIn) return;
    setError(null); setSyncMessage(null);
    apiGet<Proof[]>("/user/proofs", headers).then(setProofs).catch(() => setError("Unable to load proofs."));
    apiGet<ChecklistItem[]>("/user/checklist", headers).then(items => {
      const map: Record<string, string> = {};
      items.forEach(i => { map[i.id] = i.title; });
      setItemMap(map);
    }).catch(() => setItemMap({}));
    apiGet<StudentProfile>("/user/profile", headers).then(profile => {
      if (profile.github_username) setRepoUrl(`https://github.com/${profile.github_username}`);
      if (profile.state) setLocation(profile.state);
    }).catch(() => null);
  }, [headers, isLoggedIn]);

  useEffect(() => {
    if (!crucibleDeadline) { setSecondsLeft(0); return; }
    const update = () => setSecondsLeft(Math.max(0, Math.floor((crucibleDeadline - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [crucibleDeadline]);

  const verifyProofWithRepo = async (proofId: string) => {
    if (!isLoggedIn) { setError("Please log in to verify proofs by repo."); return; }
    if (!repoUrl.trim()) { setError("Enter a GitHub URL before running repo verification."); return; }
    setVerifyingProofId(proofId); setError(null); setSyncMessage(null);
    try {
      const result = await apiSend<RepoProofChecker>("/user/ai/proof-checker", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ target_job: targetJob.trim() || "software engineer", location: location.trim() || "united states", repo_url: repoUrl.trim(), proof_id: proofId }),
      });
      setSyncMessage(`Repo sync: ${result.match_count}/${result.required_skills_count} required skills matched.`);
      setLastRepoSource({ source_mode: result.source_mode, snapshot_timestamp: result.snapshot_timestamp, snapshot_age_minutes: result.snapshot_age_minutes, adzuna_query_mode: result.adzuna_query_mode, adzuna_query_used: result.adzuna_query_used, adzuna_location_used: result.adzuna_location_used });
      setProofs(await apiGet<Proof[]>("/user/proofs", headers));
    } catch (err) { setError(getErrorMessage(err) || "Repo verification failed."); }
    finally { setVerifyingProofId(null); }
  };

  const runCrucible = async () => {
    if (!isLoggedIn) { setCrucibleError("Please log in to run the stress test."); return; }
    if (!crucibleAnswer.trim()) { setCrucibleError("Write your first 3 incident-response steps."); return; }
    setCrucibleLoading(true); setCrucibleError(null);
    try {
      const data = await apiSend<AiCrucibleEvaluation>("/user/ai/proof-crucible", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: CRUCIBLE_SCENARIO_ID, target_role: targetJob.trim() || "software engineer", location: location.trim() || "united states", answer: crucibleAnswer }),
      });
      setCrucibleResult(data);
    } catch (err) { setCrucibleError(getErrorMessage(err) || "Stress test scoring failed."); }
    finally { setCrucibleLoading(false); }
  };

  const generateTruthLink = async () => {
    if (!isLoggedIn) { setTruthLinkError("Please log in to generate your truth-link."); return; }
    setTruthLinkLoading(true); setTruthLinkError(null);
    try {
      const data = await apiSend<ShareLinkResponse>("/profile/generate-share-link", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      });
      setTruthLink(data);
    } catch (err) { setTruthLinkError(getErrorMessage(err) || "Unable to generate truth-link."); }
    finally { setTruthLinkLoading(false); }
  };

  const prettyProofType = (t: string) => t === "resume_upload_match" ? "resume upload match" : t.replace(/_/g, " ");
  const prettyStatus = (s: string) => s === "submitted" ? "waiting for verification" : s === "needs_more_evidence" ? "needs more evidence" : s.replace(/_/g, " ");

  const tabs = [
    { id: "proofs" as const, label: "My Proofs", icon: "verified_user", count: proofs.length },
    { id: "crucible" as const, label: "The Crucible", icon: "local_fire_department" },
    { id: "truthlink" as const, label: "Truth-Link", icon: "link" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Evidence Vault</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Track verification status, repo-verified skills, and AI stress tests.</p>
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
            {"count" in tab && tab.count !== undefined && tab.count > 0 && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: 99, background: "rgba(124,58,237,0.2)", color: "#a78bfa", fontWeight: 700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error/message */}
      {!isLoggedIn && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to view your proofs.
        </div>
      )}
      {error && <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>{error}</div>}
      {syncMessage && <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: "0.82rem" }}>{syncMessage}</div>}

      {/* PROOFS TAB */}
      {activeTab === "proofs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* GitHub Skill Sync */}
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#a78bfa" }}>hub</span>
              <p style={{ fontSize: "0.9rem", fontWeight: 700 }}>GitHub Skill Sync</p>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 14 }}>
              Link your repo and verify each proof against live CareerOneStop skill standards.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { placeholder: "https://github.com/owner or /owner/repo", value: repoUrl, onChange: setRepoUrl, label: "GitHub Repo" },
                { placeholder: "Target job", value: targetJob, onChange: setTargetJob, label: "Target Role" },
                { placeholder: "Location", value: location, onChange: setLocation, label: "Location" },
              ].map(field => (
                <div key={field.label}>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-2)", marginBottom: 5 }}>{field.label}</p>
                  <input
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.82rem" }}
                  />
                </div>
              ))}
            </div>
            {lastRepoSource && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontSize: "0.7rem", padding: "3px 10px", borderRadius: 99, fontWeight: 600,
                  background: lastRepoSource.source_mode === "snapshot_fallback" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                  color: lastRepoSource.source_mode === "snapshot_fallback" ? "#f59e0b" : "#22c55e",
                  border: `1px solid ${lastRepoSource.source_mode === "snapshot_fallback" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
                }}>
                  {lastRepoSource.source_mode === "snapshot_fallback" ? "Snapshot data" : "Live data"}
                </span>
                {lastRepoSource.adzuna_query_used && (
                  <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>Query: {lastRepoSource.adzuna_query_used} · {lastRepoSource.adzuna_location_used}</span>
                )}
              </div>
            )}
          </div>

          {/* Proof cards */}
          {proofs.length === 0 && isLoggedIn && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: "0.85rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: "block", marginBottom: 8, color: "var(--muted-2)" }}>folder_open</span>
              No proofs submitted yet. Head to the Checklist to submit your first proof.
            </div>
          )}
          {proofs.map(proof => {
            const metadata = proof.metadata && typeof proof.metadata === "object" ? proof.metadata as Record<string, unknown> : {};
            const repoVerified = Boolean(metadata.repo_verified);
            const rawMatched = metadata.repo_matched_skills;
            const matchedSkills = Array.isArray(rawMatched) ? rawMatched.map(v => String(v).trim()).filter(Boolean) : [];
            const repoConfidence = typeof metadata.repo_confidence === "number" ? metadata.repo_confidence : null;
            const proofUrl = (proof.view_url || proof.url).startsWith("http") ? proof.view_url || proof.url : `${API_BASE}${proof.view_url || proof.url}`;

            return (
              <div key={proof.id} style={{ background: "var(--surface)", borderRadius: 16, padding: 18, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", marginBottom: 4 }}>
                      {itemMap[proof.checklist_item_id] ?? "Checklist item"}
                    </p>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>
                      {prettyProofType(proof.proof_type)}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <StatusBadge status={proof.status} />
                      {!proof.url.startsWith("self_attested") && (
                        <a href={proofUrl} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#a78bfa", textDecoration: "none" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
                          View file
                        </a>
                      )}
                    </div>
                    {proof.review_note && (
                      <p style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--muted)", padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                        Note: {proof.review_note}
                      </p>
                    )}
                    {(repoVerified || matchedSkills.length > 0 || repoConfidence !== null) && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(34,197,94,0.06)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.15)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: matchedSkills.length ? 8 : 0 }}>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 99, background: repoVerified ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: repoVerified ? "#22c55e" : "#f59e0b", fontWeight: 700, border: `1px solid ${repoVerified ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                            {repoVerified ? "Verified by Repo" : "Repo Checked"}
                          </span>
                          {repoConfidence !== null && (
                            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Confidence: {repoConfidence.toFixed(1)}%</span>
                          )}
                        </div>
                        {matchedSkills.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {matchedSkills.slice(0, 8).map(skill => (
                              <span key={`${proof.id}-${skill}`} style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => verifyProofWithRepo(proof.id)}
                    disabled={!repoUrl.trim() || verifyingProofId === proof.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10,
                      border: "1px solid var(--border)", background: "var(--surface-2)",
                      color: "var(--fg-2)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                      opacity: !repoUrl.trim() ? 0.5 : 1,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>hub</span>
                    {verifyingProofId === proof.id ? "Verifying..." : "Verify by Repo"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CRUCIBLE TAB */}
      {activeTab === "crucible" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ef4444" }}>local_fire_department</span>
                <p style={{ fontSize: "0.95rem", fontWeight: 700 }}>The Crucible: 5-Minute Stress Test</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontWeight: 600 }}>
                  Timebox: 5 min
                </span>
                {crucibleDeadline && (
                  <span style={{ fontSize: "0.9rem", fontWeight: 800, color: secondsLeft < 60 ? "#ef4444" : "var(--fg)", fontFamily: "var(--font-mono)" }}>
                    {formatCountdown(secondsLeft)}
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 14 }}>
              Scenario: your API is hit by SQL injection and production is failing. We score how you think under pressure.
            </p>
            <pre style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.72rem", color: "#94a3b8", overflowX: "auto", lineHeight: 1.7, marginBottom: 14, whiteSpace: "pre-wrap" }}>
{`2026-02-22T22:40:17Z api-gateway WARN 500 POST /v1/payments
db ERROR syntax error at or near "OR 1=1" in query id=8f23
waf WARN signature=sql-injection source_ip=185.71.xx.xx`}
            </pre>
            {!crucibleDeadline ? (
              <button
                onClick={() => setCrucibleDeadline(Date.now() + 5 * 60 * 1000)}
                disabled={!isLoggedIn}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                Start 5-Minute Test
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  value={crucibleAnswer}
                  onChange={e => setCrucibleAnswer(e.target.value)}
                  placeholder="What are your first 3 steps and why?"
                  style={{ minHeight: 130, width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.82rem", lineHeight: 1.6, resize: "vertical" }}
                />
                <button
                  onClick={runCrucible}
                  disabled={!isLoggedIn || crucibleLoading}
                  style={{ padding: "11px 20px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>psychology</span>
                  {crucibleLoading ? "Scoring..." : "Score My Process"}
                </button>
              </div>
            )}
            {crucibleError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 10 }}>{crucibleError}</p>}
          </div>

          {crucibleResult && (
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid rgba(124,58,237,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: crucibleResult.rating === "elite" ? "#22c55e" : crucibleResult.rating === "strong" ? "#06b6d4" : "#f59e0b" }}>
                    {crucibleResult.process_score.toFixed(1)}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "capitalize" }}>{crucibleResult.rating.replace("_", " ")}</div>
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Process Score</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-2)" }}>Model: {crucibleResult.model_used}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {crucibleResult.dimensions.map(dim => (
                  <div key={dim.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{dim.label}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{dim.score.toFixed(0)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${Math.max(0, Math.min(100, dim.score))}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { label: "Strengths", items: crucibleResult.strengths, color: "#22c55e" },
                  { label: "Risks", items: crucibleResult.risks, color: "#f59e0b" },
                  { label: "Next Actions", items: crucibleResult.next_actions, color: "var(--fg)" },
                ].map(section => (
                  <div key={section.label}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: section.color, marginBottom: 6 }}>{section.label}</p>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                      {section.items.map(item => (
                        <li key={item} style={{ fontSize: "0.75rem", color: "var(--muted)", paddingLeft: 12, position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, color: section.color }}>·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRUTH-LINK TAB */}
      {activeTab === "truthlink" && (
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, border: "1px solid rgba(6,182,212,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#06b6d4" }}>link</span>
            <p style={{ fontSize: "0.95rem", fontWeight: 700 }}>Agentic Handshake Truth-Link</p>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20 }}>
            Generate your recruiter-safe machine endpoint with MRI + verified assets for agent-to-agent hiring workflows.
          </p>
          {!truthLink ? (
            <button
              onClick={generateTruthLink}
              disabled={!isLoggedIn || truthLinkLoading}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#06b6d4,#0284c7)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>generating_tokens</span>
              {truthLinkLoading ? "Generating..." : "Generate Truth-Link"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Human Profile URL</p>
                <a href={truthLink.share_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: "0.82rem", color: "#a78bfa", wordBreak: "break-all", textDecoration: "none" }}>
                  {truthLink.share_url}
                </a>
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Agent-Ready API Endpoint</p>
                <a href={`${API_BASE}/public/${truthLink.share_slug}/agent-ready`} target="_blank" rel="noreferrer"
                  style={{ fontSize: "0.78rem", color: "#06b6d4", wordBreak: "break-all", textDecoration: "none" }}>
                  {`${API_BASE}/public/${truthLink.share_slug}/agent-ready`}
                </a>
              </div>
            </div>
          )}
          {truthLinkError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 10 }}>{truthLinkError}</p>}
        </div>
      )}
    </div>
  );
}
