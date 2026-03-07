"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import type { AiResumeArtifact } from "@/types/api";

export default function StudentResumeArchitectPage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [artifacts, setArtifacts] = useState<AiResumeArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<AiResumeArtifact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadArtifacts = useCallback(() => {
    if (!isLoggedIn) return;
    apiGet<AiResumeArtifact[]>("/user/ai/resume-architect", headers).then(rows => {
      setArtifacts(rows);
      if (rows.length > 0) setActiveArtifact(current => current ?? rows[0]);
    }).catch(() => setArtifacts([]));
  }, [headers, isLoggedIn]);

  useEffect(() => { loadArtifacts(); }, [loadArtifacts]);

  const generateResume = async () => {
    if (!isLoggedIn) { setError("Please log in to generate a skill-gap artifact."); return; }
    setLoading(true); setError(null); setMessage(null);
    try {
      const artifact = await apiSend<AiResumeArtifact>("/user/ai/resume-architect", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ target_role: targetRole.trim() || null, job_description: jobDescription.trim() || null }),
      });
      setActiveArtifact(artifact);
      setMessage("Skill-gap artifact generated from your proof vault.");
      loadArtifacts();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg.includes("Not Found") ? "Resume endpoint not found. Verify backend deployment and NEXT_PUBLIC_API_BASE." : msg || "Could not generate skill-gap artifact.");
    } finally { setLoading(false); }
  };

  const copyResume = async () => {
    if (!activeArtifact?.markdown_content) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.markdown_content);
      setMessage("Artifact markdown copied.");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError("Could not copy artifact text."); }
  };

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.85rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#06b6d4" }}>auto_fix_high</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#06b6d4", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI-Powered</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Skill Gap Builder</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Generate market-facing gap-closing artifacts from your profile and submitted proofs.</p>
      </div>

      {/* Generator */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="resume-target-role" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Target Role
            </label>
            <input id="resume-target-role" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g., Software Engineer Intern" style={inputStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={generateResume}
              disabled={!isLoggedIn || loading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 22px", borderRadius: 11, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
                fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
              {loading ? "Generating..." : "Generate Gap-Closing Artifact"}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="resume-job-description" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Job Description (optional)
          </label>
          <textarea
            id="resume-job-description"
            rows={5}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste target job description to prioritize missing skills."
            style={{ ...inputStyle, height: "auto", resize: "vertical", lineHeight: 1.6 }}
          />
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 10 }}>{error}</p>}
        {message && <p style={{ color: "#22c55e", fontSize: "0.82rem", marginTop: 10 }}>{message}</p>}
        {!isLoggedIn && (
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 10 }}>Please log in to generate skill-gap artifacts.</p>
        )}
      </div>

      {/* Artifacts list + preview */}
      {artifacts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          {/* Left: list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>Generated Artifacts</h3>
            {artifacts.map(artifact => (
              <button
                key={artifact.id}
                onClick={() => setActiveArtifact(artifact)}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 12,
                  border: `1px solid ${activeArtifact?.id === artifact.id ? "rgba(124,58,237,0.5)" : "var(--border)"}`,
                  background: activeArtifact?.id === artifact.id ? "rgba(124,58,237,0.1)" : "var(--surface)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: "0.85rem", color: activeArtifact?.id === artifact.id ? "#a78bfa" : "var(--fg)" }}>
                  {artifact.target_role || "General artifact"}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", marginTop: 2 }}>
                  {new Date(artifact.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>

          {/* Right: artifact output */}
          {activeArtifact && (
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
                  {activeArtifact.target_role || "Artifact Output"}
                </h3>
                <button
                  onClick={copyResume}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
                    border: "1px solid var(--border)", background: copied ? "rgba(34,197,94,0.1)" : "var(--surface-2)",
                    color: copied ? "#22c55e" : "var(--fg-2)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{copied ? "check" : "content_copy"}</span>
                  {copied ? "Copied!" : "Copy Markdown"}
                </button>
              </div>

              {/* ATS Keywords */}
              {activeArtifact.ats_keywords.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>ATS Keywords</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {activeArtifact.ats_keywords.map(keyword => (
                      <span key={keyword} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)" }}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown content */}
              <textarea
                readOnly
                value={activeArtifact.markdown_content}
                style={{
                  minHeight: 360, width: "100%", padding: "14px 16px", borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--surface-2)",
                  color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.8, resize: "vertical",
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
