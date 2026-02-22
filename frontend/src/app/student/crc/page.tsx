"use client";

import { useMemo, useState } from "react";
import { apiSend } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";

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

export default function StudentCrcPage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const [targetRole, setTargetRole] = useState("software engineer");
  const [currentSkills, setCurrentSkills] = useState("");
  const [location, setLocation] = useState("united states");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiCertRoiOut | null>(null);

  const runCalculator = async () => {
    if (!isLoggedIn) {
      setError("Please log in to run CRC.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsedBudget = budget.trim() ? Number(budget) : null;
      const data = await apiSend<AiCertRoiOut>("/user/ai/certification-roi", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          target_role: targetRole.trim() || null,
          current_skills: currentSkills.trim() || null,
          location: location.trim() || null,
          max_budget_usd: parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null,
        }),
      });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err) || "CRC is currently unavailable.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">CRC - Certificate ROI Calculator</h2>
        <p className="mt-2 text-[color:var(--muted)]">
          Compare certificate options by demand, salary signal, cost, effort, and projected return.
        </p>
      </div>

      {!isLoggedIn && (
        <p className="text-sm text-[color:var(--accent-2)]">
          Please log in to use CRC.
        </p>
      )}

      <div className="rounded-xl border border-[color:var(--border)] p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[color:var(--muted)]">
            Target role
            <input
              className="mt-2 w-full rounded-lg border border-[color:var(--border)] p-3"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="Target role"
            />
          </label>
          <label className="text-sm text-[color:var(--muted)]">
            Location
            <input
              className="mt-2 w-full rounded-lg border border-[color:var(--border)] p-3"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Location"
            />
          </label>
          <label className="text-sm text-[color:var(--muted)] md:col-span-2">
            Current skills (comma-separated)
            <textarea
              className="mt-2 w-full rounded-lg border border-[color:var(--border)] p-3"
              rows={4}
              value={currentSkills}
              onChange={(event) => setCurrentSkills(event.target.value)}
              placeholder="python, sql, aws, react"
            />
          </label>
          <label className="text-sm text-[color:var(--muted)]">
            Max budget (USD)
            <input
              className="mt-2 w-full rounded-lg border border-[color:var(--border)] p-3"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="1500"
              type="number"
              min={0}
            />
          </label>
          <div className="flex items-end">
            <button className="cta w-full" onClick={runCalculator} disabled={!isLoggedIn || loading}>
              {loading ? "Running CRC..." : "Run CRC"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[color:var(--accent-2)]">{error}</p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <p className="text-sm text-[color:var(--muted)]">Top recommendation</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {result.winner || "No clear winner yet"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{result.recommendation}</p>
            {result.uncertainty && (
              <p className="mt-2 text-xs text-amber-300">Uncertainty: {result.uncertainty}</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {result.top_options.map((option) => (
              <article key={option.certificate} className="rounded-xl border border-[color:var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">{option.certificate}</h3>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    ROI {option.roi_score}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-[color:var(--muted)]">
                  <p>Cost: {option.cost_usd}</p>
                  <p>Time: {option.time_required}</p>
                  <p>Entry salary: {option.entry_salary_range}</p>
                  <p>Difficulty: {option.difficulty_level}</p>
                  <p>Demand: {option.demand_trend}</p>
                </div>
                <p className="mt-3 text-sm text-[color:var(--muted)]">{option.why_it_helps}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

