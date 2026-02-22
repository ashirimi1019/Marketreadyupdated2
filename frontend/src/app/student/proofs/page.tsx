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
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function crucibleTone(rating: string): string {
  if (rating === "elite") return "text-emerald-300";
  if (rating === "strong") return "text-cyan-300";
  if (rating === "developing") return "text-amber-300";
  return "text-rose-300";
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
    adzuna_query_mode?: "exact" | "role_rewrite" | "geo_widen" | "proxy_from_search";
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

  useEffect(() => {
    if (!isLoggedIn) return;
    setError(null);
    setSyncMessage(null);
    apiGet<Proof[]>("/user/proofs", headers)
      .then(setProofs)
      .catch(() => setError("Unable to load proofs."));
    apiGet<ChecklistItem[]>("/user/checklist", headers)
      .then((items) => {
        const map: Record<string, string> = {};
        items.forEach((item) => {
          map[item.id] = item.title;
        });
        setItemMap(map);
      })
      .catch(() => setItemMap({}));
    apiGet<StudentProfile>("/user/profile", headers)
      .then((profile) => {
        if (profile.github_username) {
          setRepoUrl(`https://github.com/${profile.github_username}`);
        }
        if (profile.state) {
          setLocation(profile.state);
        }
      })
      .catch(() => null);
  }, [headers, isLoggedIn]);

  useEffect(() => {
    if (!crucibleDeadline) {
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.floor((crucibleDeadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [crucibleDeadline]);

  const verifyProofWithRepo = async (proofId: string) => {
    if (!isLoggedIn) {
      setError("Please log in to verify proofs by repo.");
      return;
    }
    if (!repoUrl.trim()) {
      setError("Enter a GitHub URL before running repo verification.");
      return;
    }

    setVerifyingProofId(proofId);
    setError(null);
    setSyncMessage(null);
    try {
      const result = await apiSend<RepoProofChecker>("/user/ai/proof-checker", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          target_job: targetJob.trim() || "software engineer",
          location: location.trim() || "united states",
          repo_url: repoUrl.trim(),
          proof_id: proofId,
        }),
      });
      setSyncMessage(
        `Repo sync complete: ${result.match_count}/${result.required_skills_count} required skills matched by code.`
      );
      setLastRepoSource({
        source_mode: result.source_mode,
        snapshot_timestamp: result.snapshot_timestamp,
        snapshot_age_minutes: result.snapshot_age_minutes,
        adzuna_query_mode: result.adzuna_query_mode,
        adzuna_query_used: result.adzuna_query_used,
        adzuna_location_used: result.adzuna_location_used,
      });
      const refreshed = await apiGet<Proof[]>("/user/proofs", headers);
      setProofs(refreshed);
    } catch (err) {
      setError(getErrorMessage(err) || "Repo verification failed.");
    } finally {
      setVerifyingProofId(null);
    }
  };

  const startCrucibleTimer = () => {
    setCrucibleDeadline(Date.now() + 5 * 60 * 1000);
  };

  const runCrucible = async () => {
    if (!isLoggedIn) {
      setCrucibleError("Please log in to run the stress test.");
      return;
    }
    if (!crucibleAnswer.trim()) {
      setCrucibleError("Write your first 3 incident-response steps.");
      return;
    }
    setCrucibleLoading(true);
    setCrucibleError(null);
    try {
      const data = await apiSend<AiCrucibleEvaluation>("/user/ai/proof-crucible", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: CRUCIBLE_SCENARIO_ID,
          target_role: targetJob.trim() || "software engineer",
          location: location.trim() || "united states",
          answer: crucibleAnswer,
        }),
      });
      setCrucibleResult(data);
    } catch (err) {
      setCrucibleError(getErrorMessage(err) || "Stress test scoring failed.");
    } finally {
      setCrucibleLoading(false);
    }
  };

  const generateTruthLink = async () => {
    if (!isLoggedIn) {
      setTruthLinkError("Please log in to generate your truth-link.");
      return;
    }
    setTruthLinkLoading(true);
    setTruthLinkError(null);
    try {
      const data = await apiSend<ShareLinkResponse>("/profile/generate-share-link", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      setTruthLink(data);
    } catch (err) {
      setTruthLinkError(getErrorMessage(err) || "Unable to generate truth-link.");
    } finally {
      setTruthLinkLoading(false);
    }
  };

  const prettyProofType = (proofTypeValue: string) => {
    if (proofTypeValue === "resume_upload_match") return "resume upload match";
    return proofTypeValue.replace(/_/g, " ");
  };

  const prettyStatus = (status: string) => {
    if (status === "submitted") return "waiting for verification";
    if (status === "needs_more_evidence") return "needs more evidence";
    return status.replace(/_/g, " ");
  };

  return (
    <section className="panel">
      <h2 className="text-3xl font-semibold">My Proofs</h2>
      <p className="mt-2 text-[color:var(--muted)]">
        Track verification status, review notes, and repo-verified skill evidence.
      </p>
      {!isLoggedIn && (
        <p className="mt-4 text-sm text-[color:var(--accent-2)]">
          Please log in to view your proofs.
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-[color:var(--accent-2)]">{error}</p>
      )}
      {syncMessage && (
        <p className="mt-4 text-sm text-emerald-300">{syncMessage}</p>
      )}

      <div className="mt-5 rounded-xl border border-[color:var(--border)] p-4">
        <p className="text-sm font-semibold text-white">GitHub Skill Sync</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Link your repo and verify each proof against live CareerOneStop skill standards.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-[color:var(--border)] p-3"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner or /owner/repo"
          />
          <input
            className="rounded-lg border border-[color:var(--border)] p-3"
            value={targetJob}
            onChange={(e) => setTargetJob(e.target.value)}
            placeholder="Target job"
          />
          <input
            className="rounded-lg border border-[color:var(--border)] p-3"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
          />
        </div>
        {lastRepoSource && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                lastRepoSource.source_mode === "snapshot_fallback"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              Source: {lastRepoSource.source_mode === "snapshot_fallback" ? "snapshot" : "live"}
            </span>
            {lastRepoSource.source_mode === "snapshot_fallback" && lastRepoSource.snapshot_timestamp && (
              <span className="text-xs text-amber-300">
                Snapshot: {lastRepoSource.snapshot_timestamp}
                {typeof lastRepoSource.snapshot_age_minutes === "number"
                  ? ` (${lastRepoSource.snapshot_age_minutes.toFixed(0)} min old)`
                  : ""}
              </span>
            )}
            <span className="text-xs text-[color:var(--muted)]">
              Adzuna mode: {lastRepoSource.adzuna_query_mode || "exact"} | Query: {lastRepoSource.adzuna_query_used || "n/a"} |
              Location: {lastRepoSource.adzuna_location_used || "n/a"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--border)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">The Crucible: 5-Minute Stress Test</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">
              Timebox: 5 min
            </span>
            {crucibleDeadline && (
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-[color:var(--muted)]">
                {formatCountdown(secondsLeft)}
              </span>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Scenario: your API is hit by SQL injection and production is failing. We score how you think under pressure.
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-zinc-300">
{`2026-02-22T22:40:17Z api-gateway WARN 500 POST /v1/payments
db ERROR syntax error at or near "OR 1=1" in query id=8f23
waf WARN signature=sql-injection source_ip=185.71.xx.xx`}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="cta cta-secondary" onClick={startCrucibleTimer} disabled={!isLoggedIn}>
            Start 5-Minute Test
          </button>
        </div>
        <textarea
          className="mt-3 min-h-32 w-full rounded-lg border border-[color:var(--border)] bg-black/20 p-3 text-sm"
          value={crucibleAnswer}
          onChange={(e) => setCrucibleAnswer(e.target.value)}
          placeholder="What are your first 3 steps and why?"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="cta" onClick={runCrucible} disabled={!isLoggedIn || crucibleLoading}>
            {crucibleLoading ? "Scoring..." : "Score My Process"}
          </button>
        </div>
        {crucibleError && <p className="mt-3 text-sm text-[color:var(--accent-2)]">{crucibleError}</p>}
        {crucibleResult && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <p className={`text-3xl font-black ${crucibleTone(crucibleResult.rating)}`}>
                {crucibleResult.process_score.toFixed(1)}
              </p>
              <p className="text-sm text-[color:var(--muted)]">
                Process score ({crucibleResult.rating.replace("_", " ")}) - model: {crucibleResult.model_used}
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {crucibleResult.dimensions.map((dimension) => (
                <div key={dimension.label}>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>{dimension.label}</span>
                    <span>{dimension.score.toFixed(0)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-cyan-400/80"
                      style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="font-semibold text-emerald-300">Strengths</p>
                <ul className="mt-1 grid gap-1 text-[color:var(--muted)]">
                  {crucibleResult.strengths.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-amber-300">Risks</p>
                <ul className="mt-1 grid gap-1 text-[color:var(--muted)]">
                  {crucibleResult.risks.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white">Next actions</p>
                <ul className="mt-1 grid gap-1 text-[color:var(--muted)]">
                  {crucibleResult.next_actions.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--border)] p-4">
        <p className="text-sm font-semibold text-white">Agentic Handshake Truth-Link</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Generate your recruiter-safe machine endpoint with MRI + verified assets for agent-to-agent hiring workflows.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="cta" onClick={generateTruthLink} disabled={!isLoggedIn || truthLinkLoading}>
            {truthLinkLoading ? "Generating..." : "Generate Truth-Link"}
          </button>
        </div>
        {truthLinkError && <p className="mt-3 text-sm text-[color:var(--accent-2)]">{truthLinkError}</p>}
        {truthLink && (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <p className="text-[color:var(--muted)]">
              Human profile:{" "}
              <a className="text-[color:var(--accent-2)] underline" href={truthLink.share_url} target="_blank" rel="noreferrer">
                {truthLink.share_url}
              </a>
            </p>
            <p className="mt-1 text-[color:var(--muted)]">
              Agent-ready API:{" "}
              <a
                className="text-[color:var(--accent-2)] underline"
                href={`${API_BASE}/public/${truthLink.share_slug}/agent-ready`}
                target="_blank"
                rel="noreferrer"
              >
                {`${API_BASE}/public/${truthLink.share_slug}/agent-ready`}
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {proofs.length === 0 && isLoggedIn && (
          <div className="text-sm text-[color:var(--muted)]">
            No proofs submitted yet.
          </div>
        )}
        {proofs.map((proof) => (
          <div key={proof.id} className="rounded-xl border border-[color:var(--border)] p-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-[color:var(--muted)]">
                {itemMap[proof.checklist_item_id] ?? "Checklist item"}
              </p>
              <p className="text-lg font-semibold">
                {prettyProofType(proof.proof_type)} - {prettyStatus(proof.status)}
              </p>
              <a
                className="text-sm text-[color:var(--accent-2)] underline"
                href={
                  (proof.view_url || proof.url).startsWith("http")
                    ? proof.view_url || proof.url
                    : `${API_BASE}${proof.view_url || proof.url}`
                }
                target="_blank"
                rel="noreferrer"
              >
                {proof.url}
              </a>
              {(() => {
                const metadata = proof.metadata && typeof proof.metadata === "object" ? proof.metadata : {};
                const repoVerified = Boolean((metadata as Record<string, unknown>).repo_verified);
                const rawMatched = (metadata as Record<string, unknown>).repo_matched_skills;
                const matchedSkills =
                  Array.isArray(rawMatched) ? rawMatched.map((value) => String(value).trim()).filter(Boolean) : [];
                const confidenceValue = (metadata as Record<string, unknown>).repo_confidence;
                const repoConfidence = typeof confidenceValue === "number" ? confidenceValue : null;

                if (!repoVerified && matchedSkills.length === 0 && repoConfidence === null) return null;

                return (
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          repoVerified
                            ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border border-amber-500/40 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {repoVerified ? "Verified by Repo" : "Repo Checked"}
                      </span>
                      {repoConfidence !== null && (
                        <span className="text-xs text-[color:var(--muted)]">
                          Confidence: {repoConfidence.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {matchedSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {matchedSkills.slice(0, 8).map((skill) => (
                          <span
                            key={`${proof.id}-${skill}`}
                            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {proof.review_note && (
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Admin note: {proof.review_note}
                </p>
              )}
              <div className="mt-3">
                <button
                  className="cta cta-secondary"
                  onClick={() => verifyProofWithRepo(proof.id)}
                  disabled={!repoUrl.trim() || verifyingProofId === proof.id}
                >
                  {verifyingProofId === proof.id ? "Verifying..." : "Verify by Repo"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
