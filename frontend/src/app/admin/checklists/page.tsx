"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useSession } from "@/lib/session";

type Pathway = { id: string; name: string; };
type ChecklistVersion = { id: string; pathway_id: string; version_number: number; status: string; published_at?: string | null; item_count: number; };
type ChecklistItem = { id: string; title: string; tier: string; allowed_proof_types: string[]; };
type ChecklistChangeLog = { id: string; change_type: string; summary?: string | null; created_by?: string | null; created_at: string; };

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

const VERSION_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  draft: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  published: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
  archived: { color: "var(--muted)", bg: "var(--surface-2)", border: "var(--border)" },
};

export default function AdminChecklistsPage() {
  const { isLoggedIn, username } = useSession();
  const [adminToken, setAdminToken] = useLocalStorage("mp_admin_token", "change-me");
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [versions, setVersions] = useState<ChecklistVersion[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChecklistChangeLog[]>([]);
  const [selectedPathway, setSelectedPathway] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const headers = { "X-Admin-Token": adminToken };

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<Pathway[]>("/majors")
      .then(majors => majors[0]?.id)
      .then(majorId => majorId ? apiGet<Pathway[]>(`/majors/${majorId}/pathways`) : Promise.resolve([]))
      .then(data => setPathways(data))
      .catch(() => setPathways([]));
  }, [isLoggedIn]);

  const loadVersions = (pathwayId: string) => {
    apiGet<ChecklistVersion[]>(`/admin/checklists/${pathwayId}/versions`, headers).then(setVersions).catch(() => setVersions([]));
    apiGet<ChecklistChangeLog[]>(`/admin/checklists/${pathwayId}/changes`, headers).then(setChangeLogs).catch(() => setChangeLogs([]));
  };

  const loadItems = (versionId: string) => {
    apiGet<ChecklistItem[]>(`/admin/checklists/versions/${versionId}/items`, headers).then(setItems).catch(() => setItems([]));
  };

  const createDraft = async () => {
    if (!selectedPathway) return;
    try {
      await apiSend(`/admin/checklists/${selectedPathway}/draft`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      loadVersions(selectedPathway);
    } catch { setMessage("Failed to create draft."); }
  };

  const publishDraft = async () => {
    if (!selectedPathway) return;
    try {
      await apiSend(`/admin/checklists/${selectedPathway}/publish`, { method: "POST", headers });
      loadVersions(selectedPathway);
    } catch { setMessage("Failed to publish draft."); }
  };

  const rollbackChecklist = async () => {
    if (!selectedPathway) return;
    try {
      await apiSend(`/admin/checklists/${selectedPathway}/rollback`, { method: "POST", headers });
      setMessage("Rollback applied.");
      loadVersions(selectedPathway);
    } catch { setMessage("Failed to rollback checklist."); }
  };

  const updateItem = async (itemId: string, title: string) => {
    try {
      await apiSend(`/admin/checklists/items/${itemId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      loadItems(selectedVersion);
    } catch { setMessage("Failed to update item."); }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await apiSend(`/admin/checklists/items/${itemId}`, { method: "DELETE", headers });
      loadItems(selectedVersion);
    } catch { setMessage("Failed to delete item."); }
  };

  const TIER_CONFIG: Record<string, { color: string; bg: string }> = {
    non_negotiable: { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    strong_signal: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    optional: { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Checklist Versions</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {isLoggedIn ? `Signed in as ${username}. Draft, publish, and audit checklist versions by pathway.` : "Log in to manage checklist versions safely."}
        </p>
      </div>

      {/* Controls */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid rgba(239,68,68,0.2)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Admin Token</label>
            <input value={adminToken} onChange={e => setAdminToken(e.target.value)} type="password" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label htmlFor="checklists-pathway-select" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Pathway</label>
            <select
              id="checklists-pathway-select"
              value={selectedPathway}
              onChange={e => {
                const val = e.target.value;
                setSelectedPathway(val);
                setSelectedVersion("");
                setItems([]);
                if (val) loadVersions(val);
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select pathway</option>
              {pathways.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {[
            { label: "Create Draft", onClick: createDraft, primary: true },
            { label: "Publish Draft", onClick: publishDraft, primary: false },
            { label: "Rollback", onClick: rollbackChecklist, primary: false },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              disabled={!selectedPathway}
              style={{
                padding: "11px 18px", borderRadius: 11, border: btn.primary ? "none" : "1px solid var(--border)",
                background: btn.primary ? "linear-gradient(135deg,#ef4444,#dc2626)" : "var(--surface-2)",
                color: btn.primary ? "#fff" : "var(--fg-2)",
                fontWeight: 700, fontSize: "0.82rem", cursor: !selectedPathway ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", opacity: !selectedPathway ? 0.5 : 1,
                boxShadow: btn.primary ? "0 4px 16px rgba(239,68,68,0.3)" : "none",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {message && (
          <p style={{ marginTop: 10, fontSize: "0.82rem", color: message.includes("Failed") ? "#ef4444" : "#22c55e" }}>{message}</p>
        )}
      </div>

      {/* Versions */}
      {versions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Versions</h3>
          {versions.map(v => {
            const conf = VERSION_STATUS_CONFIG[v.status] ?? VERSION_STATUS_CONFIG.draft;
            return (
              <div key={v.id} style={{ background: "var(--surface)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, textTransform: "uppercase" }}>
                    {v.status}
                  </span>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>v{v.version_number}</p>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{v.item_count} items</p>
                  {v.published_at && <p style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>Published {new Date(v.published_at).toLocaleDateString()}</p>}
                </div>
                <button
                  onClick={() => { setSelectedVersion(v.id); loadItems(v.id); }}
                  style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${selectedVersion === v.id ? "rgba(239,68,68,0.4)" : "var(--border)"}`, background: selectedVersion === v.id ? "rgba(239,68,68,0.08)" : "var(--surface-2)", color: selectedVersion === v.id ? "#ef4444" : "var(--fg-2)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                >
                  View Items
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Items */}
      {selectedVersion && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            Checklist Items ({items.length})
          </h3>
          {items.map(item => {
            const tierConf = TIER_CONFIG[item.tier] ?? { color: "var(--muted)", bg: "var(--surface-2)" };
            return (
              <div key={item.id} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: tierConf.bg, color: tierConf.color, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    {item.tier.replace(/_/g, " ")}
                  </span>
                  <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{item.title}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { const t = window.prompt("Update title", item.title); if (t) updateItem(item.id, t); }}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.72rem", cursor: "pointer" }}
                  >Edit</button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontWeight: 600, fontSize: "0.72rem", cursor: "pointer" }}
                  >Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Change Log */}
      {selectedPathway && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Change Log</h3>
          {changeLogs.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>No changes logged yet.</p>
          ) : (
            changeLogs.map(entry => (
              <div key={entry.id} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 16px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)", textTransform: "uppercase" }}>
                    {entry.change_type}
                  </span>
                  <p style={{ fontSize: "0.82rem", fontWeight: 500 }}>{entry.summary || "No summary"}</p>
                </div>
                <p style={{ fontSize: "0.68rem", color: "var(--muted-2)" }}>
                  {entry.created_by || "admin"} · {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
