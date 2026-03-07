"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import type { AICareerOrchestrator, MarketStressTest, RepoProofChecker, StudentProfile } from "@/types/api";

const STRATEGIC_TIPS = [
  "Ship one public proof artifact every week, then rerun GitHub Proof Auditor.",
  "When MRI trend cools down, prioritize transferable backend/cloud/security projects.",
  "Treat missing skills as sprint tickets: one skill, one repo proof, one verified check.",
  "Use local-demand signals to choose projects, not random tutorial paths.",
];

const MRI_FORMULA_LABEL = "MRI = (0.40 × Skill Match) + (0.30 × Live Demand) + (0.30 × Proof Density)";
const STORAGE_KEYS = { orchestrator: "mri_demo_orchestrator_v1", weeklyChecks: "mri_demo_weekly_checks_v1", kanban: "mri_demo_kanban_v1" } as const;
type KanbanLane = "backlog" | "in_progress" | "done";
type MissionTask = { id: string; label: string; phase: string; lane: KanbanLane; };
type RadarMetric = { label: string; value: number; };

function polarPoint(center: number, radius: number, angle: number) {
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}
function trendLabel(value: string) {
  if (value === "heating_up") return "Heating Up";
  if (value === "cooling_down") return "Cooling Down";
  return "Neutral";
}
function adzunaModeLabel(value?: string | null) {
  if (value === "role_rewrite") return "rewrite";
  if (value === "geo_widen") return "geo widen";
  if (value === "proxy_from_search") return "proxy";
  return "exact";
}
function formatSnapshotFreshness(timestamp?: string | null, ageMinutes?: number | null) {
  if (!timestamp) return "Snapshot timestamp unavailable";
  if (typeof ageMinutes === "number") return `Snapshot: ${timestamp} (${ageMinutes.toFixed(0)} min old)`;
  return `Snapshot: ${timestamp}`;
}
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const p = (await r.json()) as { address?: { city?: string; town?: string; village?: string; state?: string; country?: string } };
    const city = p.address?.city || p.address?.town || p.address?.village;
    const state = p.address?.state;
    const country = p.address?.country;
    if (city && state) return `${city}, ${state}`;
    if (state && country) return `${state}, ${country}`;
    return country ?? null;
  } catch { return null; }
}

function mriTheme(score: number) {
  if (score >= 75) return { label: "Market Ready", color: "#22c55e", glow: "rgba(34,197,94,0.25)" };
  if (score >= 55) return { label: "Watchlist", color: "#f59e0b", glow: "rgba(245,158,11,0.2)" };
  return { label: "High Risk", color: "#ef4444", glow: "rgba(239,68,68,0.25)" };
}

const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.85rem" };

