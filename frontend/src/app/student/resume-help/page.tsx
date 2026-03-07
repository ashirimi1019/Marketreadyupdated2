"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, apiGet, apiSend, getAuthHeaders } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import type { AiResumeArtifact, StudentProfile } from "@/types/api";

type HelperMode = "scratch" | "improve";

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

export default function StudentResumeHelpPage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const [helperMode, setHelperMode] = useState<HelperMode>("scratch");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeViewUrl, setResumeViewUrl] = useState<string | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);

  const [artifacts, setArtifacts] = useState<AiResumeArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<AiResumeArtifact | null>(null);
  const [loadingArtifact, setLoadingArtifact] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hydrateResumeMeta = (profile: StudentProfile) => {
    setResumeUrl(profile.resume_url ?? null);
    setResumeViewUrl(profile.resume_view_url ?? null);
    setResumeFilename(profile.resume_filename ?? null);
    setResumeUploadedAt(profile.resume_uploaded_at ?? null);
  };

  const loadProfile = useCallback(() => {
    if (!isLoggedIn) return;
    apiGet<StudentProfile>("/user/profile", headers)
      .then(hydrateResumeMeta)
      .catch(() => { setResumeUrl(null); setResumeViewUrl(null); setResumeFilename(null); setResumeUploadedAt(null); });
  }, [headers, isLoggedIn]);

  const loadArtifacts = useCallback(() => {
    if (!isLoggedIn) return;
    apiGet<AiResumeArtifact[]>("/user/ai/resume-architect", headers)
      .then(rows => { setArtifacts(rows); if (rows.length > 0) setActiveArtifact(current => current ?? rows[0]); })
      .catch(() => setArtifacts([]));
  }, [headers, isLoggedIn]);

  useEffect(() => { loadProfile(); loadArtifacts(); }, [loadArtifacts, loadProfile]);

  const uploadResume = async () => {
    if (!isLoggedIn) { setError("Please log in to upload your resume."); return; }
    if (!resumeFile) { setError("Choose a resume file first."); return; }
    setUploadingResume(true); setError(null); setMessage(null);
    try {
      const form = new FormData();
      form.append("file", resumeFile);
      const response = await fetch(`${API_BASE}/user/profile/resume`, { method: "POST", headers: getAuthHeaders(headers), body: form });
      if (!response.ok) { const text = await response.text(); throw new Error(`Resume upload failed: ${text}`); }
      const profile = (await response.json()) as StudentProfile;
      hydrateResumeMeta(profile);
      setResumeFile(null);
      setMessage("Resume uploaded. AI Resume Helper can now improve your existing resume.");
    } catch (err) { setError(getErrorMessage(err) || "Failed to upload resume."); }
    finally { setUploadingResume(false); }
  };

  const removeResume = async () => {
    if (!isLoggedIn) { setError("Please log in to manage your resume."); return; }
    if (!resumeUrl) { setError("No resume is currently saved."); return; }
    setDeletingResume(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/user/profile/resume`, { method: "DELETE", headers: getAuthHeaders(headers) });
      if (!response.ok) { const text = await response.text(); throw new Error(`Resume removal failed: ${text}`); }
      const profile = (await response.json()) as StudentProfile;
      hydrateResumeMeta(profile); setResumeFile(null);
      setMessage("Uploaded resume removed.");
    } catch (err) { setError(getErrorMessage(err) || "Failed to remove resume."); }
    finally { setDeletingResume(false); }
  };

  const runResumeHelper = async () => {
    if (!isLoggedIn) { setError("Please log in to use Resume Help."); return; }
    setLoadingArtifact(true); setError(null); setMessage(null);
    try {
      const modePrompt = helperMode === "improve"
        ? "Improve my uploaded resume for ATS and recruiter readability."
        : "Build a resume from scratch using my profile and proof context.";
      const artifact = await apiSend<AiResumeArtifact>("/user/ai/resume-architect", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          target_role: targetRole.trim() || null,
          job_description: `${modePrompt}${jobDescription.trim() ? ` ${jobDescription.trim()}` : ""}`,
        }),
      });
      setActiveArtifact(artifact);
      loadArtifacts();
      setMessage(helperMode === "improve"
        ? "AI Resume Helper generated an improved resume draft from your uploaded/profile context."
        : "AI Resume Helper generated a resume draft from scratch.");
    } catch (err) { setError(getErrorMessage(err) || "Unable to generate resume output."); }
    finally { setLoadingArtifact(false); }
  };

  const copyArtifact = async () => {
    if (!activeArtifact?.markdown_content) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.markdown_content);
      setMessage("Resume draft copied."); setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError("Could not copy resume draft."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#a78bfa" }}>description</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI-Powered</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Resume Help</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Build from scratch or improve your uploaded resume with ATS-targeted output.</p>
      </div>

      {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>{error}</div>}
      {message && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: "0.82rem" }}>{message}</div>}

      {/* Resume Upload */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#06b6d4" }}>upload_file</span>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Uploaded Resume</h3>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 14 }}>Upload your current resume if you want AI to edit and improve it.</p>

        {resumeUrl ? (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#22c55e" }}>check_circle</span>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#22c55e" }}>{resumeFilename ?? "Uploaded resume"}</p>
            </div>
            {resumeUploadedAt && <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>Uploaded {new Date(resumeUploadedAt).toLocaleString()}</p>}
            <a
              href={(resumeViewUrl || resumeUrl).startsWith("http") ? resumeViewUrl || resumeUrl : `${API_BASE}${resumeViewUrl || resumeUrl}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: "0.78rem", color: "#a78bfa", textDecoration: "underline", display: "inline-block", marginTop: 6 }}
            >
              View resume file
            </a>
          </div>
        ) : (
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 14 }}>No resume uploaded yet.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
          <input
            type="file" accept=".pdf,.doc,.docx,.txt,.rtf"
            onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
            style={{ ...inputStyle, padding: "9px 14px" }}
          />
          <button
            onClick={uploadResume} disabled={!isLoggedIn || uploadingResume}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#06b6d4,#0891b2)", color: "#fff",
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap",
              opacity: !isLoggedIn ? 0.5 : 1,
            }}
          >
            {uploadingResume ? "Uploading..." : resumeUrl ? "Replace" : "Upload"}
          </button>
          {resumeUrl && (
            <button
              onClick={removeResume} disabled={!isLoggedIn || deletingResume}
              style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
            >
              {deletingResume ? "Removing..." : "Remove"}
            </button>
          )}
        </div>
      </div>

      {/* AI Resume Helper */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#a78bfa" }}>auto_awesome</span>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>AI Resume Helper</h3>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {(["scratch", "improve"] as HelperMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setHelperMode(mode)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: helperMode === mode ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "transparent",
                color: helperMode === mode ? "#fff" : "var(--muted)",
                fontWeight: helperMode === mode ? 700 : 500, fontSize: "0.82rem",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: helperMode === mode ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
              }}
            >
              {mode === "scratch" ? "Build from Scratch" : "Improve Existing"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="resume-help-role" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Target Role
            </label>
            <input id="resume-help-role" value={targetRole} onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g., Backend Engineer" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="resume-help-jd" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Job Description (optional)
          </label>
          <textarea id="resume-help-jd" rows={4} value={jobDescription} onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste a job description to tune ATS keywords and bullet positioning."
            style={{ ...inputStyle, height: "auto", resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <button
          onClick={runResumeHelper} disabled={!isLoggedIn || loadingArtifact}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 11, border: "none",
            background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
            fontWeight: 700, fontSize: "0.9rem", cursor: loadingArtifact ? "wait" : "pointer",
            boxShadow: "0 4px 20px rgba(124,58,237,0.3)", opacity: !isLoggedIn ? 0.5 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
          {loadingArtifact ? "Generating..." : "Generate Resume Output"}
        </button>
      </div>

      {/* Output */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#22c55e" }}>article</span>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Skill Gap Builder Output</h3>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16 }}>AI highlights ATS keywords and returns an editable markdown draft you can refine or export.</p>

        {artifacts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {artifacts.map(artifact => (
              <button
                key={artifact.id}
                onClick={() => setActiveArtifact(artifact)}
                style={{
                  textAlign: "left", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${activeArtifact?.id === artifact.id ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
                  background: activeArtifact?.id === artifact.id ? "rgba(124,58,237,0.08)" : "var(--surface-2)",
                  cursor: "pointer",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: "0.85rem", color: activeArtifact?.id === artifact.id ? "#a78bfa" : "var(--fg)" }}>
                  {artifact.target_role || "General resume draft"}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", marginTop: 2 }}>
                  {new Date(artifact.created_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}

        {activeArtifact ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Active Draft</p>
              <button
                onClick={copyArtifact}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9,
                  border: "1px solid var(--border)", background: copied ? "rgba(34,197,94,0.1)" : "var(--surface-2)",
                  color: copied ? "#22c55e" : "var(--fg-2)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{copied ? "check" : "content_copy"}</span>
                {copied ? "Copied!" : "Copy Markdown"}
              </button>
            </div>
            {activeArtifact.ats_keywords.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {activeArtifact.ats_keywords.map(keyword => (
                  <span key={keyword} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)" }}>
                    {keyword}
                  </span>
                ))}
              </div>
            )}
            <textarea
              readOnly value={activeArtifact.markdown_content}
              style={{ minHeight: 300, width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.8, resize: "vertical" }}
            />
          </div>
        ) : (
          <div style={{ padding: "32px 16px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--muted-2)", display: "block", marginBottom: 8 }}>article</span>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Generate a resume output above to see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
