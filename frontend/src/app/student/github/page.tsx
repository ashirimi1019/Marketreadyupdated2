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
  velocity: {
    velocity_score: number;
    recent_repos: number;
    total_repos: number;
    languages: string[];
    stars: number;
  };
  warnings: string[];
  bulk_upload_detected: boolean;
  profile?: {
    public_repos?: number;
    followers?: number;
    bio?: string | null;
  };
};

function adzunaModeLabel(value?: string | null): string {
  if (value === "role_rewrite") return "rewrite";
  if (value === "geo_widen") return "geo widen";
  if (value === "proxy_from_search") return "proxy";
  return "exact";
}

function formatSnapshotFreshness(timestamp?: string | null, ageMinutes?: number | null): string {
  if (!timestamp) return "Snapshot timestamp unavailable";
  if (typeof ageMinutes === "number") {
    return `Snapshot: ${timestamp} (${ageMinutes.toFixed(0)} min old)`;
  }
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

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<StudentProfile>("/user/profile")
      .then((profile) => {
        if (profile.github_username) {
          setGithubUsername(profile.github_username);
          setRepoUrl(`https://github.com/${profile.github_username}`);
        }
        if (profile.state) {
          setLocation(profile.state);
        }
      })
      .catch(() => null);
  }, [isLoggedIn]);

  const runGithubSignalAudit = async () => {
    if (!isLoggedIn) {
      setAuditError("Please log in to run GitHub audit.");
      return;
    }
    if (!githubUsername.trim()) {
      setAuditError("Add your GitHub username first.");
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await apiGet<GitHubAudit>(`/github/audit/${encodeURIComponent(githubUsername.trim())}`);
      setAuditResult(data);
    } catch (error) {
      setAuditError(getErrorMessage(error) || "GitHub signal audit failed.");
      setAuditResult(null);
    } finally {
      setAuditLoading(false);
    }
  };

  const runProofAudit = async () => {
    if (!isLoggedIn) {
      setProofError("Please log in to verify by GitHub.");
      return;
    }
    if (!repoUrl.trim()) {
      setProofError("Enter a GitHub profile or repo URL.");
      return;
    }
    setProofLoading(true);
    setProofError(null);
    try {
      const data = await apiSend<RepoProofChecker>("/user/ai/proof-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_job: targetJob.trim() || "software engineer",
          location: location.trim() || "united states",
          repo_url: repoUrl.trim(),
        }),
      });
      setProofResult(data);
    } catch (error) {
      setProofError(getErrorMessage(error) || "GitHub proof audit failed.");
      setProofResult(null);
    } finally {
      setProofLoading(false);
    }
  };

  const runGithubSync = async () => {
    if (!isLoggedIn) return;
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const result = await apiSend<{ synced_count: number }>("/kanban/sync-github", {
        method: "POST",
      });
      const count = result.synced_count || 0;
      setSyncMessage(`Synced ${count} task${count === 1 ? "" : "s"} from GitHub activity.`);
    } catch (error) {
      setSyncMessage(getErrorMessage(error) || "GitHub task sync failed.");
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <section className="panel space-y-6">
      <h2 className="text-3xl font-semibold">Github Workspace</h2>
      <p className="text-[color:var(--muted)]">
        All GitHub-related features in one place: signal audit, proof verification, and task sync.
      </p>

      {!isLoggedIn && (
        <p className="text-sm text-[color:var(--accent-2)]">Please log in to use GitHub features.</p>
      )}

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <h3 className="text-xl font-semibold">GitHub Signal Auditor</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Analyze repository velocity, languages, and verified skill signals from your public GitHub.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className="flex-1 rounded-lg border border-[color:var(--border)] p-3"
            value={githubUsername}
            onChange={(event) => setGithubUsername(event.target.value)}
            placeholder="GitHub username"
          />
          <button className="cta" onClick={runGithubSignalAudit} disabled={!isLoggedIn || auditLoading}>
            {auditLoading ? "Auditing..." : "Run Signal Audit"}
          </button>
          <Link className="cta cta-secondary" href="/student/profile">
            Edit Profile
          </Link>
        </div>

        {auditError && <p className="mt-3 text-sm text-[color:var(--accent-2)]">{auditError}</p>}

        {auditResult && (
          <div className="mt-4 grid gap-4 rounded-lg border border-[color:var(--border)] p-4">
            {auditResult.warnings.length > 0 && (
              <div className="rounded-lg border border-[rgba(255,179,0,0.3)] bg-[rgba(255,179,0,0.08)] p-3 text-sm text-[color:var(--warning)]">
                {auditResult.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className="text-xs text-[color:var(--muted)]">Velocity</p>
                <p className="mt-1 text-lg font-bold">{auditResult.velocity.velocity_score}/100</p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className="text-xs text-[color:var(--muted)]">Recent Repos</p>
                <p className="mt-1 text-lg font-bold">{auditResult.velocity.recent_repos}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className="text-xs text-[color:var(--muted)]">Total Repos</p>
                <p className="mt-1 text-lg font-bold">{auditResult.velocity.total_repos}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className="text-xs text-[color:var(--muted)]">Stars</p>
                <p className="mt-1 text-lg font-bold">{auditResult.velocity.stars.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
                <p className="text-xs text-[color:var(--muted)]">Followers</p>
                <p className="mt-1 text-lg font-bold">{auditResult.profile?.followers ?? 0}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-white">Verified Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {auditResult.verified_skills.length > 0 ? (
                    auditResult.verified_skills.slice(0, 20).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[rgba(0,200,150,0.35)] bg-[rgba(0,200,150,0.1)] px-2 py-1 text-xs text-[color:var(--success)]"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[color:var(--muted)]">No skills detected yet.</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-white">Commit Skill Signals</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {auditResult.commit_skill_signals.length > 0 ? (
                    auditResult.commit_skill_signals.slice(0, 20).map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-[rgba(61,109,255,0.35)] bg-[rgba(61,109,255,0.1)] px-2 py-1 text-xs text-[color:var(--primary)]"
                      >
                        {signal}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[color:var(--muted)]">No commit signals detected yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-semibold">GitHub Proof Auditor</h3>
          {proofResult?.source_mode && (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                proofResult.source_mode === "snapshot_fallback"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              Source: {proofResult.source_mode === "snapshot_fallback" ? "snapshot" : "live"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Verify your GitHub evidence against required skills and market context.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-[color:var(--border)] p-3"
            value={targetJob}
            onChange={(event) => setTargetJob(event.target.value)}
            placeholder="Target job"
          />
          <input
            className="rounded-lg border border-[color:var(--border)] p-3"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
          />
          <input
            className="rounded-lg border border-[color:var(--border)] p-3"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner or /owner/repo"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="cta" onClick={runProofAudit} disabled={!isLoggedIn || proofLoading}>
            {proofLoading ? "Verifying..." : "Verify with GitHub"}
          </button>
          <Link className="cta cta-secondary" href="/student/proofs">
            Open Proof Vault
          </Link>
        </div>

        {proofError && <p className="mt-3 text-sm text-[color:var(--accent-2)]">{proofError}</p>}

        {proofResult && (
          <div className="mt-4 grid gap-4 rounded-lg border border-[color:var(--border)] p-4">
            <p className="text-sm text-[color:var(--muted)]">
              Confidence: <span className="font-semibold text-white">{proofResult.repo_confidence.toFixed(1)}%</span>
            </p>
            <p className="text-sm text-[color:var(--muted)]">
              Verified by code:{" "}
              <span className="font-semibold text-white">
                {proofResult.match_count} / {proofResult.required_skills_count}
              </span>
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full bg-emerald-400/80 transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (proofResult.match_count / Math.max(proofResult.required_skills_count, 1)) * 100)
                  )}%`,
                }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Verified by code</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {proofResult.verified_by_repo_skills.length > 0 ? (
                  proofResult.verified_by_repo_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs text-green-300"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[color:var(--muted)]">No verified skills found.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Skill gap targets</p>
              <ul className="mt-2 grid gap-1 text-sm text-[color:var(--muted)]">
                {proofResult.skills_required_but_missing.slice(0, 8).map((skill) => (
                  <li key={skill}>- {skill}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              Repos checked: {proofResult.repos_checked.join(", ") || "none"} | Languages detected:{" "}
              {proofResult.languages_detected.join(", ") || "none"}
            </p>
            <p className="text-xs text-[color:var(--muted)]">
              Files scanned: {proofResult.files_checked.join(", ") || "none"}
            </p>
            <p className="text-xs text-[color:var(--muted)]">
              Adzuna mode: {adzunaModeLabel(proofResult.adzuna_query_mode)} | Query:{" "}
              {proofResult.adzuna_query_used || "n/a"} | Location: {proofResult.adzuna_location_used || "n/a"}
            </p>
            {proofResult.adzuna_query_mode === "proxy_from_search" && (
              <p className="text-xs text-amber-300">
                Live trend derived from recent posting windows (1d/3d/7d/14d/30d).
              </p>
            )}
            {proofResult.source_mode === "snapshot_fallback" && (
              <p className="text-xs text-amber-300">
                {formatSnapshotFreshness(proofResult.snapshot_timestamp, proofResult.snapshot_age_minutes)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <h3 className="text-xl font-semibold">GitHub to Plan Sync</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Sync GitHub activity into your 90-day kanban progress.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="cta" onClick={runGithubSync} disabled={!isLoggedIn || syncLoading}>
            {syncLoading ? "Syncing..." : "Run GitHub Sync"}
          </button>
          <Link className="cta cta-secondary" href="/student/kanban">
            Open Kanban
          </Link>
        </div>
        {syncMessage && <p className="mt-3 text-sm text-[color:var(--muted)]">{syncMessage}</p>}
      </div>
    </section>
  );
}
