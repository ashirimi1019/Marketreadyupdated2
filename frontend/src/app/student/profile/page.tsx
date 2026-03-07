"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiSend, API_BASE, getAuthHeaders } from "@/lib/api";
import { useSession } from "@/lib/session";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then(mod => ({ default: mod.QRCodeSVG })),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

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
  parsed_skills?: string[] | null;
  resume_parse_status?: string | null;
};

type Major = { id: string; name: string; description?: string | null };
type Pathway = { id: string; name: string; description?: string | null; is_compatible: boolean; notes?: string | null };
type UserPathway = { major_id: string; pathway_id: string; cohort?: string | null };

type Tab = "profile" | "career" | "resume" | "share";

// ─── Reusable InputField ──────────────────────────────────────────────────────

function InputField({
  label, value, onChange, placeholder, disabled, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; disabled: boolean; type?: string;
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
          background: "var(--surface-2)", color: disabled ? "var(--muted)" : "var(--fg)",
          fontSize: "0.85rem", outline: "none", transition: "border-color 0.15s",
        }}
        onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "9px 18px", borderRadius: 11, cursor: "pointer",
        background: active ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "var(--surface)",
        color: active ? "#fff" : "var(--muted)",
        fontWeight: active ? 700 : 500,
        fontSize: "0.82rem",
        boxShadow: active ? "0 4px 14px rgba(124,58,237,0.3)" : "none",
        border: active ? "none" : "1px solid var(--border)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Share Panel ─────────────────────────────────────────────────────────────

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 6 }}>Share with Recruiters</h3>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
          Generate a public, verified profile link — no account required for recruiters to view your proof-first portfolio.
        </p>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid rgba(6,182,212,0.25)" }}>
        {!shareUrl ? (
          <button
            onClick={generate}
            disabled={loading}
            data-testid="generate-share-link-btn"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", borderRadius: 11,
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>QR Code for recruiters to scan</p>
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
                  textAlign: "center", padding: "10px 18px", borderRadius: 10,
                  border: "1px solid var(--border)", background: "var(--surface-2)",
                  color: "var(--fg-2)", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none",
                }}
              >
                Preview Public Profile
              </a>
              <button
                onClick={generate}
                data-testid="regenerate-link-btn"
                style={{
                  padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  // Active tab
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Profile Info state ────────────────────────────────────────────────────
  const [semester, setSemester] = useState("");
  const [state, setState] = useState("");
  const [university, setUniversity] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [mastersInterest, setMastersInterest] = useState(false);
  const [mastersTarget, setMastersTarget] = useState("");
  const [mastersTimeline, setMastersTimeline] = useState("");
  const [mastersStatus, setMastersStatus] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ── Career Path state ─────────────────────────────────────────────────────
  const [majors, setMajors] = useState<Major[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedPathway, setSelectedPathway] = useState("");
  const [cohort, setCohort] = useState("Fall 2026");
  const [careerLocked, setCareerLocked] = useState(false);
  const [careerSaving, setCareerSaving] = useState(false);
  const [careerMsg, setCareerMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ── Resume state ──────────────────────────────────────────────────────────
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeViewUrl, setResumeViewUrl] = useState<string | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [resumeParseStatus, setResumeParseStatus] = useState<string | null>(null);
  const [resumeMsg, setResumeMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // ── Load initial data ─────────────────────────────────────────────────────

  // Read ?tab= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "career" || tab === "resume" || tab === "share") {
      setActiveTab(tab as Tab);
    }
  }, []);

  // Load profile
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

  // Load majors
  useEffect(() => {
    apiGet<Major[]>("/majors").then(setMajors).catch(() => setMajors([]));
  }, []);

  // Load career pathway selection
  useEffect(() => {
    if (!isLoggedIn) return;
    const selectionKey = `mp_selection_${username}`;
    const stored = window.localStorage.getItem(selectionKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.major_id && parsed?.pathway_id) {
          setSelectedMajor(parsed.major_id);
          setSelectedPathway(parsed.pathway_id);
          if (parsed.cohort) setCohort(parsed.cohort);
          setCareerLocked(true);
        }
      } catch { /* ignore */ }
    }
    apiGet<UserPathway>("/user/pathway", headers)
      .then(data => {
        if (data?.major_id && data?.pathway_id) {
          setSelectedMajor(data.major_id);
          setSelectedPathway(data.pathway_id);
          if (data.cohort) setCohort(data.cohort);
          setCareerLocked(true);
          window.localStorage.setItem(selectionKey, JSON.stringify({
            major_id: data.major_id, pathway_id: data.pathway_id, cohort: data.cohort,
          }));
        }
      })
      .catch(async () => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.major_id && parsed?.pathway_id) {
              await apiSend("/user/pathway/select", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
              });
              setCareerLocked(true);
            }
          } catch { /* ignore */ }
        }
      });
  }, [isLoggedIn, username, headers]);

  // Load pathways when major changes
  useEffect(() => {
    if (!selectedMajor) { setPathways([]); return; }
    apiGet<Pathway[]>(`/majors/${selectedMajor}/pathways`).then(setPathways).catch(() => setPathways([]));
  }, [selectedMajor]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!isLoggedIn) return;
    setProfileMsg(null); setProfileSaving(true);
    try {
      await apiSend("/user/profile", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          semester, state, university, github_username: githubUsername || null,
          masters_interest: mastersInterest, masters_target: mastersTarget || null,
          masters_timeline: mastersTimeline || null, masters_status: mastersStatus || null,
        }),
      });
      setProfileMsg({ text: "Profile saved successfully.", type: "success" });
    } catch (e) {
      setProfileMsg({ text: e instanceof Error ? e.message : "Failed to save profile.", type: "error" });
    } finally { setProfileSaving(false); }
  };

  const saveCareerPath = async () => {
    if (!selectedMajor || !selectedPathway) {
      setCareerMsg({ text: "Select a major and pathway first.", type: "error" }); return;
    }
    if (careerLocked) { setCareerMsg({ text: "Selection is locked.", type: "error" }); return; }
    setCareerMsg(null); setCareerSaving(true);
    try {
      await apiSend("/user/pathway/select", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ major_id: selectedMajor, pathway_id: selectedPathway, cohort }),
      });
      const saved = await apiGet<UserPathway>("/user/pathway", headers);
      if (saved?.major_id && saved?.pathway_id) {
        setSelectedMajor(saved.major_id);
        setSelectedPathway(saved.pathway_id);
        setCareerLocked(true);
        setCareerMsg({ text: "Career path saved and locked.", type: "success" });
        window.localStorage.setItem(`mp_selection_${username}`, JSON.stringify({
          major_id: saved.major_id, pathway_id: saved.pathway_id, cohort: saved.cohort,
        }));
      }
    } catch (e) {
      setCareerMsg({ text: e instanceof Error ? e.message : "Failed to save selection.", type: "error" });
    } finally { setCareerSaving(false); }
  };

  const uploadResume = async () => {
    if (!isLoggedIn || !resumeFile) {
      setResumeMsg({ text: "Choose a resume file first.", type: "error" }); return;
    }
    setResumeMsg(null); setUploadingResume(true);
    try {
      const form = new FormData();
      form.append("file", resumeFile);
      const response = await fetch(`${API_BASE}/user/profile/resume`, {
        method: "POST",
        headers: getAuthHeaders(headers),
        body: form,
      });
      if (!response.ok) throw new Error(`Upload failed: ${await response.text()}`);
      const data = (await response.json()) as StudentProfile;
      setResumeUrl(data.resume_url ?? null);
      setResumeViewUrl(data.resume_view_url ?? null);
      setResumeFilename(data.resume_filename ?? null);
      setResumeUploadedAt(data.resume_uploaded_at ?? null);
      setParsedSkills(data.parsed_skills ?? []);
      setResumeParseStatus(data.resume_parse_status ?? null);
      setResumeFile(null);
      const skillCount = (data.parsed_skills ?? []).length;
      if (data.resume_parse_status === "no_resume_text" || data.resume_parse_status === "no_pathway") {
        setResumeMsg({
          text: data.resume_parse_status === "no_pathway"
            ? `Resume uploaded. Set your Career Path first to enable automatic skill matching.`
            : `Resume uploaded. The file appears to be image-based — use a text PDF or DOCX for automatic skill detection.`,
          type: "error",
        });
      } else {
        setResumeMsg({
          text: `Resume uploaded.${skillCount > 0 ? ` ${skillCount} checklist item(s) matched automatically.` : " No checklist items matched yet."}`,
          type: "success",
        });
      }
    } catch (e) {
      setResumeMsg({ text: e instanceof Error ? e.message : "Failed to upload resume.", type: "error" });
    } finally { setUploadingResume(false); }
  };

  const removeResume = async () => {
    if (!isLoggedIn || !resumeUrl) return;
    setResumeMsg(null); setDeletingResume(true);
    try {
      const response = await fetch(`${API_BASE}/user/profile/resume`, {
        method: "DELETE",
        headers: getAuthHeaders(headers),
      });
      if (!response.ok) throw new Error(`Remove failed: ${await response.text()}`);
      const data = (await response.json()) as StudentProfile;
      setResumeUrl(data.resume_url ?? null);
      setResumeViewUrl(data.resume_view_url ?? null);
      setResumeFilename(data.resume_filename ?? null);
      setResumeUploadedAt(data.resume_uploaded_at ?? null);
      setParsedSkills([]);
      setResumeParseStatus(null);
      setResumeMsg({ text: "Resume removed.", type: "success" });
    } catch (e) {
      setResumeMsg({ text: e instanceof Error ? e.message : "Failed to remove resume.", type: "error" });
    } finally { setDeletingResume(false); }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const isDisabled = !isLoggedIn || profileSaving;
  const selectedMajorObj = majors.find(m => m.id === selectedMajor);
  const selectedPathwayObj = pathways.find(p => p.id === selectedPathway);
  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 11,
    border: "1px solid var(--border)", background: "var(--surface-2)",
    color: "var(--fg)", fontSize: "0.85rem",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>My Profile</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Manage your academic info, career path, resume, and public recruiter profile.
        </p>
      </div>

      {!isLoggedIn && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to edit your profile.
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabButton label="My Info" icon="school" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
        <TabButton label="Career Path" icon="rocket_launch" active={activeTab === "career"} onClick={() => setActiveTab("career")} />
        <TabButton label="Resume & Skills" icon="description" active={activeTab === "resume"} onClick={() => setActiveTab("resume")} />
        <TabButton label="Share Profile" icon="share" active={activeTab === "share"} onClick={() => setActiveTab("share")} />
      </div>

      {/* ── Tab: My Info ──────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                  width: 44, height: 24, borderRadius: 12,
                  background: mastersInterest ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "var(--surface-3)",
                  position: "relative", cursor: isDisabled ? "not-allowed" : "pointer",
                  transition: "background 0.2s", flexShrink: 0, border: "1px solid var(--border)",
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

          {/* Save */}
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
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
            {profileMsg && (
              <span style={{
                fontSize: "0.82rem", padding: "8px 14px", borderRadius: 10,
                background: profileMsg.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${profileMsg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: profileMsg.type === "success" ? "#22c55e" : "#ef4444",
              }}>
                {profileMsg.text}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Career Path ──────────────────────────────────────────────── */}
      {activeTab === "career" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Select your major and specialization to unlock your personalized MRI checklist and 90-day plan.
              Selection is permanent — contact your admin to change it.
            </p>
          </div>

          {/* Lock banner */}
          {careerLocked ? (
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#22c55e" }}>lock</span>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#22c55e" }}>Career path locked</p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Contact your admin to change your major or pathway.</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4" }}>info</span>
              <p style={{ fontSize: "0.82rem", color: "var(--fg-2)" }}>
                Choose your major and pathway below. This selection will be permanently saved.
              </p>
            </div>
          )}

          {/* Cohort */}
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 8 }}>
              Cohort
            </label>
            <input
              value={cohort}
              onChange={e => setCohort(e.target.value)}
              disabled={!isLoggedIn || careerLocked}
              style={{ ...inputStyle, opacity: (!isLoggedIn || careerLocked) ? 0.5 : 1 }}
              placeholder="e.g., Fall 2026"
            />
          </div>

          {/* Major + Pathway grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Major column */}
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#a78bfa" }}>menu_book</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Major</h3>
              </div>
              <div>
                <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Choose Major
                </label>
                <select
                  value={selectedMajor}
                  onChange={e => setSelectedMajor(e.target.value)}
                  disabled={!isLoggedIn || careerLocked}
                  style={{ ...inputStyle, opacity: (!isLoggedIn || careerLocked) ? 0.5 : 1, cursor: careerLocked ? "not-allowed" : "pointer" }}
                >
                  <option value="">Select a major</option>
                  {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              {selectedMajorObj?.description && (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{selectedMajorObj.description}</p>
                </div>
              )}
              {majors.length > 0 && !careerLocked && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {majors.slice(0, 5).map(m => (
                    <button
                      key={m.id}
                      onClick={() => { if (!careerLocked && isLoggedIn) setSelectedMajor(m.id); }}
                      disabled={!isLoggedIn || careerLocked}
                      style={{
                        textAlign: "left", padding: "10px 12px", borderRadius: 10,
                        border: `1px solid ${selectedMajor === m.id ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
                        background: selectedMajor === m.id ? "rgba(124,58,237,0.1)" : "var(--surface-2)",
                        cursor: careerLocked ? "not-allowed" : "pointer", transition: "all 0.15s",
                        opacity: (!isLoggedIn || careerLocked) ? 0.5 : 1,
                      }}
                    >
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: selectedMajor === m.id ? "#a78bfa" : "var(--fg)" }}>{m.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pathway column */}
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#06b6d4" }}>fork_right</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Pathway</h3>
              </div>
              <div>
                <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Choose Pathway
                </label>
                <select
                  value={selectedPathway}
                  onChange={e => setSelectedPathway(e.target.value)}
                  disabled={!isLoggedIn || careerLocked || !selectedMajor}
                  style={{ ...inputStyle, opacity: (!isLoggedIn || careerLocked || !selectedMajor) ? 0.5 : 1, cursor: (careerLocked || !selectedMajor) ? "not-allowed" : "pointer" }}
                >
                  <option value="">Select a pathway</option>
                  {pathways.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedPathwayObj?.description && (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{selectedPathwayObj.description}</p>
                  {selectedPathwayObj.notes && (
                    <p style={{ fontSize: "0.72rem", color: "#f59e0b", marginTop: 6 }}>{selectedPathwayObj.notes}</p>
                  )}
                  {!selectedPathwayObj.is_compatible && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ef4444" }}>warning</span>
                      <p style={{ fontSize: "0.72rem", color: "#ef4444" }}>Not compatible with your current major</p>
                    </div>
                  )}
                </div>
              )}
              {pathways.length > 0 && !careerLocked && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pathways.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { if (!careerLocked && isLoggedIn) setSelectedPathway(p.id); }}
                      disabled={!isLoggedIn || careerLocked}
                      style={{
                        textAlign: "left", padding: "10px 12px", borderRadius: 10,
                        border: `1px solid ${selectedPathway === p.id ? "rgba(6,182,212,0.4)" : "var(--border)"}`,
                        background: selectedPathway === p.id ? "rgba(6,182,212,0.1)" : "var(--surface-2)",
                        cursor: careerLocked ? "not-allowed" : "pointer", transition: "all 0.15s",
                        opacity: (!isLoggedIn || careerLocked) ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: selectedPathway === p.id ? "#06b6d4" : "var(--fg)" }}>{p.name}</p>
                        {!p.is_compatible && <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ef4444" }}>warning</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!selectedMajor && (
                <div style={{ padding: "20px 16px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 6 }}>arrow_back</span>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Select a major first.</p>
                </div>
              )}
            </div>
          </div>

          {/* Save career path */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={saveCareerPath}
              disabled={!isLoggedIn || careerLocked || careerSaving || !selectedMajor || !selectedPathway}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, border: "none",
                background: careerLocked ? "var(--surface-2)" : "linear-gradient(135deg,#7c3aed,#5b21b6)",
                color: careerLocked ? "var(--muted)" : "#fff",
                fontWeight: 700, fontSize: "0.9rem",
                cursor: (careerLocked || careerSaving || !selectedMajor || !selectedPathway) ? "not-allowed" : "pointer",
                opacity: (!isLoggedIn || !selectedMajor || !selectedPathway) ? 0.5 : 1,
                boxShadow: careerLocked ? "none" : "0 4px 20px rgba(124,58,237,0.3)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {careerLocked ? "lock" : careerSaving ? "hourglass_top" : "save"}
              </span>
              {careerSaving ? "Saving..." : careerLocked ? "Locked" : "Save Career Path"}
            </button>
            {careerMsg && (
              <span style={{
                fontSize: "0.82rem", padding: "8px 14px", borderRadius: 10,
                background: careerMsg.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${careerMsg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: careerMsg.type === "success" ? "#22c55e" : "#ef4444",
              }}>
                {careerMsg.text}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Resume & Skills ──────────────────────────────────────────── */}
      {activeTab === "resume" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Upload your resume to automatically match checklist items, personalize AI guidance, and improve your MRI score.
              Use a <strong style={{ color: "var(--fg)" }}>text-based PDF or DOCX</strong> for best results.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["MRI: auto-satisfy checklist items", "Interview AI: relevant prompts", "Resume AI: keyword alignment", "Career AI: role targeting"].map(item => (
              <span key={item} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                {item}
              </span>
            ))}
          </div>

          {/* Current resume status */}
          {resumeUrl && (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
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

          {/* Upload area */}
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{resumeUrl ? "Replace Resume" : "Upload Resume"}</h3>

            <div
              onClick={() => !uploadingResume && resumeInputRef.current?.click()}
              style={{
                border: `1px dashed ${resumeFile ? "rgba(124,58,237,0.5)" : "var(--border)"}`,
                borderRadius: 12, padding: "24px 20px", textAlign: "center",
                cursor: uploadingResume ? "default" : "pointer",
                background: resumeFile ? "rgba(124,58,237,0.04)" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf"
                style={{ display: "none" }}
                onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
              />
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: resumeFile ? "#a78bfa" : "var(--muted)", display: "block", marginBottom: 6 }}>
                {resumeFile ? "check_circle" : "upload_file"}
              </span>
              <p style={{ fontSize: "0.85rem", color: resumeFile ? "var(--fg)" : "var(--muted)", fontWeight: resumeFile ? 600 : 400 }}>
                {resumeFile ? resumeFile.name : "Click to choose a resume file"}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>PDF, DOCX, TXT, RTF — max 10MB</p>
            </div>

            {/* Image PDF warning */}
            {resumeParseStatus === "no_resume_text" && (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b", flexShrink: 0 }}>warning</span>
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f59e0b", marginBottom: 3 }}>Image-based PDF detected</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    Your resume appears to be a scanned image or image-only PDF. Automatic skill extraction requires a text-based PDF or DOCX. Try exporting from Word, Google Docs, or Overleaf.
                  </p>
                </div>
              </div>
            )}

            {/* No pathway warning */}
            {resumeParseStatus === "no_pathway" && (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4", flexShrink: 0 }}>info</span>
                <p style={{ fontSize: "0.78rem", color: "var(--fg-2)", lineHeight: 1.5 }}>
                  Resume uploaded but no career path is set yet. Go to the <strong>Career Path</strong> tab to select your major and pathway — then re-upload your resume to auto-match checklist items.
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={uploadResume}
                disabled={!isLoggedIn || uploadingResume || deletingResume || !resumeFile}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10, border: "none",
                  background: resumeFile ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "var(--surface-2)",
                  color: resumeFile ? "#fff" : "var(--muted)",
                  fontWeight: 700, fontSize: "0.85rem", cursor: (resumeFile && !uploadingResume) ? "pointer" : "not-allowed",
                  opacity: uploadingResume ? 0.7 : 1, transition: "all 0.15s",
                }}
              >
                {uploadingResume ? "Uploading & Analyzing…" : resumeUrl ? "Replace Resume" : "Upload Resume"}
              </button>
              {resumeUrl && (
                <button
                  onClick={removeResume}
                  disabled={!isLoggedIn || uploadingResume || deletingResume}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  {deletingResume ? "Removing..." : "Remove Resume"}
                </button>
              )}
            </div>
          </div>

          {/* Status message */}
          {resumeMsg && (
            <div style={{
              padding: "12px 16px", borderRadius: 11,
              background: resumeMsg.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${resumeMsg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
              color: resumeMsg.type === "success" ? "#22c55e" : "#f59e0b",
              fontSize: "0.82rem",
            }}>
              {resumeMsg.text}
            </div>
          )}

          {/* Parsed skills */}
          {parsedSkills.length > 0 && (
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid rgba(34,197,94,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#22c55e" }}>verified</span>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{parsedSkills.length} checklist item{parsedSkills.length !== 1 ? "s" : ""} auto-matched from resume</h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {parsedSkills.map(skill => (
                  <span key={skill} style={{
                    fontSize: "0.75rem", padding: "4px 12px", borderRadius: 99,
                    background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)",
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 12 }}>
                These items are now marked as satisfied in your checklist and count toward your MRI score.
              </p>
            </div>
          )}

          {/* No skills info tip */}
          {resumeUrl && parsedSkills.length === 0 && resumeParseStatus && resumeParseStatus !== "no_resume_text" && resumeParseStatus !== "no_pathway" && (
            <div style={{ padding: "12px 16px", borderRadius: 11, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "#a78bfa" }}>No checklist items matched yet.</strong> This can happen if your resume content doesn&apos;t closely match the requirement titles in your pathway, or if AI analysis is temporarily unavailable. You can manually submit proofs in the <strong style={{ color: "var(--fg)" }}>Tasks</strong> tab.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Share Profile ────────────────────────────────────────────── */}
      {activeTab === "share" && isLoggedIn && <SharePanel />}
      {activeTab === "share" && !isLoggedIn && (
        <div style={{ padding: "16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to generate your share link.
        </div>
      )}
    </div>
  );
}
