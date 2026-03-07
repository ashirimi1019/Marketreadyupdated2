"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend, API_BASE, getAuthHeaders } from "@/lib/api";
import { useSession } from "@/lib/session";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then(mod => ({ default: mod.QRCodeSVG })),
  { ssr: false }
);

type StudentProfile = {
  semester?: string | null;
  state?: string | null;
  university?: string | null;
  masters_interest?: boolean;
  masters_target?: string | null;
  masters_timeline?: string | null;
  masters_status?: string | null;
  github_username?: string | null;
  resume_url?: string | null;
  resume_view_url?: string | null;
  resume_filename?: string | null;
  resume_uploaded_at?: string | null;
};

type ChecklistItem = { id: string; status: string };
type Readiness = { score: number; band: string };

function InputField({
  label, value, onChange, placeholder, disabled, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; disabled: boolean; type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 7 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)",
          background: disabled ? "var(--surface-2)" : "var(--surface-2)", color: disabled ? "var(--muted)" : "var(--fg)",
          fontSize: "0.85rem", outline: "none", transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
      />
    </div>
  );
}

function SharePanel() {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const data = await apiSend<{ share_url: string; share_slug: string }>("/profile/generate-share-link", { method: "POST" });
      setShareUrl(data.share_url);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid rgba(6,182,212,0.25)" }} data-testid="share-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#06b6d4" }}>share</span>
        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Share with Recruiters</h3>
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 18 }}>
        Generate a public, verified profile link — no signup required for recruiters.
      </p>
      {!shareUrl ? (
        <button
          onClick={generate}
          disabled={loading}
          data-testid="generate-share-link-btn"
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", borderRadius: 11,
            border: "none", background: "linear-gradient(135deg,#06b6d4,#0284c7)", color: "#fff",
            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span>
          {loading ? "Generating..." : "Generate Share Link"}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              readOnly
              value={shareUrl}
              data-testid="share-link-input"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--surface-2)", color: "var(--fg-2)", fontSize: "0.8rem", fontFamily: "var(--font-mono)",
              }}
            />
            <button
              onClick={copyLink}
              data-testid="copy-link-btn"
              style={{
                padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
                background: copied ? "rgba(34,197,94,0.12)" : "var(--surface-2)",
                color: copied ? "#22c55e" : "var(--fg-2)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {QRCodeSVG && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>QR Code for recruiters</p>
              <div style={{ padding: 12, borderRadius: 14, background: "#fff" }} data-testid="qr-code">
                <QRCodeSVG value={shareUrl} size={140} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="view-public-profile-btn"
              style={{
                flex: 1, textAlign: "center", padding: "10px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface-2)",
                color: "var(--fg-2)", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none",
              }}
            >
              Preview Profile
            </a>
            <button
              onClick={generate}
              data-testid="regenerate-link-btn"
              style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--border)",
                background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
              }}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentProfilePage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const [semester, setSemester] = useState("");
  const [state, setState] = useState("");
  const [university, setUniversity] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [mastersInterest, setMastersInterest] = useState(false);
  const [mastersTarget, setMastersTarget] = useState("");
  const [mastersTimeline, setMastersTimeline] = useState("");
  const [mastersStatus, setMastersStatus] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeViewUrl, setResumeViewUrl] = useState<string | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<StudentProfile>("/user/profile", headers).then(data => {
      setSemester(data.semester ?? "");
      setState(data.state ?? "");
      setUniversity(data.university ?? "");
      setGithubUsername(data.github_username ?? "");
      setMastersInterest(Boolean(data.masters_interest));
      setMastersTarget(data.masters_target ?? "");
      setMastersTimeline(data.masters_timeline ?? "");
      setMastersStatus(data.masters_status ?? "");
      setResumeUrl(data.resume_url ?? null);
      setResumeViewUrl(data.resume_view_url ?? null);
      setResumeFilename(data.resume_filename ?? null);
      setResumeUploadedAt(data.resume_uploaded_at ?? null);
    }).catch(() => {});
  }, [headers, isLoggedIn]);

  const setMsg = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg); setMessageType(type);
  };

  const saveProfile = async () => {
    if (!isLoggedIn) { setMsg("Please log in to save your profile.", "error"); return; }
    setMessage(null); setSaving(true);
    try {
      await apiSend("/user/profile", {
        method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ semester, state, university, masters_interest: mastersInterest, masters_target: mastersTarget || null, masters_timeline: mastersTimeline || null, masters_status: mastersStatus || null, github_username: githubUsername || null }),
      });
      setMsg("Profile saved successfully.");
    } catch (error) { setMsg(error instanceof Error ? error.message : "Failed to save profile.", "error"); }
    finally { setSaving(false); }
  };

  const uploadResume = async () => {
    if (!isLoggedIn) { setMsg("Please log in to upload your resume.", "error"); return; }
    if (!resumeFile) { setMsg("Choose a resume file first.", "error"); return; }
    setMessage(null); setUploadingResume(true);
    try {
      const form = new FormData();
      form.append("file", resumeFile);
      const response = await fetch(`${API_BASE}/user/profile/resume`, { method: "POST", headers: getAuthHeaders(headers), body: form });
      if (!response.ok) throw new Error(`Resume upload failed: ${await response.text()}`);
      const data = (await response.json()) as StudentProfile;
      setResumeUrl(data.resume_url ?? null);
      setResumeViewUrl(data.resume_view_url ?? null);
      setResumeFilename(data.resume_filename ?? null);
      setResumeUploadedAt(data.resume_uploaded_at ?? null);
      setResumeFile(null);
      const [checklist, readiness] = await Promise.all([
        apiGet<ChecklistItem[]>("/user/checklist", headers).catch(() => []),
        apiGet<Readiness>("/user/readiness", headers).catch(() => null),
      ]);
      const resumeSatisfied = checklist.filter(i => i.status === "satisfied by resume upload").length;
      const readinessText = readiness ? ` MRI updated to ${readiness.score.toFixed(0)}/100 (${readiness.band}).` : "";
      setMsg(`Resume uploaded.${resumeSatisfied > 0 ? ` ${resumeSatisfied} requirement(s) auto-satisfied.` : ""}${readinessText}`);
    } catch (error) { setMsg(error instanceof Error ? error.message : "Failed to upload resume.", "error"); }
    finally { setUploadingResume(false); }
  };

  const removeResume = async () => {
    if (!isLoggedIn || !resumeUrl) return;
    setMessage(null); setDeletingResume(true);
    try {
      const response = await fetch(`${API_BASE}/user/profile/resume`, { method: "DELETE", headers: getAuthHeaders(headers) });
      if (!response.ok) throw new Error(`Resume removal failed: ${await response.text()}`);
      const data = (await response.json()) as StudentProfile;
      setResumeUrl(data.resume_url ?? null);
      setResumeViewUrl(data.resume_view_url ?? null);
      setResumeFilename(data.resume_filename ?? null);
      setResumeUploadedAt(data.resume_uploaded_at ?? null);
      setResumeFile(null);
      setMsg("Resume removed. AI guidance will now use profile + entered context.");
    } catch (error) { setMsg(error instanceof Error ? error.message : "Failed to remove resume.", "error"); }
    finally { setDeletingResume(false); }
  };

  const isDisabled = !isLoggedIn || saving;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>My Profile</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Keep your academic context current so AI guidance stays relevant.</p>
      </div>

      {!isLoggedIn && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to edit your profile.
        </div>
      )}

      {/* Academic Details */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#a78bfa" }}>school</span>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Academic Details</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <InputField label="Current Year" value={semester} onChange={setSemester} placeholder="e.g., Year 2 (Sophomore)" disabled={isDisabled} />
          <InputField label="State" value={state} onChange={setState} placeholder="e.g., Virginia" disabled={isDisabled} />
          <InputField label="University" value={university} onChange={setUniversity} placeholder="e.g., George Mason University" disabled={isDisabled} />
          <InputField label="GitHub Username" value={githubUsername} onChange={setGithubUsername} placeholder="e.g., octocat" disabled={isDisabled} />
        </div>
      </div>

      {/* Masters Plans */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4" }}>psychology</span>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Masters Degree Plans</h3>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16 }}>
          Tell us your intent so we can tailor recommendations.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: isDisabled ? "not-allowed" : "pointer", marginBottom: 16 }}>
          <div
            onClick={() => !isDisabled && setMastersInterest(v => !v)}
            style={{
              width: 44, height: 24, borderRadius: 12, background: mastersInterest ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "var(--surface-3)",
              position: "relative", cursor: isDisabled ? "not-allowed" : "pointer", transition: "background 0.2s", flexShrink: 0,
              border: "1px solid var(--border)",
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: mastersInterest ? 23 : 3, width: 16, height: 16,
              borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--fg-2)" }}>I am approaching a Masters degree</span>
        </label>
        {mastersInterest && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <InputField label="Target Program" value={mastersTarget} onChange={setMastersTarget} placeholder="e.g., MS in Data Science" disabled={isDisabled} />
            <InputField label="Timeline" value={mastersTimeline} onChange={setMastersTimeline} placeholder="e.g., Fall 2027" disabled={isDisabled} />
            <InputField label="Status" value={mastersStatus} onChange={setMastersStatus} placeholder="e.g., Applying" disabled={isDisabled} />
          </div>
        )}
      </div>

      {/* Resume */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b" }}>description</span>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Resume for AI Personalization</h3>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 12 }}>
          Upload your resume so AI can tailor recommendations to your actual experience.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {["Career AI: role targeting", "Interview AI: relevant prompts", "Resume AI: keyword alignment"].map(item => (
            <span key={item} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
              {item}
            </span>
          ))}
        </div>

        {resumeUrl && (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#22c55e", marginBottom: 2 }}>
                  {resumeFilename ?? "Uploaded resume"}
                </p>
                {resumeUploadedAt && (
                  <p style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
                    Uploaded {new Date(resumeUploadedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <a
                href={(resumeViewUrl || resumeUrl).startsWith("http") ? resumeViewUrl || resumeUrl : `${API_BASE}${resumeViewUrl || resumeUrl}`}
                target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "#a78bfa", textDecoration: "none" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                View
              </a>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="profile-resume-upload" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            Resume File
            <input
              id="profile-resume-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf"
              title="Upload resume file"
              aria-label="Upload resume file"
              onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
              disabled={!isLoggedIn || uploadingResume || deletingResume || saving}
              style={{ display: "block", marginTop: 6, fontSize: "0.82rem", color: "var(--muted)" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={uploadResume}
              disabled={!isLoggedIn || uploadingResume || deletingResume || saving}
              style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
                fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                opacity: uploadingResume ? 0.7 : 1,
              }}
            >
              {uploadingResume ? "Uploading..." : resumeUrl ? "Replace Resume" : "Upload Resume"}
            </button>
            {resumeUrl && (
              <button
                onClick={removeResume}
                disabled={!isLoggedIn || uploadingResume || deletingResume || saving}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                {deletingResume ? "Removing..." : "Remove Resume"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <button
          onClick={saveProfile}
          disabled={isDisabled}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "12px 28px", borderRadius: 12,
            border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
            fontWeight: 700, fontSize: "0.9rem", cursor: isDisabled ? "not-allowed" : "pointer",
            boxShadow: "0 4px 20px rgba(124,58,237,0.3)", opacity: isDisabled ? 0.6 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
          {saving ? "Saving..." : "Save Profile"}
        </button>
        {message && (
          <span style={{
            fontSize: "0.82rem", padding: "8px 14px", borderRadius: 10,
            background: messageType === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${messageType === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            color: messageType === "success" ? "#22c55e" : "#ef4444",
          }}>
            {message}
          </span>
        )}
      </div>

      {isLoggedIn && <SharePanel />}
    </div>
  );
}
