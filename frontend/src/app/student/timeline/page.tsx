"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { useSession } from "@/lib/session";

type Milestone = {
  milestone_id: string;
  title: string;
  description?: string | null;
  semester_index: number;
};

function toYearTitle(title: string): string {
  return title.replace(/semester\s+(\d+)/i, "Year $1");
}

const YEAR_COLORS = [
  { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
  { color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)" },
  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
];

function getYearStyle(semesterIndex: number) {
  return YEAR_COLORS[(semesterIndex - 1) % YEAR_COLORS.length] ?? YEAR_COLORS[0];
}

export default function StudentTimelinePage() {
  const { username, isLoggedIn } = useSession();
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<Milestone[]>("/user/timeline", headers)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [headers, isLoggedIn]);

  const grouped = milestones.reduce<Record<number, Milestone[]>>((acc, m) => {
    (acc[m.semester_index] ??= []).push(m);
    return acc;
  }, {});
  const years = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#a78bfa" }}>timeline</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Career Path</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Your Timeline</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Milestones align with year-by-year pacing and pathway proofs.</p>
      </div>

      {!isLoggedIn && (
        <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.85rem" }}>
          Please log in to view your timeline.
        </div>
      )}

      {isLoggedIn && milestones.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: "var(--muted)", display: "block", marginBottom: 10 }}>timeline</span>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No milestones yet. Complete your profile and checklist to generate your timeline.</p>
        </div>
      )}

      {/* Timeline */}
      {years.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {years.map((year, yearIdx) => {
            const { color, bg, border } = getYearStyle(year);
            const items = grouped[year];
            return (
              <div key={year} style={{ position: "relative", paddingLeft: 36 }}>
                {/* Vertical connector line */}
                {yearIdx < years.length - 1 && (
                  <div style={{
                    position: "absolute", left: 15, top: 36, bottom: -32, width: 2,
                    background: `linear-gradient(to bottom, ${color}50, transparent)`,
                    zIndex: 0,
                  }} />
                )}

                {/* Year marker */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{
                    position: "absolute", left: 0, width: 32, height: 32, borderRadius: "50%",
                    background: bg, border: `2px solid ${border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1, flexShrink: 0,
                  }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color }}>{year}</span>
                  </div>
                  <div style={{ marginLeft: 36 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color, padding: "3px 10px", borderRadius: 99, background: bg, border: `1px solid ${border}` }}>
                      Year {year}
                    </span>
                  </div>
                </div>

                {/* Milestone cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map((item, itemIdx) => (
                    <div
                      key={item.milestone_id}
                      style={{
                        background: "var(--surface)", borderRadius: 14, padding: "16px 18px",
                        border: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 14,
                        transition: "border-color 0.15s, transform 0.15s",
                        position: "relative",
                      }}
                    >
                      {/* Step number */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: bg, border: `1px solid ${border}`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color }}>{itemIdx + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)", marginBottom: 3 }}>
                          {toYearTitle(item.title)}
                        </p>
                        {item.description && (
                          <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--muted-2)", flexShrink: 0 }}>
                        check_circle
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
