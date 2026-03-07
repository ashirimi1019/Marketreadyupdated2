"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useSession } from "@/lib/session";

type Skill = {
  id: string;
  name: string;
  description?: string | null;
};

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

export default function AdminSkillsPage() {
  const { isLoggedIn, username } = useSession();
  const [adminToken, setAdminToken] = useLocalStorage("mp_admin_token", "change-me");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState({ name: "", description: "" });

  const headers = useMemo(() => ({ "X-Admin-Token": adminToken }), [adminToken]);

  const loadSkills = useCallback(() => {
    apiGet<Skill[]>("/admin/skills", headers).then(setSkills).catch(() => setSkills([]));
  }, [headers]);

  useEffect(() => { if (isLoggedIn) loadSkills(); }, [isLoggedIn, loadSkills]);

  const createSkill = async () => {
    setMessage(null);
    if (!newSkill.name.trim()) { setMessage("Skill name is required."); return; }
    try {
      await apiSend("/admin/skills", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      });
      setNewSkill({ name: "", description: "" });
      loadSkills();
    } catch { setMessage("Failed to create skill."); }
  };

  const deleteSkill = async (id: string) => {
    try {
      await apiSend(`/admin/skills/${id}`, { method: "DELETE", headers });
      loadSkills();
    } catch { setMessage("Failed to delete skill."); }
  };

  const updateSkill = async (id: string, name: string, description?: string) => {
    try {
      await apiSend(`/admin/skills/${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      loadSkills();
    } catch { setMessage("Failed to update skill."); }
  };

  const promptEdit = (skill: Skill) => {
    const name = window.prompt("Skill name", skill.name);
    if (!name) return;
    const description = window.prompt("Description", skill.description ?? "");
    updateSkill(skill.id, name, description ?? "");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Skills Library</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {isLoggedIn ? `Signed in as ${username}. Create, update, or archive skills used across pathways.` : "Log in to manage skills safely."}
        </p>
      </div>

      {/* Admin Token */}
      <div style={{ background: "var(--surface)", borderRadius: 14, padding: 18, border: "1px solid rgba(239,68,68,0.2)" }}>
        <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 8 }}>
          Admin Token
        </label>
        <input value={adminToken} onChange={e => setAdminToken(e.target.value)}
          placeholder="Admin token" type="password" style={inputStyle} />
      </div>

      {/* Add Skill */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 14 }}>Add New Skill</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Name *</label>
            <input value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
              placeholder="e.g., Python" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Description</label>
            <input value={newSkill.description} onChange={e => setNewSkill({ ...newSkill, description: e.target.value })}
              placeholder="Optional description" style={inputStyle} />
          </div>
          <button
            onClick={createSkill}
            style={{
              padding: "11px 20px", borderRadius: 11, border: "none",
              background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff",
              fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            }}
          >
            Add Skill
          </button>
        </div>
        {message && (
          <p style={{ marginTop: 10, fontSize: "0.82rem", color: message.includes("Failed") ? "#ef4444" : "#22c55e" }}>{message}</p>
        )}
      </div>

      {/* Skills list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            All Skills ({skills.length})
          </h3>
          <button
            onClick={loadSkills}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>refresh</span>
            Refresh
          </button>
        </div>
        {skills.map(skill => (
          <div
            key={skill.id}
            style={{ background: "var(--surface)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
          >
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{skill.name}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{skill.description ?? "No description"}</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => promptEdit(skill)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}
              >
                Edit
              </button>
              <button
                onClick={() => deleteSkill(skill.id)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {skills.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", borderRadius: 14, border: "1px dashed var(--border)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 8 }}>psychology</span>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>No skills yet. Add one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
