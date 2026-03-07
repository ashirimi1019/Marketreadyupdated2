"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useSession } from "@/lib/session";

type Proof = {
  id: string;
  user_id: string;
  checklist_item_id: string;
  proof_type: string;
  url: string;
  view_url?: string | null;
  status: string;
  review_note?: string | null;
};

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  submitted: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)" },
  verified: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
  rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
  needs_more_evidence: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
};

export default function AdminProofsPage() {
  const { isLoggedIn, username } = useSession();
  const [adminToken, setAdminToken] = useLocalStorage("mp_admin_token", "change-me");
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const headers = useMemo(() => ({ "X-Admin-Token": adminToken }), [adminToken]);

  const loadProofs = useCallback(() => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    apiGet<Proof[]>(`/admin/proofs${query}`, headers)
      .then(data => {
        setProofs(data);
        const notes: Record<string, string> = {};
        data.forEach(proof => { notes[proof.id] = proof.review_note ?? ""; });
        setReviewNotes(notes);
      })
      .catch(() => setProofs([]));
  }, [headers, statusFilter]);

  useEffect(() => { if (isLoggedIn) loadProofs(); }, [isLoggedIn, loadProofs]);

  const updateStatus = async (proofId: string, status: string) => {
    await apiSend(`/admin/proofs/${proofId}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status, review_note: reviewNotes[proofId] ?? "" }),
    });
    loadProofs();
  };

  const saveNote = async (proofId: string) => {
    await apiSend(`/admin/proofs/${proofId}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ review_note: reviewNotes[proofId] ?? "" }),
    });
    loadProofs();
  };

  const deleteProof = async (proofId: string) => {
    await apiSend(`/admin/proofs/${proofId}`, { method: "DELETE", headers });
    loadProofs();
  };

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] ?? { color: "var(--muted)", bg: "var(--surface-2)", border: "var(--border)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Proof Queue</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {isLoggedIn ? `Signed in as ${username}. Review, verify, or reject submitted proof artifacts.` : "Log in to review proof submissions safely."}
        </p>
      </div>

      {/* Admin Token + Filters */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 18, border: "1px solid rgba(239,68,68,0.2)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Admin Token</label>
            <input value={adminToken} onChange={e => setAdminToken(e.target.value)} type="password" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="proof-status-filter" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Status Filter</label>
            <select
              id="proof-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="needs_more_evidence">Needs more evidence</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button
            onClick={loadProofs}
            style={{ padding: "11px 20px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10 }}>
        {Object.entries(STATUS_CONFIG).map(([status, conf]) => {
          const count = proofs.filter(p => p.status === status).length;
          return (
            <div key={status} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: conf.bg, border: `1px solid ${conf.border}`, textAlign: "center" }}>
              <p style={{ fontSize: "1.2rem", fontWeight: 800, color: conf.color }}>{count}</p>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: conf.color, opacity: 0.8 }}>{status.replace(/_/g, " ")}</p>
            </div>
          );
        })}
      </div>

      {/* Proofs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {proofs.length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", borderRadius: 14, border: "1px dashed var(--border)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--muted-2)", display: "block", marginBottom: 8 }}>verified</span>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>No proofs found.</p>
          </div>
        )}
        {proofs.map(row => {
          const conf = getStatusConfig(row.status);
          return (
            <div key={row.id} style={{ background: "var(--surface)", borderRadius: 14, padding: "16px 18px", border: "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{row.proof_type}</p>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {row.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>User: {row.user_id}</p>
                  <a href={row.view_url || row.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: "0.75rem", color: "#a78bfa", textDecoration: "underline", wordBreak: "break-all" }}>
                    {row.url}
                  </a>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea
                    rows={2}
                    placeholder="Review note for student"
                    value={reviewNotes[row.id] ?? ""}
                    onChange={e => setReviewNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                    style={{ ...inputStyle, height: "auto", resize: "vertical", fontSize: "0.78rem", lineHeight: 1.5 }}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => saveNote(row.id)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>
                      Save Note
                    </button>
                    <button onClick={() => updateStatus(row.id, "verified")}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                      Verify
                    </button>
                    <button onClick={() => updateStatus(row.id, "rejected")}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>
                      Reject
                    </button>
                    <button onClick={() => deleteProof(row.id)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
