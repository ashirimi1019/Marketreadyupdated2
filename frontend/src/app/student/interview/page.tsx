"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { AiInterviewSession } from "@/types/api";

type DraftAnswer = { answer_text: string; video_url: string };

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#22c55e",
  intermediate: "#f59e0b",
  hard: "#ef4444",
};

export default function StudentInterviewPage() {
  const { username, isLoggedIn } = useSession();
  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [sessions, setSessions] = useState<AiInterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<AiInterviewSession | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSessions = useCallback(() => {
    if (!isLoggedIn) return;
    apiGet<AiInterviewSession[]>("/user/ai/interview/sessions", headers).then(setSessions).catch(() => setSessions([]));
  }, [headers, isLoggedIn]);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    if (!isLoggedIn) return;
    try {
      const data = await apiGet<AiInterviewSession>(`/user/ai/interview/sessions/${sessionId}`, headers);
      setActiveSession(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load interview session."); }
  }, [headers, isLoggedIn]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const createSession = async () => {
    if (!isLoggedIn) { setError("Please log in to start interview practice."); return; }
    setLoading(true); setError(null); setMessage(null);
    try {
      const session = await apiSend<AiInterviewSession>("/user/ai/interview/sessions", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ target_role: targetRole.trim() || null, job_description: jobDescription.trim() || null, question_count: questionCount }),
      });
      setActiveSession(session); setMessage("Interview session generated.");
      loadSessions();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create interview session."); }
    finally { setLoading(false); }
  };

  const submitAnswer = async (questionId: string) => {
    if (!isLoggedIn || !activeSession) return;
    const draft = drafts[questionId] ?? { answer_text: "", video_url: "" };
    setError(null); setMessage(null);
    try {
      await apiSend(`/user/ai/interview/sessions/${activeSession.id}/responses`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, answer_text: draft.answer_text.trim() || null, video_url: draft.video_url.trim() || null }),
      });
      setMessage("Response scored.");
      await loadSessionDetail(activeSession.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not score response."); }
  };

  const getResponse = (questionId: string) => activeSession?.responses.find(r => r.question_id === questionId);

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.85rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#a78bfa" }}>psychology</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by AI</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>AI Interview Simulator</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Practice questions generated from your proof-backed milestones.</p>
      </div>

      {/* Setup card */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 22, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#a78bfa" }}>add_circle</span>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>New Session</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="interview-role" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Target Role
            </label>
            <input id="interview-role" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g., Full-Stack Engineer Intern" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="interview-count" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Number of Questions
            </label>
            <input id="interview-count" type="number" min={3} max={10} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value) || 5)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="interview-jobdesc" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
            Job Description (optional)
          </label>
          <textarea
            id="interview-jobdesc"
            rows={4}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste role requirements for more targeted questions."
            style={{ ...inputStyle, height: "auto", resize: "vertical", lineHeight: 1.6 }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={createSession}
            disabled={!isLoggedIn || loading}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", borderRadius: 11,
              border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
              fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "wait" : "pointer",
              boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
            {loading ? "Generating..." : "Start Interview"}
          </button>
          <button
            onClick={loadSessions}
            disabled={!isLoggedIn}
            style={{ padding: "11px 18px", borderRadius: 11, border: "1px solid var(--border)", background: "transparent", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 10 }}>{error}</p>}
        {message && <p style={{ color: "#22c55e", fontSize: "0.82rem", marginTop: 10 }}>{message}</p>}
      </div>

      {/* Sessions list */}
      {sessions.length > 0 && !activeSession && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent Sessions</h3>
          {sessions.map(session => (
            <div
              key={session.id}
              style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 3 }}>
                  {session.target_role || "General Interview"} <span style={{ color: "var(--muted-2)", fontSize: "0.8rem" }}>({session.question_count} questions)</span>
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {session.status} · {new Date(session.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => loadSessionDetail(session.id)}
                style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "#a78bfa", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active session */}
      {activeSession && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 2 }}>
                {activeSession.target_role || "Interview Session"}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {activeSession.summary || "Answer each question — AI will score and coach you."}
              </p>
            </div>
            <button
              onClick={() => setActiveSession(null)}
              style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer" }}
            >
              ← Sessions
            </button>
          </div>

          {activeSession.questions.map(question => {
            const response = getResponse(question.id);
            const draft = drafts[question.id] ?? { answer_text: "", video_url: "" };
            const diffColor = DIFFICULTY_COLOR[question.difficulty || "intermediate"] || "#f59e0b";
            return (
              <div key={question.id} style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted-2)", fontFamily: "var(--font-mono)" }}>Q{question.order_index}</span>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 99, background: `${diffColor}18`, color: diffColor, border: `1px solid ${diffColor}40`, fontWeight: 600 }}>
                    {question.difficulty || "intermediate"}
                  </span>
                  {(question.focus_title || question.focus_milestone_title) && (
                    <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
                      · {question.focus_title || question.focus_milestone_title}
                    </span>
                  )}
                </div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.5, marginBottom: 14 }}>{question.prompt}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label htmlFor={`answer-${question.id}`} style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
                      Your Answer
                    </label>
                    <textarea
                      id={`answer-${question.id}`}
                      rows={4}
                      value={draft.answer_text}
                      onChange={e => setDrafts(prev => ({ ...prev, [question.id]: { ...draft, answer_text: e.target.value } }))}
                      placeholder="Type your response..."
                      style={{ ...inputStyle, height: "auto", resize: "vertical", lineHeight: 1.6 }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`video-${question.id}`} style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
                      Video URL (optional)
                    </label>
                    <input id={`video-${question.id}`} value={draft.video_url} onChange={e => setDrafts(prev => ({ ...prev, [question.id]: { ...draft, video_url: e.target.value } }))} placeholder="https://..." style={inputStyle} />
                  </div>
                  <button
                    onClick={() => submitAnswer(question.id)}
                    disabled={!isLoggedIn}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", alignSelf: "flex-start" }}
                  >
                    Score Answer
                  </button>
                </div>

                {response && (
                  <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(124,58,237,0.06)", borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: "1.5rem", fontWeight: 900, color: response.ai_score && response.ai_score >= 80 ? "#22c55e" : response.ai_score && response.ai_score >= 60 ? "#f59e0b" : "#ef4444" }}>
                        {response.ai_score?.toFixed(1) ?? "--"}
                      </span>
                      <div>
                        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--fg-2)" }}>AI Score / 100</p>
                        {response.confidence != null && (
                          <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Confidence: {(response.confidence * 100).toFixed(0)}%</p>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>{response.ai_feedback || "No feedback yet."}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoggedIn && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to run interview simulations.
        </div>
      )}
    </div>
  );
}
