"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { getErrorMessage, getRetryAfterSeconds, isRateLimited } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { formatDisplayName } from "@/lib/name";

type AiGuide = {
  decision?: string | null;
  recommendations?: string[];
  next_actions?: string[];
  recommended_certificates?: string[];
  uncertainty?: string | null;
};

type AiCertRoiOption = {
  certificate: string;
  cost_usd: string;
  time_required: string;
  entry_salary_range: string;
  difficulty_level: string;
  demand_trend: string;
  roi_score: number;
  why_it_helps: string;
};

type AiCertRoiOut = {
  target_role?: string | null;
  top_options: AiCertRoiOption[];
  winner?: string | null;
  recommendation: string;
  uncertainty?: string | null;
};

type Proof = { status: string };
type ChecklistItem = { id: string };
type Readiness = { score: number };
type ReadinessRank = { percentile: number; rank: number; total_students: number };
type WeeklyMilestoneStreak = { current_streak_weeks: number };

const TICKER_ITEMS = [
  "Live Adzuna vacancy signals",
  "CareerOneStop federal skill standards",
  "GitHub repo proof verification",
  "MRI formula: 40% skill + 30% demand + 30% proof",
  "Real-time salary benchmarks",
  "2027 AI shift simulation",
  "90-day agentic mission planning",
];

const PLATFORM_OVERVIEW = [
  {
    title: "What we provide",
    points: [
      "A 0-100 Market Readiness Index with a clear component breakdown and gap priorities.",
      "Skill Gap Auditor and Certification ROI guidance mapped to your target role.",
      "Proof portfolio tracking, GitHub-backed evidence checks, and AI-shift stress simulation.",
    ],
  },
  {
    title: "How we provide it",
    points: [
      "We map your selected role to required skill standards using CareerOneStop.",
      "We pull live market demand and salary momentum from Adzuna.",
      "We compare required skills against your verified proofs and repo signals, then recalculate your score.",
      "Every run returns freshness metadata, provider status, and source citations.",
    ],
  },
  {
    title: "APIs and systems used",
    points: [
      "Adzuna Jobs API for vacancy trend, salary benchmarks, and hiring company signals.",
      "CareerOneStop Skills Matcher for role-to-skill requirements (with O*NET role mapping).",
      "GitHub API for repository, language, and code-signal verification workflows.",
      "Configurable AI provider (OpenAI or Groq) for guidance and proof-assist flows.",
    ],
  },
] as const;

const CALCULATION_DETAILS = [
  {
    title: "Core MRI Formula",
    description: "MRI = (Federal Standards x 0.40) + (Market Demand x 0.30) + (Evidence Density x 0.30)",
  },
  {
    title: "Federal Standards",
    description: "70% non-negotiables + 30% strong signals, weighted by proficiency (Professional 1.0, Intermediate 0.75, Beginner 0.50).",
  },
  {
    title: "Evidence Density",
    description: "35% proof-type diversity + 35% proficiency quality + 15% certificate bonus + 15% GitHub profile signal.",
  },
  {
    title: "Market Stress Formula",
    description: "Stress score uses 40% skill overlap + 30% market trend + 30% evidence verification with 2027 scenario simulation.",
  },
] as const;

const DATA_TRUST_POINTS = [
  "Provider traceability: responses include source mode (live or snapshot fallback), provider status, and query details used.",
  "Freshness controls: market snapshots use strict TTL windows so stale data is not silently treated as fresh.",
  "Citation-backed scoring: each score run includes source-signal-value citations for skill overlap, market trend, and proof density.",
  "Proof integrity: evidence is tied to submitted artifacts, verification status, and metadata instead of hidden manual overrides.",
] as const;

const BENEFIT_PROMISES = [
  {
    title: "Increase your job readiness score",
    detail:
      "Prioritize what to improve first and track measurable readiness gains as your proofs and skills grow.",
    href: "/student/readiness",
    cta: "View Readiness",
    testId: "benefit-readiness",
  },
  {
    title: "Get personalized certification recommendations",
    detail:
      "Use role-aware ROI guidance to choose certificates based on demand, salary impact, budget, and effort.",
    href: "/student/guide",
    cta: "See Cert Recommendations",
    testId: "benefit-certifications",
  },
  {
    title: "Build a 90-day career plan",
    detail:
      "Turn goals into weekly execution with a guided plan tied to real market signals and your target pathway.",
    href: "/student/guide",
    cta: "Open 90-Day Plan",
    testId: "benefit-90-day-plan",
  },
  {
    title: "Get ATS resume help",
    detail:
      "Use our ATS-focused resume support to improve keyword alignment, structure, and recruiter readability.",
    href: "/student/resume-architect",
    cta: "Optimize ATS Resume",
    testId: "benefit-ats-resume",
  },
] as const;