export default function StudentAiGuidePage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const [targetJob, setTargetJob] = useState("software engineer");
  const [location, setLocation] = useState("united states");
  const [availabilityHours, setAvailabilityHours] = useState("20");
  const [repoUrl, setRepoUrl] = useState("");
  const [smartSyncNotes, setSmartSyncNotes] = useState<string[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  const [stressResult, setStressResult] = useState<MarketStressTest | null>(null);
  const [stressLoading, setStressLoading] = useState(false);
  const [stressError, setStressError] = useState<string | null>(null);
  const [repoResult, setRepoResult] = useState<RepoProofChecker | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [orchestratorResult, setOrchestratorResult] = useState<AICareerOrchestrator | null>(null);
  const [orchestratorLoading, setOrchestratorLoading] = useState(false);
  const [orchestratorError, setOrchestratorError] = useState<string | null>(null);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [pivotError, setPivotError] = useState<string | null>(null);
  const [weeklyChecks, setWeeklyChecks] = useState<Record<string, boolean>>({});
  const [kanbanTasks, setKanbanTasks] = useState<MissionTask[]>([]);
  const [tipSeed, setTipSeed] = useState(0);
  const [logicLog, setLogicLog] = useState<string[]>(["[SENTINEL] Awaiting mission telemetry..."]);

  const appendLogicLog = (line: string) => {
    const stamp = new Date().toISOString().slice(11, 19);
    setLogicLog(prev => [`${stamp} ${line}`, ...prev].slice(0, 14));
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    const notes: string[] = [];
    apiGet<StudentProfile>("/user/profile", headers)
      .then(p => {
        if (cancelled) return;
        setProfile(p);
        if (p.state) { setLocation(p.state); notes.push(`Location from profile: ${p.state}`); }
        if (p.github_username) {
          setRepoUrl(`https://github.com/${p.github_username}`);
          notes.push(`GitHub synced: @${p.github_username}`);
          fetch(`https://api.github.com/users/${p.github_username}`)
            .then(async r => r.ok ? (await r.json()) as { location?: string | null; bio?: string | null } : null)
            .then(gp => {
              if (!gp || cancelled) return;
              if (gp.location && !p.state) { setLocation(gp.location); setSmartSyncNotes(prev => Array.from(new Set([...prev, `Location from GitHub: ${gp.location}`]))); }
              const bio = (gp.bio || "").toLowerCase();
              if (bio.includes("backend")) setTargetJob("backend engineer");
              else if (bio.includes("security")) setTargetJob("cybersecurity analyst");
              else if (bio.includes("data")) setTargetJob("data engineer");
            }).catch(() => null);
        }
        if (p.resume_filename) notes.push(`Resume synced: ${p.resume_filename}`);
        setSmartSyncNotes(prev => Array.from(new Set([...prev, ...notes])));
      }).catch(() => null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async pos => {
        if (cancelled) return;
        const resolved = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (resolved) { setLocation(resolved); setSmartSyncNotes(prev => Array.from(new Set([...prev, `Location from browser: ${resolved}`]))); }
      }, () => null, { timeout: 3000 });
    }
    return () => { cancelled = true; };
  }, [headers, isLoggedIn]);

  useEffect(() => { setTipSeed(Math.floor(Math.random() * STRATEGIC_TIPS.length)); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const r = window.localStorage.getItem(STORAGE_KEYS.orchestrator); if (r) setOrchestratorResult(JSON.parse(r)); } catch { /* */ }
    try { const r = window.localStorage.getItem(STORAGE_KEYS.weeklyChecks); if (r) setWeeklyChecks(JSON.parse(r)); } catch { /* */ }
    try { const r = window.localStorage.getItem(STORAGE_KEYS.kanban); if (r) { const p = JSON.parse(r); if (Array.isArray(p)) setKanbanTasks(p); } } catch { /* */ }
  }, []);

  useEffect(() => { if (typeof window !== "undefined" && orchestratorResult) window.localStorage.setItem(STORAGE_KEYS.orchestrator, JSON.stringify(orchestratorResult)); }, [orchestratorResult]);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.weeklyChecks, JSON.stringify(weeklyChecks)); }, [weeklyChecks]);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.kanban, JSON.stringify(kanbanTasks)); }, [kanbanTasks]);

  const runStressTest = async () => {
    if (!isLoggedIn) { setStressError("Please log in to run MRI."); return; }
    appendLogicLog("[SENTINEL] Running MRI stress test against live market feeds...");
    setStressLoading(true); setStressError(null);
    try {
      const data = await apiSend<MarketStressTest>("/user/ai/market-stress-test", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ target_job: targetJob.trim() || "software engineer", location: location.trim() || "united states" }) });
      setStressResult(data);
      appendLogicLog(`[SENTINEL] MRI updated ${data.score.toFixed(1)} (${trendLabel(data.vacancy_trend_label)} trend, source ${data.source_mode}).`);
    } catch (err) { setStressError(getErrorMessage(err) || "Market stress test unavailable."); setStressResult(null); appendLogicLog("[SENTINEL] MRI update failed."); }
    finally { setStressLoading(false); }
  };

  const runRepoAudit = async () => {
    if (!isLoggedIn) { setRepoError("Please log in to verify by GitHub."); return; }
    appendLogicLog("[VERIFIER] Auditing GitHub proof signals against checklist skills...");
    setRepoLoading(true); setRepoError(null);
    try {
      const data = await apiSend<RepoProofChecker>("/user/ai/proof-checker", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ target_job: targetJob.trim() || "software engineer", location: location.trim() || "united states", repo_url: repoUrl.trim() }) });
      setRepoResult(data);
      appendLogicLog(`[VERIFIER] Repo match ${data.match_count}/${data.required_skills_count}, confidence ${data.repo_confidence.toFixed(1)}%.`);
    } catch (err) { setRepoError(getErrorMessage(err) || "GitHub proof auditor unavailable."); setRepoResult(null); appendLogicLog("[VERIFIER] Repo audit failed."); }
    finally { setRepoLoading(false); }
  };

  const runOrchestrator = async (pivotRequested = false) => {
    if (!isLoggedIn) { setOrchestratorError("Please log in to run the mission planner."); return; }
    appendLogicLog(pivotRequested ? "[ORCHESTRATOR] Running market pivot simulation..." : "[ORCHESTRATOR] Building 90-day mission from current telemetry...");
    if (pivotRequested) { setPivotLoading(true); } else { setOrchestratorLoading(true); }
    setOrchestratorError(null); setPivotError(null);
    try {
      const parsedHours = Number(availabilityHours);
      const payload = await apiSend<AICareerOrchestrator>("/user/ai/orchestrator", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ target_job: targetJob.trim() || "software engineer", location: location.trim() || "united states", availability_hours_per_week: Number.isFinite(parsedHours) ? parsedHours : 20, pivot_requested: pivotRequested }) });
      setOrchestratorResult(payload);
      appendLogicLog(`[ORCHESTRATOR] Mission updated. Top gaps: ${(payload.top_missing_skills || []).slice(0, 2).join(", ") || "none"}.`);
    } catch (err) {
      const msg = getErrorMessage(err) || "Mission planner unavailable.";
      if (pivotRequested) setPivotError(msg); else setOrchestratorError(msg);
      setOrchestratorResult(null); appendLogicLog("[ORCHESTRATOR] Mission generation failed.");
    } finally { if (pivotRequested) setPivotLoading(false); else setOrchestratorLoading(false); }
  };

  const mriScore = stressResult?.score ?? 0;
  const mri = mriTheme(mriScore);

  const mission = useMemo(() => ((orchestratorResult?.mission_dashboard as Record<string, unknown>) || {}), [orchestratorResult]);
  const day0 = useMemo(() => Array.isArray(mission.day_0_30) ? (mission.day_0_30 as string[]) : [], [mission]);
  const day31 = useMemo(() => Array.isArray(mission.day_31_60) ? (mission.day_31_60 as string[]) : [], [mission]);
  const day61 = useMemo(() => Array.isArray(mission.day_61_90) ? (mission.day_61_90 as string[]) : [], [mission]);
  const weekly = useMemo(() => Array.isArray(mission.weekly_checkboxes) ? (mission.weekly_checkboxes as string[]) : [], [mission]);
  const weeklyCompleted = weekly.filter(i => weeklyChecks[i]).length;
  const weeklyProgressPct = weekly.length ? Math.round((weeklyCompleted / weekly.length) * 100) : 0;
  const kanbanDoneCount = kanbanTasks.filter(t => t.lane === "done").length;
  const kanbanProgressPct = kanbanTasks.length ? Math.round((kanbanDoneCount / kanbanTasks.length) * 100) : 0;
  const salaryFormatter = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), []);

  useEffect(() => { setWeeklyChecks(prev => { const next: Record<string, boolean> = {}; for (const i of weekly) next[i] = prev[i] ?? false; return next; }); }, [weekly]);

  useEffect(() => {
    const base: MissionTask[] = [
      ...day0.map((label, i) => ({ id: `d0-${i}-${label}`, label, phase: "Day 0-30", lane: "backlog" as const })),
      ...day31.map((label, i) => ({ id: `d31-${i}-${label}`, label, phase: "Day 31-60", lane: "backlog" as const })),
      ...day61.map((label, i) => ({ id: `d61-${i}-${label}`, label, phase: "Day 61-90", lane: "backlog" as const })),
    ];
    setKanbanTasks(prev => { const laneById = new Map(prev.map(t => [t.id, t.lane])); return base.map(t => ({ ...t, lane: laneById.get(t.id) || "backlog" })); });
  }, [day0, day31, day61]);

  const strategicTip = useMemo(() => {
    const topMissing = stressResult?.missing_skills?.[0];
    if (topMissing) return `Skill-gap move: build one public repo artifact for "${topMissing}" and rerun Proof Auditor.`;
    const repoGap = repoResult?.skills_required_but_missing?.[0];
    if (repoGap) return `Code evidence move: close "${repoGap}" this week with one deployed project update.`;
    return STRATEGIC_TIPS[tipSeed % STRATEGIC_TIPS.length];
  }, [repoResult, stressResult, tipSeed]);

  const radarMetrics = useMemo<RadarMetric[]>(() => {
    const techSignals = [stressResult?.components?.skill_overlap_score ?? 0, repoResult?.repo_confidence ?? 0].filter(v => Number.isFinite(v));
    const technicalDepth = techSignals.length ? techSignals.reduce((s, v) => s + v, 0) / techSignals.length : 0;
    const resilience = stressResult?.job_stability_score_2027 ?? 0;
    const communication = Math.min(100, 30 + weeklyProgressPct * 0.55);
    const marketDemand = stressResult?.components?.market_trend_score ?? 0;
    const secIndicators = [...(repoResult?.verified_by_repo_skills ?? []), ...(stressResult?.missing_skills ?? [])].join(" ").toLowerCase();
    const secBoost = /(security|owasp|sql|iam|auth|encryption|threat|cyber)/.test(secIndicators) ? 24 : 8;
    const securityAwareness = Math.min(100, 36 + secBoost + weeklyProgressPct * 0.2);
    return [
      { label: "Technical Depth", value: Math.max(0, Math.min(100, technicalDepth)) },
      { label: "2027 Resilience", value: Math.max(0, Math.min(100, resilience)) },
      { label: "Communication", value: Math.max(0, Math.min(100, communication)) },
      { label: "Market Demand", value: Math.max(0, Math.min(100, marketDemand)) },
      { label: "Security Awareness", value: Math.max(0, Math.min(100, securityAwareness)) },
    ];
  }, [repoResult, stressResult, weeklyProgressPct]);

  const radarGeo = useMemo(() => {
    const size = 240, center = size / 2, radius = 88;
    const startAngle = -Math.PI / 2, step = (Math.PI * 2) / Math.max(radarMetrics.length, 1);
    const axisPoints = radarMetrics.map((metric, i) => {
      const angle = startAngle + i * step;
      return { metric, outer: polarPoint(center, radius, angle), valuePoint: polarPoint(center, radius * (metric.value / 100), angle), labelPoint: polarPoint(center, radius + 22, angle) };
    });
    const polygonPoints = axisPoints.map(p => `${p.valuePoint.x.toFixed(1)},${p.valuePoint.y.toFixed(1)}`).join(" ");
    const gridPolygons = [0.25, 0.5, 0.75, 1].map(pct =>
      axisPoints.map((_, i) => { const gp = polarPoint(center, radius * pct, startAngle + i * step); return `${gp.x.toFixed(1)},${gp.y.toFixed(1)}`; }).join(" ")
    );
    return { size, center, axisPoints, polygonPoints, gridPolygons };
  }, [radarMetrics]);

  const exportMissionPlan = () => {
    if (!orchestratorResult) return;
    const today = new Date().toISOString().slice(0, 10);
    const slug = (targetJob.trim() || "career-mission").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const lines = ["Market Ready - 90-Day Agentic Mission", `Generated: ${today}`, `Target Role: ${targetJob}`, `Location: ${location}`, "", `Market Alert: ${orchestratorResult.market_alert || "n/a"}`, "", "Day 0-30", ...day0.map(i => `- ${i}`), "", "Day 31-60", ...day31.map(i => `- ${i}`), "", "Day 61-90", ...day61.map(i => `- ${i}`), "", "Weekly Checklist", ...weekly.map(i => `- [${weeklyChecks[i] ? "x" : " "}] ${i}`), "", "Kanban Status", ...kanbanTasks.map(t => `- [${t.lane}] ${t.label} (${t.phase})`), "", `Progress: ${weeklyCompleted}/${weekly.length || 0} (${weeklyProgressPct}%)`];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${slug}-90-day-mission-${today}.txt`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const moveKanbanTask = (taskId: string, lane: KanbanLane) => {
    setKanbanTasks(prev => prev.map(t => t.id === taskId ? { ...t, lane } : t));
  };

  const KANBAN_COLUMNS: { lane: KanbanLane; label: string; color: string; bg: string }[] = [
    { lane: "backlog", label: "Backlog", color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
    { lane: "in_progress", label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    { lane: "done", label: "Done", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#06b6d4" }}>rocket_launch</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#06b6d4", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Mission Control</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>AI Career Services</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {MRI_FORMULA_LABEL}
        </p>
      </div>

      {!isLoggedIn && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.85rem" }}>
          Please log in to use Market Stress Test, GitHub Proof Auditor, and the agentic mission workflow.
        </div>
      )}

      {/* Smart Sync */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4" }}>sync</span>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Smart Sync</h3>
          {smartSyncNotes.length > 0 && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)" }}>{smartSyncNotes.length} synced</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12 }}>
          {[
            { id: "guide-target", label: "Target Job", value: targetJob, setter: setTargetJob, placeholder: "e.g., Software Engineer" },
            { id: "guide-location", label: "Location", value: location, setter: setLocation, placeholder: "e.g., United States" },
          ].map(f => (
            <div key={f.id}>
              <label htmlFor={f.id} style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>{f.label}</label>
              <input id={f.id} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          <div>
            <label htmlFor="guide-hours" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Hours/Week</label>
            <input id="guide-hours" type="number" min={1} max={80} value={availabilityHours} onChange={e => setAvailabilityHours(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
          </div>
        </div>
        {smartSyncNotes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {smartSyncNotes.map(n => (
              <span key={n} style={{ fontSize: "0.68rem", padding: "3px 9px", borderRadius: 99, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}>{n}</span>
            ))}
          </div>
        )}
        {profile?.university && <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", marginTop: 8 }}>Education context: {profile.university}</p>}
      </div>

      {/* MRI Score + Radar side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* MRI card */}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: `1px solid ${mri.color}30`, boxShadow: stressResult ? `0 0 32px ${mri.glow}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: mri.color }}>monitoring</span>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Market Stress Test</h3>
            {stressResult && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${mri.color}20`, color: mri.color, border: `1px solid ${mri.color}40` }}>{mri.label}</span>}
          </div>

          {stressResult ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: "3.5rem", fontWeight: 900, color: mri.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{stressResult.score.toFixed(1)}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>MRI Score</div>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 16 }}>
                <div style={{ height: "100%", borderRadius: 99, width: `${Math.max(0, Math.min(100, stressResult.score))}%`, background: `linear-gradient(90deg, ${mri.color}80, ${mri.color})`, transition: "width 0.6s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Vacancies", value: stressResult.vacancy_count?.toLocaleString() ?? "--", icon: "work" },
                  { label: "Trend", value: trendLabel(stressResult.vacancy_trend_label), icon: "trending_up" },
                  { label: "YoY Δ", value: `${(stressResult.vacancy_trend_pct ?? 0) > 0 ? "+" : ""}${(stressResult.vacancy_trend_pct ?? 0).toFixed(1)}%`, icon: "show_chart" },
                  { label: "2027 Stability", value: `${(stressResult.job_stability_score_2027 ?? 0).toFixed(0)}`, icon: "shield" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, color: "var(--muted)" }}>{s.icon}</span>
                      <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{s.label}</span>
                    </div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg)" }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {stressResult.salary_range && (
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 8 }}>
                  Salary: {salaryFormatter.format(stressResult.salary_range.min)} – {salaryFormatter.format(stressResult.salary_range.max)}
                </p>
              )}
              {stressResult.missing_skills?.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Missing Skills</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {stressResult.missing_skills.slice(0, 5).map(s => (
                      <span key={s} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 99, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: "var(--muted-2)", display: "block", marginBottom: 8 }}>monitoring</span>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Run the stress test to see your MRI score.</p>
            </div>
          )}

          {stressError && <p style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: 10 }}>{stressError}</p>}
          <button
            onClick={runStressTest} disabled={!isLoggedIn || stressLoading}
            style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: stressLoading ? "wait" : "pointer", opacity: !isLoggedIn ? 0.5 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>bolt</span>
            {stressLoading ? "Running..." : "Run MRI Stress Test"}
          </button>
        </div>

        {/* Radar chart */}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4" }}>radar</span>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Signal Radar</h3>
          </div>
          <svg viewBox={`0 0 ${radarGeo.size} ${radarGeo.size}`} style={{ width: "100%", maxWidth: 240, margin: "0 auto", display: "block" }}>
            {radarGeo.gridPolygons.map(pts => <polygon key={pts} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)}
            {radarGeo.axisPoints.map(p => <line key={p.metric.label} x1={radarGeo.center} y1={radarGeo.center} x2={p.outer.x} y2={p.outer.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />)}
            <polygon points={radarGeo.polygonPoints} fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth="2" />
            {radarGeo.axisPoints.map(p => <circle key={`${p.metric.label}-dot`} cx={p.valuePoint.x} cy={p.valuePoint.y} r="3" fill="#06b6d4" />)}
            {radarGeo.axisPoints.map(p => (
              <text key={`${p.metric.label}-lbl`} x={p.labelPoint.x} y={p.labelPoint.y} textAnchor="middle" fill="rgba(192,192,224,0.8)" fontSize="9">{p.metric.label}</text>
            ))}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
            {radarMetrics.map(m => (
              <div key={m.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{m.label}</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#06b6d4" }}>{m.value.toFixed(0)}</span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${m.value}%`, background: "rgba(6,182,212,0.7)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GitHub Proof Auditor */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#22c55e" }}>code</span>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>GitHub Proof Auditor</h3>
          </div>
          {repoResult?.source_mode && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: repoResult.source_mode === "snapshot_fallback" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: repoResult.source_mode === "snapshot_fallback" ? "#f59e0b" : "#22c55e", border: `1px solid ${repoResult.source_mode === "snapshot_fallback" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}` }}>
              {repoResult.source_mode === "snapshot_fallback" ? "snapshot" : "live"}
            </span>
          )}
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 14 }}>Validation agent scans your public codebase and marks skills as Verified by Code.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 14 }}>
          <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/owner or /owner/repo" style={inputStyle} />
          <button onClick={runRepoAudit} disabled={!isLoggedIn || repoLoading}
            style={{ padding: "10px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap", opacity: !isLoggedIn ? 0.5 : 1 }}>
            {repoLoading ? "Verifying..." : "Verify"}
          </button>
        </div>
        {repoError && <p style={{ color: "#ef4444", fontSize: "0.78rem", marginBottom: 10 }}>{repoError}</p>}
        {repoResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>Confidence</p>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#22c55e" }}>{repoResult.repo_confidence.toFixed(1)}%</p>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>Code Match</p>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--fg)" }}>{repoResult.match_count}/{repoResult.required_skills_count}</p>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${Math.max(0, Math.min(100, (repoResult.match_count / Math.max(repoResult.required_skills_count, 1)) * 100))}%`, background: "linear-gradient(90deg,#22c55e80,#22c55e)" }} />
            </div>
            <div>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#22c55e", marginBottom: 6 }}>Verified by Code</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {repoResult.verified_by_repo_skills.length > 0 ? repoResult.verified_by_repo_skills.map(s => (
                  <span key={s} style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>{s}</span>
                )) : <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No verified skills found.</span>}
              </div>
            </div>
            {repoResult.skills_required_but_missing.length > 0 && (
              <div>
                <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 6 }}>Skill Gap Closing Targets</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {repoResult.skills_required_but_missing.slice(0, 8).map(s => (
                    <span key={s} style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>- {s}</span>
                  ))}
                </div>
              </div>
            )}
            {repoResult.source_mode === "snapshot_fallback" && (
              <p style={{ fontSize: "0.72rem", color: "#f59e0b" }}>{formatSnapshotFreshness(repoResult.snapshot_timestamp, repoResult.snapshot_age_minutes)}</p>
            )}
          </div>
        )}
      </div>

      {/* 90-Day Mission */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#a78bfa" }}>military_tech</span>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>90-Day Agentic Mission Dashboard</h3>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 14 }}>Not generic advice. A schedule tied to your missing skills, local market demand, and available hours.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            { label: orchestratorLoading ? "Building mission..." : "Generate 90-Day Mission", onClick: () => runOrchestrator(false), disabled: !isLoggedIn || orchestratorLoading, primary: true },
            { label: pivotLoading ? "Pivoting..." : "Market Pivot", onClick: () => runOrchestrator(true), disabled: !isLoggedIn || pivotLoading, primary: false },
            { label: "Export Mission", onClick: exportMissionPlan, disabled: !orchestratorResult, primary: false },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: btn.primary ? "none" : "1px solid var(--border)", background: btn.primary ? "linear-gradient(135deg,#a78bfa,#7c3aed)" : "var(--surface-2)", color: btn.primary ? "#fff" : "var(--fg-2)", fontWeight: 700, fontSize: "0.82rem", cursor: btn.disabled ? "not-allowed" : "pointer", opacity: btn.disabled ? 0.5 : 1, boxShadow: btn.primary ? "0 4px 16px rgba(124,58,237,0.3)" : "none" }}>
              {btn.label}
            </button>
          ))}
        </div>
        {orchestratorError && <p style={{ color: "#ef4444", fontSize: "0.78rem", marginBottom: 8 }}>{orchestratorError}</p>}
        {pivotError && <p style={{ color: "#ef4444", fontSize: "0.78rem", marginBottom: 8 }}>{pivotError}</p>}

        {orchestratorResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Market alert */}
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a78bfa", marginBottom: 4 }}>Market Alert</p>
              <p style={{ fontSize: "0.85rem", color: "var(--fg-2)", lineHeight: 1.6 }}>{orchestratorResult.market_alert}</p>
              {orchestratorResult.pivot_reason && <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>{orchestratorResult.pivot_reason}{orchestratorResult.pivot_target_role ? ` → Focus: ${orchestratorResult.pivot_target_role}` : ""}</p>}
            </div>

            {/* 3 phase cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { title: "Day 0–30", items: day0, color: "#a78bfa" },
                { title: "Day 31–60", items: day31, color: "#06b6d4" },
                { title: "Day 61–90", items: day61, color: "#22c55e" },
              ].map(phase => (
                <div key={phase.title} style={{ background: "var(--surface-2)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: phase.color, marginBottom: 8 }}>{phase.title}</p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {phase.items.map(item => (
                      <li key={item} style={{ fontSize: "0.75rem", color: "var(--fg-2)", lineHeight: 1.4, paddingLeft: 10, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: phase.color }}>›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Kanban */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)" }}>Interactive Mission Kanban</p>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{kanbanDoneCount}/{kanbanTasks.length} complete ({kanbanProgressPct}%)</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", borderRadius: 99, width: `${kanbanProgressPct}%`, background: "linear-gradient(90deg,#7c3aed,#22c55e)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {KANBAN_COLUMNS.map(col => (
                  <div key={col.lane} style={{ background: col.bg, borderRadius: 12, padding: 10, border: `1px solid ${col.color}20` }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: col.color, marginBottom: 8 }}>
                      {col.label} ({kanbanTasks.filter(t => t.lane === col.lane).length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {kanbanTasks.filter(t => t.lane === col.lane).map(task => (
                        <div key={task.id} style={{ background: "var(--surface)", borderRadius: 9, padding: "8px 10px", border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: "0.6rem", color: "var(--muted-2)", marginBottom: 2 }}>{task.phase}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--fg)", lineHeight: 1.3, marginBottom: 6 }}>{task.label}</p>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {task.lane !== "backlog" && <button onClick={() => moveKanbanTask(task.id, "backlog")} style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>Backlog</button>}
                            {task.lane !== "in_progress" && <button onClick={() => moveKanbanTask(task.id, "in_progress")} style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 5, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.06)", color: "#f59e0b", cursor: "pointer" }}>Start</button>}
                            {task.lane !== "done" && <button onClick={() => moveKanbanTask(task.id, "done")} style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 5, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)", color: "#22c55e", cursor: "pointer" }}>Done</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly checkboxes */}
            {weekly.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 700 }}>Weekly Checkboxes</p>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{weeklyCompleted}/{weekly.length} ({weeklyProgressPct}%)</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${weeklyProgressPct}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {weekly.map(item => (
                    <label key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "8px 10px", borderRadius: 9, background: weeklyChecks[item] ? "rgba(34,197,94,0.06)" : "var(--surface-2)", border: `1px solid ${weeklyChecks[item] ? "rgba(34,197,94,0.2)" : "var(--border)"}`, transition: "all 0.15s" }}>
                      <input type="checkbox" checked={Boolean(weeklyChecks[item])} onChange={() => setWeeklyChecks(prev => ({ ...prev, [item]: !prev[item] }))} style={{ marginTop: 2, accentColor: "#22c55e" }} />
                      <span style={{ fontSize: "0.75rem", color: weeklyChecks[item] ? "#22c55e" : "var(--fg-2)", lineHeight: 1.4 }}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logic log terminal */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16, border: "1px solid rgba(34,197,94,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#22c55e" }}>Live Logic Log</p>
          </div>
          <span style={{ fontSize: "0.62rem", color: "var(--muted-2)" }}>Agent stream</span>
        </div>
        <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 10, background: "#020a02", border: "1px solid rgba(34,197,94,0.15)", padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.72rem", lineHeight: 1.7 }}>
          {logicLog.map((line, i) => (
            <p key={`${line}-${i}`} style={{ color: "#4ade80" }}>{line}</p>
          ))}
        </div>
      </div>

      {/* Tip of the day */}
      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a78bfa", marginBottom: 4 }}>Tip of the Day</p>
        <p style={{ fontSize: "0.85rem", color: "var(--fg-2)", lineHeight: 1.6 }}>{strategicTip}</p>
      </div>
    </div>
  );
}
