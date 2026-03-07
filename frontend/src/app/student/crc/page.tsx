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

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

function DifficultyBadge({ level }: { level: string }) {
  const lower = level.toLowerCase();
  const color = lower.includes("hard") || lower.includes("advanced") ? "#ef4444"
    : lower.includes("intermediate") || lower.includes("medium") ? "#f59e0b"
    : "#22c55e";
  const bg = lower.includes("hard") || lower.includes("advanced") ? "rgba(239,68,68,0.1)"
    : lower.includes("intermediate") || lower.includes("medium") ? "rgba(245,158,11,0.1)"
    : "rgba(34,197,94,0.1)";
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: bg, color, border: `1px solid ${color}40` }}>
      {level}
    </span>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const isUp = trend.toLowerCase().includes("grow") || trend.toLowerCase().includes("rising") || trend.toLowerCase().includes("high");
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: isUp ? "rgba(6,182,212,0.1)" : "rgba(128,128,168,0.1)", color: isUp ? "#06b6d4" : "var(--muted)", border: `1px solid ${isUp ? "rgba(6,182,212,0.25)" : "rgba(128,128,168,0.2)"}` }}>
      {trend}
    </span>
  );
}

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
    if (!isLoggedIn) { setError("Please log in to run CRC."); return; }
    setLoading(true); setError(null);
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
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#f59e0b" }}>trending_up</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#f59e0b", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI-Powered</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Certificate ROI Calculator</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Compare certificate options by demand, salary signal, cost, effort, and projected return.</p>
      </div>

      {/* Input Form */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label htmlFor="crc-target-role" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Target Role
            </label>
            <input id="crc-target-role" value={targetRole} onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g., Software Engineer" style={inputStyle} disabled={!isLoggedIn} />
          </div>
          <div>
            <label htmlFor="crc-location" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Location
            </label>
            <input id="crc-location" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g., United States" style={inputStyle} disabled={!isLoggedIn} />
          </div>
          <div>
            <label htmlFor="crc-budget" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Max Budget (USD) <span style={{ color: "var(--muted-2)", fontWeight: 400, textTransform: "none" }}>— optional</span>
            </label>
            <input id="crc-budget" type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)}
              placeholder="e.g., 1500" style={inputStyle} disabled={!isLoggedIn} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={runCalculator}
              disabled={!isLoggedIn || loading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 22px", borderRadius: 11, border: "none",
                background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff",
                fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
                opacity: !isLoggedIn ? 0.5 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calculate</span>
              {loading ? "Calculating..." : "Run CRC"}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="crc-skills" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Current Skills <span style={{ color: "var(--muted-2)", fontWeight: 400, textTransform: "none" }}>— comma-separated, optional</span>
          </label>
          <textarea id="crc-skills" rows={3} value={currentSkills} onChange={e => setCurrentSkills(e.target.value)}
            placeholder="python, sql, aws, react..." disabled={!isLoggedIn}
            style={{ ...inputStyle, height: "auto", resize: "vertical", lineHeight: 1.6 }} />
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
            {error}
          </div>
        )}
        {!isLoggedIn && (
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 10 }}>Please log in to use the Certificate ROI Calculator.</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Winner card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))",
            borderRadius: 16, padding: 24, border: "1px solid rgba(124,58,237,0.25)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(245,158,11,0.06)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#f59e0b" }}>emoji_events</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>Top Recommendation</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 8 }}>
                  {result.winner || "No clear winner yet"}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--fg-2)", lineHeight: 1.6 }}>{result.recommendation}</p>
                {result.uncertainty && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#f59e0b" }}>info</span>
                    <p style={{ fontSize: "0.75rem", color: "#f59e0b" }}>{result.uncertainty}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Options grid */}
          <div>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 12 }}>All Options Ranked</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {result.top_options.map((option, idx) => (
                <div
                  key={option.certificate}
                  style={{
                    background: "var(--surface)", borderRadius: 16, padding: 20, border: `1px solid ${idx === 0 && result.winner === option.certificate ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
                    display: "flex", flexDirection: "column", gap: 14,
                    boxShadow: idx === 0 && result.winner === option.certificate ? "0 0 0 1px rgba(245,158,11,0.15)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3, color: "var(--fg)" }}>{option.certificate}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#22c55e", letterSpacing: "-0.03em" }}>{option.roi_score}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>ROI Score</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Cost", value: option.cost_usd, icon: "payments" },
                      { label: "Time", value: option.time_required, icon: "schedule" },
                      { label: "Entry Salary", value: option.entry_salary_range, icon: "trending_up" },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, color: "var(--muted)" }}>{icon}</span>
                          <span style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{label}</span>
                        </div>
                        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--fg-2)" }}>{value}</p>
                      </div>
                    ))}
                    <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>Difficulty</div>
                      <DifficultyBadge level={option.difficulty_level} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Demand Trend</div>
                    <TrendBadge trend={option.demand_trend} />
                  </div>

                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    {option.why_it_helps}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