const QUICK_LINKS = [
  {
    title: "Market Mission",
    text: "Run MRI stress test, verify GitHub repos, launch 90-day plan.",
    href: "/student/guide",
    color: "rgba(61,109,255,0.15)",
    border: "rgba(61,109,255,0.3)",
    tag: "Core Flow",
  },
  {
    title: "Proof Vault",
    text: "Track submitted, verified, and rejected proof artifacts.",
    href: "/student/proofs",
    color: "rgba(0,200,150,0.1)",
    border: "rgba(0,200,150,0.25)",
    tag: "Evidence",
  },
  {
    title: "My Readiness Score",
    text: "View your score out of 100 with top gaps and next actions.",
    href: "/student/readiness",
    color: "rgba(255,123,26,0.1)",
    border: "rgba(255,123,26,0.25)",
    tag: "Score",
  },
  {
    title: "Submit Proof",
    text: "Upload evidence for completed checklist requirements.",
    href: "/student/checklist",
    color: "rgba(249,74,210,0.1)",
    border: "rgba(249,74,210,0.22)",
    tag: "Tasks",
  },
  {
    title: "Interview Simulator",
    text: "Practice AI interview questions tied to your submitted proofs.",
    href: "/student/interview",
    color: "rgba(61,109,255,0.1)",
    border: "rgba(61,109,255,0.2)",
    tag: "Prep",
  },
  {
    title: "Skill Gap Builder",
    text: "Translate missing skills into build targets and recruiter-facing proof.",
    href: "/student/resume-architect",
    color: "rgba(255,179,0,0.1)",
    border: "rgba(255,179,0,0.22)",
    tag: "Growth",
  },
  {
    title: "My Plan",
    text: "Confirm your major, pathway, and year-by-year roadmap.",
    href: "/student/onboarding",
    color: "rgba(0,200,150,0.08)",
    border: "rgba(0,200,150,0.18)",
    tag: "Pathway",
  },
  {
    title: "Timeline",
    text: "Stay aligned to year-based milestone targets.",
    href: "/student/timeline",
    color: "rgba(61,109,255,0.08)",
    border: "rgba(61,109,255,0.15)",
    tag: "Milestones",
  },
];

function buildApiError(error: unknown, fallback: string): string {
  if (isRateLimited(error)) {
    const retry = getRetryAfterSeconds(error);
    return retry
      ? `Rate limit reached. Try again in ${retry}s.`
      : "Rate limit reached. Please wait.";
  }
  return getErrorMessage(error) || fallback;
}

