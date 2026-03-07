"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useSession } from "@/lib/session";

type Major = {
  id: string;
  name: string;
  description?: string | null;
};

type Pathway = {
  id: string;
  name: string;
  description?: string | null;
  is_compatible: boolean;
  notes?: string | null;
};

type UserPathway = {
  major_id: string;
  pathway_id: string;
  cohort?: string | null;
};

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

export default function StudentOnboardingPage() {
  const { username, isLoggedIn } = useSession();
  const [majors, setMajors] = useState<Major[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [selectedPathway, setSelectedPathway] = useState<string>("");
  const [cohort, setCohort] = useState("Fall 2026");
  const [message, setMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Major[]>("/majors")
      .then(setMajors)
      .catch(() => setMajors([]));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const selectionKey = `mp_selection_${username}`;
    const stored = window.localStorage.getItem(selectionKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.major_id && parsed?.pathway_id) {
          setSelectedMajor(parsed.major_id);
          setSelectedPathway(parsed.pathway_id);
          if (parsed.cohort) setCohort(parsed.cohort);
          setLocked(true);
        }
      } catch { /* ignore */ }
    }

    apiGet<UserPathway>(`/user/pathway`, { "X-User-Id": username })
      .then((data) => {
        if (data?.major_id && data?.pathway_id) {
          setSelectedMajor(data.major_id);
          setSelectedPathway(data.pathway_id);
          if (data.cohort) setCohort(data.cohort);
          setLocked(true);
          window.localStorage.setItem(selectionKey, JSON.stringify({
            major_id: data.major_id, pathway_id: data.pathway_id, cohort: data.cohort,
          }));
        }
      })
      .catch(async () => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.major_id && parsed?.pathway_id) {
              await apiSend("/user/pathway/select", {
                method: "POST",
                headers: { "X-User-Id": username, "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
              });
              setLocked(true);
              setMessage("Selection restored and locked.");
              return;
            }
          } catch { /* ignore */ }
        }
        setLocked(false);
      });
  }, [isLoggedIn, username]);

  useEffect(() => {
    if (!selectedMajor) { setPathways([]); return; }
    apiGet<Pathway[]>(`/majors/${selectedMajor}/pathways`)
      .then(setPathways)
      .catch(() => setPathways([]));
  }, [selectedMajor]);

  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const submitSelection = async () => {
    if (!selectedMajor || !selectedPathway) { setMessage("Select a major and pathway first."); return; }
    if (locked) { setMessage("Selection is locked."); return; }
    setMessage(null); setSaving(true);
    try {
      await apiSend("/user/pathway/select", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ major_id: selectedMajor, pathway_id: selectedPathway, cohort }),
      });
      const saved = await apiGet<UserPathway>("/user/pathway", headers);
      if (saved?.major_id && saved?.pathway_id) {
        setSelectedMajor(saved.major_id);
        setSelectedPathway(saved.pathway_id);
        setLocked(true);
        setMessage("Selection saved and locked.");
        window.localStorage.setItem(`mp_selection_${username}`, JSON.stringify({
          major_id: saved.major_id, pathway_id: saved.pathway_id, cohort: saved.cohort,
        }));
      } else {
        setMessage("Saved, but could not verify selection.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save selection.");
    } finally { setSaving(false); }
  };

  const selectedMajorObj = majors.find(m => m.id === selectedMajor);
  const selectedPathwayObj = pathways.find(p => p.id === selectedPathway);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#a78bfa" }}>school</span>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Setup</span>
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Choose Your Path</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Select your major and specialization pathway to unlock your personalized checklist and MRI.</p>
      </div>

      {/* Status banner */}
      {locked ? (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#22c55e" }}>lock</span>
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#22c55e" }}>Selection locked</p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Contact your admin to change your major or pathway.</p>
          </div>
        </div>
      ) : isLoggedIn ? (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#06b6d4" }}>info</span>
          <p style={{ fontSize: "0.82rem", color: "var(--fg-2)" }}>
            Logged in as <strong>{username}</strong>. Selections will be permanently saved to your account.
          </p>
        </div>
      ) : (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.85rem" }}>
          You must log in to save a pathway selection.
        </div>
      )}

      {/* Cohort input */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <label htmlFor="onboarding-cohort" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 8 }}>
          Cohort
        </label>
        <input
          id="onboarding-cohort"
          value={cohort}
          onChange={e => setCohort(e.target.value)}
          disabled={!isLoggedIn || locked}
          style={{ ...inputStyle, opacity: (!isLoggedIn || locked) ? 0.5 : 1 }}
          placeholder="e.g., Fall 2026"
        />
      </div>

      {/* Major + Pathway selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Major column */}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#a78bfa" }}>menu_book</span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Major</h3>
          </div>

          <div>
            <label htmlFor="onboarding-major-select" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Choose Major
            </label>
            <select
              id="onboarding-major-select"
              value={selectedMajor}
              onChange={e => setSelectedMajor(e.target.value)}
              disabled={!isLoggedIn || locked}
              style={{ ...inputStyle, opacity: (!isLoggedIn || locked) ? 0.5 : 1, cursor: locked ? "not-allowed" : "pointer" }}
            >
              <option value="">Select a major</option>
              {majors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {selectedMajorObj?.description && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{selectedMajorObj.description}</p>
            </div>
          )}

          {/* Major grid cards */}
          {majors.length > 0 && !locked && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {majors.slice(0, 5).map(m => (
                <button
                  key={m.id}
                  onClick={() => { if (!locked && isLoggedIn) setSelectedMajor(m.id); }}
                  disabled={!isLoggedIn || locked}
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${selectedMajor === m.id ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
                    background: selectedMajor === m.id ? "rgba(124,58,237,0.1)" : "var(--surface-2)",
                    cursor: locked ? "not-allowed" : "pointer", transition: "all 0.15s",
                    opacity: (!isLoggedIn || locked) ? 0.5 : 1,
                  }}
                >
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: selectedMajor === m.id ? "#a78bfa" : "var(--fg)" }}>{m.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pathway column */}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#06b6d4" }}>fork_right</span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Pathway</h3>
          </div>

          <div>
            <label htmlFor="onboarding-pathway-select" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Choose Pathway
            </label>
            <select
              id="onboarding-pathway-select"
              value={selectedPathway}
              onChange={e => setSelectedPathway(e.target.value)}
              disabled={!isLoggedIn || locked || !selectedMajor}
              style={{ ...inputStyle, opacity: (!isLoggedIn || locked || !selectedMajor) ? 0.5 : 1, cursor: (locked || !selectedMajor) ? "not-allowed" : "pointer" }}
            >
              <option value="">Select a pathway</option>
              {pathways.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedPathwayObj?.description && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{selectedPathwayObj.description}</p>
              {selectedPathwayObj.notes && (
                <p style={{ fontSize: "0.72rem", color: "#f59e0b", marginTop: 6 }}>{selectedPathwayObj.notes}</p>
              )}
              {!selectedPathwayObj.is_compatible && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ef4444" }}>warning</span>
                  <p style={{ fontSize: "0.72rem", color: "#ef4444" }}>Not compatible with your current major</p>
                </div>
              )}
            </div>
          )}

          {/* Pathway cards */}
          {pathways.length > 0 && !locked && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pathways.map(p => (
                <button
                  key={p.id}
                  onClick={() => { if (!locked && isLoggedIn) setSelectedPathway(p.id); }}
                  disabled={!isLoggedIn || locked}
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${selectedPathway === p.id ? "rgba(6,182,212,0.4)" : "var(--border)"}`,
                    background: selectedPathway === p.id ? "rgba(6,182,212,0.1)" : "var(--surface-2)",
                    cursor: locked ? "not-allowed" : "pointer", transition: "all 0.15s",
                    opacity: (!isLoggedIn || locked) ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 600, color: selectedPathway === p.id ? "#06b6d4" : "var(--fg)" }}>{p.name}</p>
                    {!p.is_compatible && (
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ef4444" }}>warning</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!selectedMajor && (
            <div style={{ padding: "20px 16px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 6 }}>arrow_back</span>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Select a major first to see available pathways.</p>
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={submitSelection}
          disabled={!isLoggedIn || locked || saving || !selectedMajor || !selectedPathway}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 28px",
            borderRadius: 12, border: "none",
            background: locked ? "var(--surface-2)" : "linear-gradient(135deg,#7c3aed,#5b21b6)",
            color: locked ? "var(--muted)" : "#fff",
            fontWeight: 700, fontSize: "0.9rem",
            cursor: (locked || saving || !selectedMajor || !selectedPathway) ? "not-allowed" : "pointer",
            opacity: (!isLoggedIn || !selectedMajor || !selectedPathway) ? 0.5 : 1,
            boxShadow: locked ? "none" : "0 4px 20px rgba(124,58,237,0.3)",
            transition: "all 0.15s",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {locked ? "lock" : saving ? "hourglass_top" : "save"}
          </span>
          {saving ? "Saving..." : locked ? "Locked" : "Save Selection"}
        </button>

        {message && (
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: message.includes("locked") || message.includes("saved") ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${message.includes("locked") || message.includes("saved") ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
            color: message.includes("locked") || message.includes("saved") ? "#22c55e" : "#f59e0b",
            fontSize: "0.82rem",
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
