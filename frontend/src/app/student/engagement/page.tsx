"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useSession } from "@/lib/session";

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  target_date?: string | null;
  last_check_in_at?: string | null;
  streak_days: number;
};

type Notification = {
  id: string;
  kind: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type EngagementSummary = {
  goals_total: number;
  goals_completed: number;
  active_streak_days: number;
  unread_notifications: number;
  next_deadlines: string[];
};

type WeeklyMilestoneStreak = {
  current_streak_weeks: number;
  longest_streak_weeks: number;
  total_active_weeks: number;
  active_this_week: boolean;
  rewards: string[];
  next_reward_at_weeks?: number | null;
  recent_weeks: { week_label: string; has_activity: boolean }[];
};

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === "completed";
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
      background: isCompleted ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.1)",
      color: isCompleted ? "#22c55e" : "#a78bfa",
      border: `1px solid ${isCompleted ? "rgba(34,197,94,0.25)" : "rgba(124,58,237,0.25)"}`,
    }}>
      {status}
    </span>
  );
}

export default function StudentEngagementPage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [weeklyStreak, setWeeklyStreak] = useState<WeeklyMilestoneStreak | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    if (!isLoggedIn) return;
    apiGet<Goal[]>("/user/goals", headers).then(setGoals).catch(() => setGoals([]));
    apiGet<Notification[]>("/user/notifications", headers).then(setNotifications).catch(() => setNotifications([]));
    apiGet<EngagementSummary>("/user/engagement/summary", headers).then(setSummary).catch(() => setSummary(null));
    apiGet<WeeklyMilestoneStreak>("/user/streak", headers).then(setWeeklyStreak).catch(() => setWeeklyStreak(null));
  }, [headers, isLoggedIn]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addGoal = async () => {
    if (!title.trim()) { setMessage("Goal title is required."); return; }
    try {
      await apiSend("/user/goals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null, target_date: targetDate ? new Date(targetDate).toISOString() : null }),
      });
      setTitle(""); setDescription(""); setTargetDate("");
      setMessage("Goal added.");
      loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not add goal."); }
  };

  const checkInGoal = async (goalId: string) => {
    try {
      await apiSend(`/user/goals/${goalId}/check-in`, { method: "POST", headers });
      loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Check-in failed."); }
  };

  const completeGoal = async (goalId: string) => {
    try {
      await apiSend(`/user/goals/${goalId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Update failed."); }
  };

  const generateReminders = async () => {
    try {
      await apiSend<Notification[]>("/user/notifications/generate", { method: "POST", headers });
      loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Reminder generation failed."); }
  };

  const markRead = async (id: string) => {
    try {
      await apiSend(`/user/notifications/${id}/read`, { method: "POST", headers });
      loadAll();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not mark notification."); }
  };

  const statCards = [
    { label: "Total Goals", value: summary?.goals_total ?? 0, icon: "flag", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
    { label: "Completed", value: summary?.goals_completed ?? 0, icon: "task_alt", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
    { label: "Streak", value: `${summary?.active_streak_days ?? 0}d`, icon: "local_fire_department", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    { label: "Unread Alerts", value: summary?.unread_notifications ?? 0, icon: "notifications", color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#a78bfa" }}>bolt</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Engagement</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Goals & Streaks</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Track weekly goals, check-ins, streaks, and market reminders.</p>
      </div>

      {!isLoggedIn && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.85rem" }}>
          Please log in to use engagement features.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: "var(--surface)", borderRadius: 14, padding: "16px 18px", border: `1px solid ${card.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: card.color }}>{card.icon}</span>
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{card.label}</span>
            </div>
            <p style={{ fontSize: "1.6rem", fontWeight: 800, color: card.color, letterSpacing: "-0.03em" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly Streak */}
      {weeklyStreak && (
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b" }}>local_fire_department</span>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Weekly Milestone Streak</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f59e0b", letterSpacing: "-0.03em" }}>{weeklyStreak.current_streak_weeks}</p>
                <p style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Current</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--fg-2)", letterSpacing: "-0.03em" }}>{weeklyStreak.longest_streak_weeks}</p>
                <p style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Best</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--fg-2)", letterSpacing: "-0.03em" }}>{weeklyStreak.total_active_weeks}</p>
                <p style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</p>
              </div>
            </div>
          </div>

          {weeklyStreak.recent_weeks.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {weeklyStreak.recent_weeks.map(week => (
                <div key={week.week_label} style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 600,
                  background: week.has_activity ? "rgba(245,158,11,0.15)" : "var(--surface-2)",
                  border: `1px solid ${week.has_activity ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
                  color: week.has_activity ? "#f59e0b" : "var(--muted-2)",
                }}>
                  {week.week_label}
                </div>
              ))}
            </div>
          )}

          {weeklyStreak.rewards.length > 0 ? (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p style={{ fontSize: "0.75rem", color: "#22c55e" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>emoji_events</span>
                Rewards: {weeklyStreak.rewards.join(", ")}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 10 }}>
              Next reward at {weeklyStreak.next_reward_at_weeks ?? 2} weeks.
            </p>
          )}
        </div>
      )}

      {/* Add Goal Form */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 14 }}>Create New Goal</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="engagement-goal-title" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Goal Title *
            </label>
            <input id="engagement-goal-title" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Deploy a live project" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="engagement-goal-desc" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Description
            </label>
            <input id="engagement-goal-desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="engagement-goal-date" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Target Date
            </label>
            <input id="engagement-goal-date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={addGoal}
            disabled={!isLoggedIn}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: !isLoggedIn ? "not-allowed" : "pointer", opacity: !isLoggedIn ? 0.5 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Goal
          </button>
          <button
            onClick={generateReminders}
            disabled={!isLoggedIn}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)",
              fontWeight: 600, fontSize: "0.85rem", cursor: !isLoggedIn ? "not-allowed" : "pointer", opacity: !isLoggedIn ? 0.5 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>notifications_active</span>
            Generate Reminders
          </button>
        </div>
        {message && (
          <p style={{ marginTop: 10, fontSize: "0.82rem", color: message.includes("added") || message.includes("check") ? "#22c55e" : "#f59e0b" }}>
            {message}
          </p>
        )}
      </div>

      {/* Goals + Notifications side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Goals list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>
            Your Goals ({goals.length})
          </h3>
          {goals.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", background: "var(--surface)", borderRadius: 14, border: "1px dashed var(--border)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 6 }}>flag</span>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No goals yet. Create one above.</p>
            </div>
          ) : (
            goals.map(goal => (
              <div key={goal.id} style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", flex: 1 }}>{goal.title}</p>
                  <StatusBadge status={goal.status} />
                </div>
                {goal.description && <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 6 }}>{goal.description}</p>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: "#f59e0b" }}>local_fire_department</span>
                    <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 700 }}>{goal.streak_days}d streak</span>
                  </div>
                  {goal.target_date && (
                    <span style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>
                      Due: {new Date(goal.target_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => checkInGoal(goal.id)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)", color: "#a78bfa", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    Check-in
                  </button>
                  {goal.status !== "completed" && (
                    <button
                      onClick={() => completeGoal(goal.id)}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#22c55e", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notifications */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>
            Notifications ({notifications.length})
          </h3>
          {notifications.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", background: "var(--surface)", borderRadius: 14, border: "1px dashed var(--border)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 6 }}>notifications</span>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>No notifications yet.</p>
            </div>
          ) : (
            notifications.map(note => (
              <div key={note.id} style={{
                background: "var(--surface)", borderRadius: 14, padding: "14px 16px",
                border: `1px solid ${!note.is_read ? "rgba(6,182,212,0.25)" : "var(--border)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#06b6d4" }}>{note.kind}</span>
                  {!note.is_read && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06b6d4", flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--fg-2)", lineHeight: 1.5, marginBottom: 6 }}>{note.message}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--muted-2)" }}>{new Date(note.created_at).toLocaleString()}</p>
                {!note.is_read && (
                  <button
                    onClick={() => markRead(note.id)}
                    style={{ marginTop: 8, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)", fontWeight: 600, fontSize: "0.72rem", cursor: "pointer" }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