export default function Home() {
  const { username, isLoggedIn } = useSession();
  const displayName = formatDisplayName(username);
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const [auditInput, setAuditInput] = useState("");
  const [guide, setGuide] = useState<AiGuide | null>(null);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);

  const [roiTargetRole, setRoiTargetRole] = useState("");
  const [roiCurrentSkills, setRoiCurrentSkills] = useState("");
  const [roiLocation, setRoiLocation] = useState("");
  const [roiBudget, setRoiBudget] = useState("");
  const [roiResult, setRoiResult] = useState<AiCertRoiOut | null>(null);
  const [roiError, setRoiError] = useState<string | null>(null);
  const [roiLoading, setRoiLoading] = useState(false);

  const [proofStats, setProofStats] = useState({ submitted: 0, verified: 0, rejected: 0 });
  const [checklistCount, setChecklistCount] = useState<number | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [readinessRank, setReadinessRank] = useState<ReadinessRank | null>(null);
  const [weeklyStreak, setWeeklyStreak] = useState<WeeklyMilestoneStreak | null>(null);

  /* countdown animation for 2027 simulation */
  const [score, setScore] = useState(82);
  useEffect(() => {
    const delay = setTimeout(() => {
      let current = 82;
      const interval = setInterval(() => {
        current -= 1;
        setScore(current);
        if (current <= 63) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }, 1200);
    return () => clearTimeout(delay);
  }, []);

  const requireLogin = (setter: (msg: string | null) => void) => {
    if (isLoggedIn) return false;
    setter("Please log in to use this feature.");
    return true;
  };

  const runAudit = async () => {
    if (requireLogin(setGuideError)) return;
    setGuideLoading(true);
    setGuideError(null);
    try {
      const text = auditInput.trim();
      const data = await apiSend<AiGuide>("/user/ai/guide", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ question: text || null, context_text: text || null }),
      });
      setGuide(data);
    } catch (error) {
      setGuideError(buildApiError(error, "AI audit unavailable."));
    } finally {
      setGuideLoading(false);
    }
  };

  const runCertificationRoi = async () => {
    if (requireLogin(setRoiError)) return;
    setRoiLoading(true);
    setRoiError(null);
    try {
      const parsedBudget = roiBudget.trim() ? Number(roiBudget) : null;
      const data = await apiSend<AiCertRoiOut>("/user/ai/certification-roi", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          target_role: roiTargetRole.trim() || null,
          current_skills: roiCurrentSkills.trim() || null,
          location: roiLocation.trim() || null,
          max_budget_usd: parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null,
        }),
      });
      setRoiResult(data);
    } catch (error) {
      setRoiError(buildApiError(error, "Certification ROI unavailable."));
    } finally {
      setRoiLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setGuide(null);
      setGuideError(null);
      setRoiResult(null);
      setRoiError(null);
      setProofStats({ submitted: 0, verified: 0, rejected: 0 });
      setChecklistCount(null);
      setReadinessScore(null);
      setReadinessRank(null);
      setWeeklyStreak(null);
      return;
    }

    let cancelled = false;
    const loadDashboard = async () => {
      const [proofsRes, checklistRes, readinessRes, rankRes, streakRes] = await Promise.allSettled([
        apiGet<Proof[]>("/user/proofs", headers),
        apiGet<ChecklistItem[]>("/user/checklist", headers),
        apiGet<Readiness>("/user/readiness", headers),
        apiGet<ReadinessRank>("/user/readiness/rank", headers),
        apiGet<WeeklyMilestoneStreak>("/user/streak", headers),
      ]);
      if (cancelled) return;

      if (proofsRes.status === "fulfilled") {
        const stats = { submitted: 0, verified: 0, rejected: 0 };
        proofsRes.value.forEach((p) => {
          if (p.status === "verified") stats.verified++;
          else if (p.status === "rejected") stats.rejected++;
          else stats.submitted++;
        });
        setProofStats(stats);
      }
      setChecklistCount(checklistRes.status === "fulfilled" ? checklistRes.value.length : null);
      setReadinessScore(readinessRes.status === "fulfilled" ? readinessRes.value.score : null);
      setReadinessRank(rankRes.status === "fulfilled" ? rankRes.value : null);
      setWeeklyStreak(streakRes.status === "fulfilled" ? streakRes.value : null);
    };
    loadDashboard().catch(() => {});
    return () => { cancelled = true; };
  }, [headers, isLoggedIn]);

  const versionedSkills = isLoggedIn ? (checklistCount ?? 0) : 14;
  const verifiedAssets = isLoggedIn ? proofStats.verified : 32;
  const marketRankLabel = isLoggedIn
    ? readinessRank
      ? `Top ${Math.max(1, Math.round(100 - readinessRank.percentile + 1))}%`
      : readinessScore !== null
        ? readinessScore >= 80 ? "Top 15%" : "Climbing"
        : "--"
    : "Top 4%";

  const scoreRisk = score <= 65 ? "HIGH" : score <= 72 ? "MODERATE" : "LOW";
  const scoreDelta = 82 - score;

  return (
    <main className="landing-stack" data-testid="home-page">
      {/* Live ticker */}
      <section className="market-ticker" aria-label="Live market signals" data-testid="market-ticker">
        <div className="market-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={`${item}-${i}`} className="market-ticker-item">{item}</span>
          ))}
        </div>
      </section>

      {/* Hero */}
      <section className="panel hero-stage" data-testid="hero-section">
        <div className="hero-signal-pill" data-testid="hero-live-signal">
          Live Market Signals Active
        </div>

        <h1 className="hero-headline">
          <span className="hero-headline-gradient">Are You Actually</span>{" "}
          <span className="hero-emphasis">Hireable</span>
          <span className="hero-headline-gradient"> — or Just Hopeful?</span>
        </h1>

        <p className="hero-copy" data-testid="hero-copy">
          We combine live GitHub engineering signals with real hiring demand data,
          then stress-test your career readiness against the next AI market shift.
        </p>

        {isLoggedIn && (
          <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
            Welcome back, {displayName}.
            {weeklyStreak && weeklyStreak.current_streak_weeks > 0 && (
              <> Streak: {weeklyStreak.current_streak_weeks} week{weeklyStreak.current_streak_weeks !== 1 ? "s" : ""}</>
            )}
          </p>
        )}

        <div className="hero-actions">
          <Link
            href={isLoggedIn ? "/student/guide" : "/login"}
            className="cta"
            data-testid="hero-stress-test-btn"
          >
            Stress-Test My Career
          </Link>
          <a
            href="#future-shock"
            className="cta cta-secondary"
            data-testid="hero-how-it-works-btn"
          >
            See How It Works
          </a>
        </div>
      </section>

      <section className="panel" id="methodology" data-testid="methodology-section">
        <span className="badge">Methodology</span>
        <h2 className="section-title mt-3">
          What We Provide, How We Calculate It, and Why the Data Is Legitimate
        </h2>
        <p className="section-subtitle mt-3">
          Market Ready combines federal skill standards, real vacancy signals, proof verification, and transparent formulas
          so students can make decisions based on traceable evidence rather than guesswork.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {PLATFORM_OVERVIEW.map((column) => (
            <article
              key={column.title}
              className="rounded-2xl border p-5"
              style={{ borderColor: "var(--border)", background: "rgba(61,109,255,0.06)" }}
            >
              <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{column.title}</h3>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--muted)" }}>
                {column.points.map((point) => (
                  <li key={point} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="divider" />

        <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          Calculation Logic
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {CALCULATION_DETAILS.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--border)", background: "rgba(8,12,30,0.55)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div
          className="mt-6 rounded-2xl border p-5"
          style={{ borderColor: "var(--border-hi)", background: "rgba(0,200,150,0.08)" }}
        >
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Data Integrity and Trust Signals
          </h3>
          <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            {DATA_TRUST_POINTS.map((point) => (
              <li key={point} className="leading-relaxed">{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel" id="benefits" data-testid="benefits-section">
        <span className="badge">Services</span>
        <h2 className="section-title mt-3">
          Some of the Services We Offer
        </h2>
        <p className="section-subtitle mt-3">
          These services are designed to move you from confusion to clear, job-ready execution.
        </p>

        <div className="action-grid mt-6">
          {BENEFIT_PROMISES.map((benefit) => {
            const isStudentRoute = benefit.href.startsWith("/student/");
            const benefitHref = !isLoggedIn && isStudentRoute ? "/register" : benefit.href;
            const benefitCta = !isLoggedIn && isStudentRoute ? "Start Your Plan" : benefit.cta;
            return (
              <article
                key={benefit.title}
                className="action-card"
                data-testid={benefit.testId}
                style={{ background: "rgba(61,109,255,0.08)", borderColor: "var(--border-hi)" }}
              >
                <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {benefit.detail}
                </p>
                <div className="mt-4">
                  <Link href={benefitHref} className="cta cta-secondary">
                    {benefitCta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2027 Simulation */}
      <section
        id="future-shock"
        className="panel"
        style={{ padding: "40px" }}
        data-testid="simulation-section"
      >
        <div className="max-w-xl mx-auto text-center">
          <span className="badge mb-4 inline-flex">2027 AI Shift Simulation</span>
          <h2 className="section-title mt-3">What Happens to Your Score?</h2>
          <p className="section-subtitle mt-3 mx-auto">
            When AI demand surges 40% and generic frontend roles drop 25%, your readiness index shifts in real time.
          </p>

          <div className="mt-8 rounded-2xl border p-8" style={{ borderColor: "var(--border-hi)", background: "rgba(8,12,30,0.8)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)" }}>Before</span>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)" }}>After 2027 Shift</span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="text-center">
                <div className="text-5xl font-extrabold" style={{ color: "var(--success)" }}>82</div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Current</div>
              </div>
              <div className="flex-1 h-px my-6" style={{ background: "var(--border)" }} />
              <div className="text-center" data-testid="simulation-score">
                <div
                  className="text-7xl font-extrabold tabular-nums"
                  style={{ color: score <= 65 ? "var(--danger)" : "var(--warning)" }}
                >
                  {score}
                </div>
                <div className="text-sm font-semibold mt-2" style={{ color: score <= 65 ? "var(--danger)" : "var(--warning)" }}>
                  -{scoreDelta} &bull; {scoreRisk} RISK
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl p-3 text-left" style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
                <div className="text-xs font-mono uppercase mb-1" style={{ color: "var(--danger)" }}>Threat</div>
                <div style={{ color: "var(--muted)" }}>Generic frontend demand &darr; 25%</div>
              </div>
              <div className="rounded-xl p-3 text-left" style={{ background: "rgba(61,109,255,0.08)", border: "1px solid rgba(61,109,255,0.2)" }}>
                <div className="text-xs font-mono uppercase mb-1" style={{ color: "var(--primary)" }}>Opportunity</div>
                <div style={{ color: "var(--muted)" }}>AI skill demand &uarr; 40%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoggedIn && (
        <>
      {/* AI Skill Gap Auditor */}
      <section className="panel auditor-stage" id="audit-engine" data-testid="auditor-section">
        <div className="auditor-header">
          <div className="auditor-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--primary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="section-title">Skill Gap Closing Auditor</h2>
            <p className="section-subtitle mt-1">
              Convert evidence context into concrete skill-gap actions tied to live demand.
            </p>
          </div>
        </div>

        <label className="auditor-label" htmlFor="audit-input">Paste Evidence Context</label>
        <textarea
          id="audit-input"
          className="auditor-input"
          value={auditInput}
          onChange={(e) => setAuditInput(e.target.value)}
          placeholder="Ex: Built a REST API with FastAPI, deployed to AWS, wrote unit tests with pytest..."
          data-testid="audit-input"
        />

        <div className="auditor-actions">
          {isLoggedIn ? (
            <button
              className="cta auditor-cta"
              onClick={runAudit}
              disabled={guideLoading}
              data-testid="audit-submit-btn"
            >
              {guideLoading ? "Analyzing..." : "Generate Skill Gap Actions"}
            </button>
          ) : (
            <Link className="cta auditor-cta" href="/login" data-testid="audit-login-btn">
              Login to Run Audit
            </Link>
          )}
        </div>

        {guideError && (
          <p className="auditor-feedback auditor-feedback-error" data-testid="audit-error">{guideError}</p>
        )}

        {guide && !guideLoading && (
          <div className="auditor-results" data-testid="audit-results">
            <div className="auditor-result-card">
              <p className="auditor-result-label">Decision</p>
              <p className="auditor-result-value">{guide.decision || "No decision returned."}</p>
            </div>
            <div className="auditor-result-card">
              <p className="auditor-result-label">Next Actions</p>
              <ul className="auditor-result-list">
                {(guide.next_actions?.length ? guide.next_actions : guide.recommendations?.length ? guide.recommendations : ["No actions returned."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="auditor-result-card">
              <p className="auditor-result-label">Recommended Certificates</p>
              <ul className="auditor-result-list">
                {(guide.recommended_certificates?.length ? guide.recommended_certificates : ["No certificate recommendations."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {guide?.uncertainty && <p className="auditor-feedback">{guide.uncertainty}</p>}
      </section>

      {/* Certification ROI */}
      <section className="panel" id="cert-roi" data-testid="cert-roi-section">
        <div className="auditor-header">
          <div className="auditor-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--accent)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="section-title">Certification ROI Calculator</h2>
            <p className="section-subtitle mt-1">
              Compare cert cost, time, salary impact, difficulty and demand trend — AI-powered.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
            Target Role
            <input
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)" }}
              value={roiTargetRole}
              onChange={(e) => setRoiTargetRole(e.target.value)}
              placeholder="e.g. Software Engineer"
              data-testid="roi-role-input"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
            Location
            <input
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)" }}
              value={roiLocation}
              onChange={(e) => setRoiLocation(e.target.value)}
              placeholder="e.g. United States"
              data-testid="roi-location-input"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2" style={{ color: "var(--muted)" }}>
            Current Skills
            <textarea
              className="rounded-xl border p-3 text-sm min-h-20 resize-none"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)" }}
              value={roiCurrentSkills}
              onChange={(e) => setRoiCurrentSkills(e.target.value)}
              placeholder="HTML, CSS, JavaScript, React basics..."
              data-testid="roi-skills-input"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
            Max Budget (USD, optional)
            <input
              type="number"
              min={0}
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)" }}
              value={roiBudget}
              onChange={(e) => setRoiBudget(e.target.value)}
              placeholder="300"
              data-testid="roi-budget-input"
            />
          </label>
        </div>

        <div className="mt-5">
          {isLoggedIn ? (
            <button
              className="cta cta-accent"
              onClick={runCertificationRoi}
              disabled={roiLoading}
              data-testid="roi-submit-btn"
            >
              {roiLoading ? "Calculating..." : "Calculate Certification ROI"}
            </button>
          ) : (
            <Link className="cta cta-accent" href="/login" data-testid="roi-login-btn">
              Login to Calculate ROI
            </Link>
          )}
        </div>

        {roiError && (
          <p className="auditor-feedback auditor-feedback-error" data-testid="roi-error">{roiError}</p>
        )}

        {roiResult && (
          <div className="mt-5 grid gap-4" data-testid="roi-results">
            <div className="auditor-result-card">
              <p className="auditor-result-label">Recommendation</p>
              <p className="mt-2" style={{ fontSize: "15px" }}>{roiResult.recommendation}</p>
              {roiResult.winner && (
                <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Best ROI: <strong>{roiResult.winner}</strong></p>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {roiResult.top_options.map((item) => (
                <div className="auditor-result-card" key={item.certificate}>
                  <p className="auditor-result-label">{item.certificate}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xl font-bold tabular-nums" style={{ color: item.roi_score >= 70 ? "var(--success)" : item.roi_score >= 50 ? "var(--warning)" : "var(--muted)" }}>
                      {item.roi_score}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>/ 100</span>
                  </div>
                  <ul className="auditor-result-list mt-2">
                    <li>Cost: {item.cost_usd}</li>
                    <li>Time: {item.time_required}</li>
                    <li>Salary: {item.entry_salary_range}</li>
                    <li>Difficulty: {item.difficulty_level}</li>
                    <li>Demand: {item.demand_trend}</li>
                  </ul>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{item.why_it_helps}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Proof Vault Stats */}
      <section className="panel vault-stage" id="signals" data-testid="vault-section">
        <div className="vault-head">
          <h2 className="section-title">The Proof Vault</h2>
          <p className="section-subtitle">Where skills become evidence and readiness becomes measurable.</p>
        </div>

        <div className="vault-grid mt-6">
          <article className="vault-card vault-card-blue" data-testid="vault-skills-count">
            <p className="vault-label">Versioned Skills</p>
            <p className="vault-value">{versionedSkills}</p>
          </article>
          <article className="vault-card vault-card-green" data-testid="vault-verified-count">
            <p className="vault-label">Verified Assets</p>
            <p className="vault-value">{verifiedAssets}</p>
          </article>
          <article className="vault-card vault-card-purple" data-testid="vault-market-rank">
            <p className="vault-label">Market Rank</p>
            <p className="vault-value">{marketRankLabel}</p>
          </article>
        </div>

        {isLoggedIn && readinessRank && (
          <p className="mt-4 text-sm text-center" style={{ color: "var(--muted)" }}>
            Global rank: #{readinessRank.rank} of {readinessRank.total_students}
          </p>
        )}
      </section>
        </>
      )}

      {/* Quick Links Bento Grid (authenticated) */}
      {isLoggedIn && (
        <section data-testid="quick-links-section">
          <div className="mb-5 flex items-center gap-3">
            <span className="badge">Dashboard</span>
            <h2 className="text-lg font-semibold">Your Workspace</h2>
          </div>
          <div className="action-grid">
            {QUICK_LINKS.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="action-card group"
                style={{
                  background: card.color,
                  borderColor: card.border,
                }}
                data-testid={`quick-link-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-md"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
                  >
                    {card.tag}
                  </span>
                  <svg
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    width="16" height="16" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2"
                    style={{ color: "var(--primary)" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <h3 className="font-semibold text-base" style={{ color: "var(--foreground)" }}>
                  {card.title}
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{card.text}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
