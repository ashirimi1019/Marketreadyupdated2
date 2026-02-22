"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, apiGet, apiSend, getAuthHeaders } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import type { AiResumeArtifact, StudentProfile } from "@/types/api";

type HelperMode = "scratch" | "improve";

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
      .then((profile) => hydrateResumeMeta(profile))
      .catch(() => {
        setResumeUrl(null);
        setResumeViewUrl(null);
        setResumeFilename(null);
        setResumeUploadedAt(null);
      });
  }, [headers, isLoggedIn]);

  const loadArtifacts = useCallback(() => {
    if (!isLoggedIn) return;
    apiGet<AiResumeArtifact[]>("/user/ai/resume-architect", headers)
      .then((rows) => {
        setArtifacts(rows);
        if (rows.length > 0) setActiveArtifact((current) => current ?? rows[0]);
      })
      .catch(() => setArtifacts([]));
  }, [headers, isLoggedIn]);

  useEffect(() => {
    loadProfile();
    loadArtifacts();
  }, [loadArtifacts, loadProfile]);

  const uploadResume = async () => {
    if (!isLoggedIn) {
      setError("Please log in to upload your resume.");
      return;
    }
    if (!resumeFile) {
      setError("Choose a resume file first.");
      return;
    }

    setUploadingResume(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", resumeFile);
      const response = await fetch(`${API_BASE}/user/profile/resume`, {
        method: "POST",
        headers: getAuthHeaders(headers),
        body: form,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resume upload failed: ${text}`);
      }
      const profile = (await response.json()) as StudentProfile;
      hydrateResumeMeta(profile);
      setResumeFile(null);
      setMessage("Resume uploaded. AI Resume Helper can now improve your existing resume.");
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to upload resume.");
    } finally {
      setUploadingResume(false);
    }
  };

  const removeResume = async () => {
    if (!isLoggedIn) {
      setError("Please log in to manage your resume.");
      return;
    }
    if (!resumeUrl) {
      setError("No resume is currently saved.");
      return;
    }

    setDeletingResume(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/user/profile/resume`, {
        method: "DELETE",
        headers: getAuthHeaders(headers),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resume removal failed: ${text}`);
      }
      const profile = (await response.json()) as StudentProfile;
      hydrateResumeMeta(profile);
      setResumeFile(null);
      setMessage("Uploaded resume removed.");
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to remove resume.");
    } finally {
      setDeletingResume(false);
    }
  };

  const runResumeHelper = async () => {
    if (!isLoggedIn) {
      setError("Please log in to use Resume Help.");
      return;
    }

    setLoadingArtifact(true);
    setError(null);
    setMessage(null);
    try {
      const modePrompt =
        helperMode === "improve"
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
      setMessage(
        helperMode === "improve"
          ? "AI Resume Helper generated an improved resume draft from your uploaded/profile context."
          : "AI Resume Helper generated a resume draft from scratch."
      );
    } catch (err) {
      setError(getErrorMessage(err) || "Unable to generate resume output.");
    } finally {
      setLoadingArtifact(false);
    }
  };

  const copyArtifact = async () => {
    if (!activeArtifact?.markdown_content) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.markdown_content);
      setMessage("Resume draft copied.");
    } catch {
      setError("Could not copy resume draft.");
    }
  };

  return (
    <section className="panel space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Resume Help</h2>
        <p className="mt-2 text-[color:var(--muted)]">
          Skill Gap Builder + AI Resume Helper for ATS-friendly resumes. Build from scratch or improve your uploaded resume.
        </p>
      </div>

      {!isLoggedIn && (
        <p className="text-sm text-[color:var(--accent-2)]">Please log in to use Resume Help.</p>
      )}
      {error && <p className="text-sm text-[color:var(--accent-2)]">{error}</p>}
      {message && <p className="text-sm text-[color:var(--muted)]">{message}</p>}

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <h3 className="text-xl font-semibold">Uploaded Resume</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Upload your current resume if you want AI to edit and improve it.
        </p>
        {resumeUrl ? (
          <div className="mt-3 rounded-lg border border-[color:var(--border)] p-3 text-sm text-[color:var(--muted)]">
            <p>Current resume: {resumeFilename ?? "Uploaded resume"}</p>
            {resumeUploadedAt && <p>Uploaded at: {new Date(resumeUploadedAt).toLocaleString()}</p>}
            <a
              className="mt-2 inline-block text-[color:var(--primary)] underline"
              href={(resumeViewUrl || resumeUrl).startsWith("http") ? resumeViewUrl || resumeUrl : `${API_BASE}${resumeViewUrl || resumeUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              View resume file
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--muted)]">No resume uploaded yet.</p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            className="rounded-lg border border-[color:var(--border)] p-3 text-sm"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.rtf"
            onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
          />
          <button className="cta" onClick={uploadResume} disabled={!isLoggedIn || uploadingResume}>
            {uploadingResume ? "Uploading..." : resumeUrl ? "Replace Resume" : "Upload Resume"}
          </button>
          {resumeUrl && (
            <button className="cta cta-secondary" onClick={removeResume} disabled={!isLoggedIn || deletingResume}>
              {deletingResume ? "Removing..." : "Remove Resume"}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <h3 className="text-xl font-semibold">AI Resume Helper</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Choose whether to build from scratch or improve your existing uploaded resume.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={helperMode === "scratch" ? "cta" : "cta cta-secondary"}
            onClick={() => setHelperMode("scratch")}
            disabled={!isLoggedIn || loadingArtifact}
          >
            Build From Scratch
          </button>
          <button
            className={helperMode === "improve" ? "cta" : "cta cta-secondary"}
            onClick={() => setHelperMode("improve")}
            disabled={!isLoggedIn || loadingArtifact}
          >
            Improve Existing Resume
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[color:var(--muted)]">
            Target role
            <input
              className="mt-2 w-full rounded-lg border border-[color:var(--border)] p-3"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="e.g., Backend Engineer"
            />
          </label>
          <label className="text-sm text-[color:var(--muted)] md:col-span-2">
            Job description (optional)
            <textarea
              className="mt-2 w-full rounded-lg border border-[color:var(--border)] p-3"
              rows={5}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste a job description to tune ATS keywords and bullet positioning."
            />
          </label>
        </div>

        <div className="mt-4">
          <button className="cta" onClick={runResumeHelper} disabled={!isLoggedIn || loadingArtifact}>
            {loadingArtifact ? "Generating..." : "Generate Resume Output"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <h3 className="text-xl font-semibold">Skill Gap Builder Output</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          AI highlights ATS keywords and returns an editable markdown draft you can refine or export.
        </p>

        {artifacts.length > 0 && (
          <div className="mt-4 grid gap-3">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                className={`rounded-xl border p-4 text-left ${
                  activeArtifact?.id === artifact.id ? "border-[color:var(--accent-2)]" : "border-[color:var(--border)]"
                }`}
                onClick={() => setActiveArtifact(artifact)}
              >
                <p className="font-medium text-white">{artifact.target_role || "General resume draft"}</p>
                <p className="text-sm text-[color:var(--muted)]">{new Date(artifact.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}

        {activeArtifact && (
          <div className="mt-4 rounded-xl border border-[color:var(--border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-white">Active draft</p>
              <button className="cta cta-secondary" onClick={copyArtifact}>
                Copy Markdown
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeArtifact.ats_keywords.length > 0 ? (
                activeArtifact.ats_keywords.map((keyword) => (
                  <span key={keyword} className="chip">
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[color:var(--muted)]">No ATS keywords extracted yet.</span>
              )}
            </div>
            <textarea
              className="mt-4 min-h-[320px] w-full rounded-lg border border-[color:var(--border)] p-3 font-mono text-sm"
              value={activeArtifact.markdown_content}
              readOnly
            />
          </div>
        )}
      </div>
    </section>
  );
}

