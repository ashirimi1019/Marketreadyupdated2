"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useSession } from "@/lib/session";
import type { TransparencyAudit } from "@/types/api";

type MarketSignal = {
  id: string;
  pathway_id?: string | null;
  skill_id?: string | null;
  skill_name?: string | null;
  role_family?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  frequency?: number | null;
  source_count?: number | null;
  metadata?: Record<string, unknown> | null;
};

type MarketProposal = {
  id: string;
  pathway_id: string;
  proposed_version_number?: number | null;
  status: string;
  summary?: string | null;
  diff?: Record<string, unknown> | null;
  created_at: string;
  approved_at?: string | null;
};

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--fg)", fontSize: "0.85rem",
};

const PROPOSAL_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  draft:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  approved: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)" },
  published:{ color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
};

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h3>
      {sub && <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

export default function AdminMarketPage() {
  const { isLoggedIn, username } = useSession();
  const [adminToken, setAdminToken] = useLocalStorage("mp_admin_token", "change-me");
  const [pathwayId, setPathwayId] = useState("");
  const [skillName, setSkillName] = useState("");
  const [roleFamily, setRoleFamily] = useState("");
  const [frequency, setFrequency] = useState("");
  const [sourceCount, setSourceCount] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [metadataJson, setMetadataJson] = useState("");
  const [externalProvider, setExternalProvider] = useState("adzuna");
  const [externalQuery, setExternalQuery] = useState("software engineer");
  const [externalLimit, setExternalLimit] = useState("25");

  const [proposalPathwayId, setProposalPathwayId] = useState("");
  const [proposalSummary, setProposalSummary] = useState("");
  const [proposalDiff, setProposalDiff] = useState("");
  const [proposalMessage, setProposalMessage] = useState<string | null>(null);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [copilotInstruction, setCopilotInstruction] = useState("");

  const [lastSignal, setLastSignal] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<Record<string, boolean>>({});
  const [signalsError, setSignalsError] = useState<string | null>(null);

  const [proposals, setProposals] = useState<MarketProposal[]>([]);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [approvingProposalId, setApprovingProposalId] = useState<string | null>(null);
  const [publishingProposalId, setPublishingProposalId] = useState<string | null>(null);
  const [showTransparency, setShowTransparency] = useState(false);
  const [transparencyAudit, setTransparencyAudit] = useState<TransparencyAudit | null>(null);
  const [transparencyLoading, setTransparencyLoading] = useState(false);
  const [transparencyError, setTransparencyError] = useState<string | null>(null);

  const headers = useMemo(() => ({ "X-Admin-Token": adminToken }), [adminToken]);

  const loadSignals = useCallback(() => {
    setSignalsError(null);
    apiGet<MarketSignal[]>("/admin/market/signals", headers)
      .then((data) => {
        setSignals(data);
        const selected: Record<string, boolean> = {};
        data.forEach((signal) => { selected[signal.id] = false; });
        setSelectedSignals(selected);
      })
      .catch(() => setSignalsError("Unable to load market signals."));
  }, [headers]);

  const loadProposals = useCallback(() => {
    setProposalsError(null);
    apiGet<MarketProposal[]>("/admin/market/proposals", headers)
      .then(setProposals)
      .catch(() => setProposalsError("Unable to load proposals."));
  }, [headers]);

  const loadTransparencyAudit = useCallback(() => {
    setTransparencyError(null);
    setTransparencyLoading(true);
    apiGet<TransparencyAudit>("/admin/ai/transparency", headers)
      .then(setTransparencyAudit)
      .catch((error) => {
        setTransparencyError(error instanceof Error ? error.message : "Unable to load transparency audit.");
      })
      .finally(() => setTransparencyLoading(false));
  }, [headers]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadSignals();
    loadProposals();
  }, [isLoggedIn, loadSignals, loadProposals]);

  useEffect(() => {
    if (!isLoggedIn || !showTransparency || transparencyAudit || transparencyLoading) return;
    loadTransparencyAudit();
  }, [isLoggedIn, showTransparency, transparencyAudit, transparencyLoading, loadTransparencyAudit]);

  const toggleSignal = (id: string) => {
    setSelectedSignals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllSignals = () => {
    const all: Record<string, boolean> = {};
    signals.forEach((signal) => { all[signal.id] = true; });
    setSelectedSignals(all);
  };

  const clearAllSignals = () => {
    const cleared: Record<string, boolean> = {};
    signals.forEach((signal) => { cleared[signal.id] = false; });
    setSelectedSignals(cleared);
  };

  const submitSignal = async () => {
    setMessage(null);
    if (!isLoggedIn) { setMessage("Please log in before submitting signals."); return; }
    let metadata: Record<string, unknown> | null = null;
    if (metadataJson.trim()) {
      try { metadata = JSON.parse(metadataJson); }
      catch { setMessage("Metadata must be valid JSON."); return; }
    }
    const payload = {
      signals: [{
        pathway_id: pathwayId || null,
        skill_name: skillName || null,
        role_family: roleFamily || null,
        window_start: windowStart ? new Date(windowStart).toISOString() : null,
        window_end: windowEnd ? new Date(windowEnd).toISOString() : null,
        frequency: frequency ? Number(frequency) : null,
        source_count: sourceCount ? Number(sourceCount) : null,
        metadata,
      }],
    };
    setSaving(true);
    try {
      await apiSend("/admin/market/signals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage("Market signal recorded.");
      setLastSignal(payload.signals[0]);
      loadSignals();
      setPathwayId(""); setSkillName(""); setRoleFamily("");
      setFrequency(""); setSourceCount(""); setWindowStart(""); setWindowEnd(""); setMetadataJson("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to record signal.");
    } finally {
      setSaving(false);
    }
  };

  const runExternalIngest = async () => {
    if (!isLoggedIn) { setMessage("Please log in before ingesting external data."); return; }
    setMessage(null);
    setSaving(true);
    try {
      const result = await apiSend<{ provider: string; ingested: number; created_signals: number }>(
        "/admin/market/ingest/external",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: externalProvider,
            pathway_id: pathwayId || null,
            query: externalQuery || null,
            role_family: roleFamily || null,
            limit: Number(externalLimit || "25"),
          }),
        }
      );
      setMessage(`External ingest complete (${result.provider}): ${result.ingested} rows, ${result.created_signals} signals.`);
      loadSignals();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "External ingest failed.");
    } finally {
      setSaving(false);
    }
  };

  const createProposal = async () => {
    setProposalMessage(null);
    if (!isLoggedIn) { setProposalMessage("Please log in before creating proposals."); return; }
    if (!proposalPathwayId.trim()) { setProposalMessage("Pathway ID is required."); return; }
    let diff: Record<string, unknown> | null = null;
    if (proposalDiff.trim()) {
      try { diff = JSON.parse(proposalDiff); }
      catch { setProposalMessage("Proposal diff must be valid JSON."); return; }
    }
    setProposalSaving(true);
    try {
      await apiSend("/admin/market/proposals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ pathway_id: proposalPathwayId, summary: proposalSummary || null, diff }),
      });
      setProposalMessage("Draft proposal created.");
      setProposalSummary("");
      setProposalDiff("");
      loadProposals();
    } catch (error) {
      setProposalMessage(error instanceof Error ? error.message : "Failed to create proposal.");
    } finally {
      setProposalSaving(false);
    }
  };

  const useLastSignal = () => {
    if (!lastSignal) { setProposalMessage("Submit a market signal first."); return; }
    const signal = lastSignal as Record<string, unknown>;
    const pathway = signal.pathway_id as string | undefined;
    const skill = signal.skill_name as string | undefined;
    if (pathway) setProposalPathwayId(String(pathway));
    setProposalSummary(`Draft update based on market signal for ${skill || "skill"}`);
    setProposalDiff(JSON.stringify({ signal }, null, 2));
  };

  const createProposalFromSelected = async () => {
    setProposalMessage(null);
    if (!isLoggedIn) { setProposalMessage("Please log in before creating proposals."); return; }
    const selected = signals.filter((signal) => selectedSignals[signal.id]);
    if (selected.length === 0) { setProposalMessage("Select at least one signal."); return; }
    let pathway = proposalPathwayId.trim();
    if (!pathway) {
      const pathways = Array.from(new Set(selected.map((signal) => signal.pathway_id).filter(Boolean)));
      if (pathways.length === 1) { pathway = String(pathways[0]); setProposalPathwayId(pathway); }
    }
    if (!pathway) { setProposalMessage("Pathway ID is required for proposals."); return; }
    setProposalSaving(true);
    try {
      const created = await apiSend<MarketProposal>("/admin/market/proposals/copilot", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          pathway_id: pathway,
          signal_ids: selected.map((signal) => signal.id),
          instruction: copilotInstruction || null,
        }),
      });
      setProposalMessage(`Copilot draft proposal created from ${selected.length} selected signals.`);
      setProposalSummary(created.summary ?? "");
      setProposalDiff(JSON.stringify(created.diff ?? { signals: selected }, null, 2));
      loadProposals();
    } catch (error) {
      setProposalMessage(error instanceof Error ? error.message : "Failed to create proposal.");
    } finally {
      setProposalSaving(false);
    }
  };

  const approveProposal = async (proposalId: string) => {
    setProposalsError(null);
    setApprovingProposalId(proposalId);
    try {
      await apiSend<MarketProposal>(`/admin/market/proposals/${proposalId}/approve`, { method: "POST", headers });
      loadProposals();
    } catch (error) {
      setProposalsError(error instanceof Error ? error.message : "Failed to approve proposal.");
    } finally {
      setApprovingProposalId(null);
    }
  };

  const publishProposal = async (proposalId: string) => {
    setProposalsError(null);
    setPublishingProposalId(proposalId);
    try {
      await apiSend<MarketProposal>(`/admin/market/proposals/${proposalId}/publish`, { method: "POST", headers });
      loadProposals();
    } catch (error) {
      setProposalsError(error instanceof Error ? error.message : "Failed to publish proposal.");
    } finally {
      setPublishingProposalId(null);
    }
  };

  const transparencyColor = (label: string, included: boolean) => {
    if (!included) return "#ef4444";
    if (label.toLowerCase().includes("code")) return "#a78bfa";
    if (label.toLowerCase().includes("market")) return "#22c55e";
    return "#f59e0b";
  };

  const selectedCount = Object.values(selectedSignals).filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Market Intelligence</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {isLoggedIn
            ? `Signed in as ${username}. Log signals, run external ingest, draft proposals.`
            : "Log in to manage market signals."}
        </p>
      </div>

      {/* Admin Token */}
      <div style={{ background: "var(--surface)", borderRadius: 14, padding: 18, border: "1px solid rgba(239,68,68,0.2)" }}>
        <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 8 }}>
          Admin Token
        </label>
        <input
          value={adminToken}
          onChange={e => setAdminToken(e.target.value)}
          type="password"
          placeholder="Admin token"
          style={inputStyle}
        />
      </div>

      {/* ── SECTION 1: Ethical Edge / Transparency ── */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid rgba(167,139,250,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#a78bfa" }}>balance</span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>Bias-Free Audit — The Ethical Edge</h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Weighted decision factors and demographic exclusion checks.</p>
          </div>
          <button
            onClick={() => setShowTransparency(prev => !prev)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 10,
              border: `1px solid ${showTransparency ? "rgba(167,139,250,0.4)" : "var(--border)"}`,
              background: showTransparency ? "rgba(167,139,250,0.1)" : "var(--surface-2)",
              color: showTransparency ? "#a78bfa" : "var(--muted)",
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {showTransparency ? "visibility_off" : "visibility"}
            </span>
            {showTransparency ? "Hide" : "Show"} Transparency
          </button>
        </div>

        {showTransparency && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {transparencyLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(167,139,250,0.2)", borderTopColor: "#a78bfa", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Loading transparency audit...</span>
              </div>
            )}
            {transparencyError && (
              <p style={{ fontSize: "0.82rem", color: "#ef4444", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
                {transparencyError}
              </p>
            )}
            {transparencyAudit && (
              <>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>{transparencyAudit.summary}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {transparencyAudit.factors.map(factor => (
                    <div key={factor.label} style={{ background: "var(--surface-2)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{factor.label}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: transparencyColor(factor.label, factor.included) }}>
                          {factor.weight_percent.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 8 }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${Math.max(0, Math.min(100, factor.weight_percent))}%`,
                          background: transparencyColor(factor.label, factor.included),
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>{factor.rationale}</p>
                    </div>
                  ))}
                </div>

                {/* Excluded signals */}
                <div style={{ background: "rgba(239,68,68,0.06)", borderRadius: 12, padding: 16, border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 10, color: "#ef4444" }}>Excluded Demographic Signals</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {transparencyAudit.excluded_signals.map(signal => (
                      <span key={signal} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compliance notes */}
                <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 10 }}>Compliance Notes</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {transparencyAudit.compliance_notes.map(note => (
                      <div key={note} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#22c55e", marginTop: 2, flexShrink: 0 }}>check_circle</span>
                        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pitch */}
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#22c55e" }}>{transparencyAudit.pitch}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Manual Signal Form ── */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
        <SectionHeader
          title="Submit Market Signal"
          sub="Manually record a market signal to feed the pipeline."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { label: "Pathway ID (optional)", val: pathwayId, set: setPathwayId, ph: "e.g. uuid-xxx" },
            { label: "Skill Name (optional)", val: skillName, set: setSkillName, ph: "e.g. Python" },
            { label: "Role Family", val: roleFamily, set: setRoleFamily, ph: "e.g. Software Engineer" },
            { label: "Frequency", val: frequency, set: setFrequency, ph: "e.g. 0.42" },
            { label: "Source Count", val: sourceCount, set: setSourceCount, ph: "e.g. 15" },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</label>
              <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Window Start</label>
            <input type="date" value={windowStart} onChange={e => setWindowStart(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Window End</label>
            <input type="date" value={windowEnd} onChange={e => setWindowEnd(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Metadata (JSON, optional)</label>
          <textarea
            value={metadataJson}
            onChange={e => setMetadataJson(e.target.value)}
            placeholder='{"source":"manual","notes":"testing"}'
            rows={3}
            style={{ ...inputStyle, resize: "vertical", height: "auto", lineHeight: 1.5, fontFamily: "monospace", fontSize: "0.78rem" }}
          />
        </div>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={submitSignal}
            disabled={!isLoggedIn || saving}
            style={{
              padding: "11px 22px", borderRadius: 11, border: "none",
              background: saving ? "rgba(239,68,68,0.4)" : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: !isLoggedIn || saving ? "not-allowed" : "pointer",
              opacity: !isLoggedIn ? 0.5 : 1,
              boxShadow: saving ? "none" : "0 4px 16px rgba(239,68,68,0.3)",
            }}
          >
            {saving ? "Submitting…" : "Submit Signal"}
          </button>
          {message && (
            <span style={{ fontSize: "0.82rem", color: message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") ? "#ef4444" : "#22c55e" }}>
              {message}
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION 3: External Ingest ── */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
        <SectionHeader
          title="External Data Ingest"
          sub="Pull live data from Adzuna, O*NET, or CareerOneStop."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Provider</label>
            <select value={externalProvider} onChange={e => setExternalProvider(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="adzuna">Adzuna</option>
              <option value="onet">O*NET</option>
              <option value="careeronestop">CareerOneStop</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Query</label>
            <input value={externalQuery} onChange={e => setExternalQuery(e.target.value)} placeholder="software engineer" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Limit</label>
            <input value={externalLimit} onChange={e => setExternalLimit(e.target.value)} placeholder="25" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={runExternalIngest}
            disabled={!isLoggedIn || saving}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "11px 22px", borderRadius: 11, border: "1px solid rgba(6,182,212,0.3)",
              background: "rgba(6,182,212,0.08)", color: "#06b6d4",
              fontWeight: 700, fontSize: "0.85rem",
              cursor: !isLoggedIn || saving ? "not-allowed" : "pointer",
              opacity: !isLoggedIn ? 0.5 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            {saving ? "Running…" : "Ingest External Data"}
          </button>
        </div>
      </div>

      {/* ── SECTION 4: Signals List + Copilot ── */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
        <SectionHeader
          title="Signals List + Copilot"
          sub="Select signals and let Copilot generate a structured draft proposal."
        />

        {/* Copilot instruction */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Copilot Instruction (optional)</label>
          <textarea
            value={copilotInstruction}
            onChange={e => setCopilotInstruction(e.target.value)}
            placeholder="e.g. prioritize practical full-stack and cloud deployment evidence."
            rows={2}
            style={{ ...inputStyle, resize: "vertical", height: "auto", lineHeight: 1.5, fontSize: "0.82rem" }}
          />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {[
            { label: "Refresh", icon: "refresh", onClick: loadSignals },
            { label: "Select All", icon: "select_all", onClick: selectAllSignals },
            { label: "Clear", icon: "deselect", onClick: clearAllSignals },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{btn.icon}</span>
              {btn.label}
            </button>
          ))}
          <button
            onClick={createProposalFromSelected}
            disabled={!isLoggedIn || proposalSaving || selectedCount === 0}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 9, border: "none",
              background: selectedCount > 0 ? "linear-gradient(135deg,#ef4444,#dc2626)" : "var(--surface-2)",
              color: selectedCount > 0 ? "#fff" : "var(--muted-2)",
              fontWeight: 700, fontSize: "0.78rem",
              cursor: !isLoggedIn || proposalSaving || selectedCount === 0 ? "not-allowed" : "pointer",
              opacity: selectedCount === 0 ? 0.5 : 1,
              boxShadow: selectedCount > 0 ? "0 4px 12px rgba(239,68,68,0.25)" : "none",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_fix_high</span>
            {proposalSaving ? "Creating…" : `Copilot Proposal${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
          </button>
        </div>

        {signalsError && (
          <p style={{ fontSize: "0.82rem", color: "#ef4444", marginBottom: 14 }}>{signalsError}</p>
        )}

        {/* Signals */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {signals.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 8 }}>signal_cellular_alt</span>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>No signals yet.</p>
            </div>
          ) : (
            signals.map(signal => (
              <label
                key={signal.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  borderRadius: 12, border: `1px solid ${selectedSignals[signal.id] ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  background: selectedSignals[signal.id] ? "rgba(239,68,68,0.04)" : "var(--surface-2)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(selectedSignals[signal.id])}
                  onChange={() => toggleSignal(signal.id)}
                  style={{ marginTop: 3, accentColor: "#ef4444", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 3 }}>
                    {signal.skill_name ?? "Unknown skill"}{signal.role_family ? ` — ${signal.role_family}` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>freq: {signal.frequency ?? "--"}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>sources: {signal.source_count ?? "--"}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>pathway: {signal.pathway_id ?? "n/a"}</span>
                    {signal.window_start && <span style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>{signal.window_start} → {signal.window_end ?? "?"}</span>}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 5: Manual Draft Proposal ── */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>Manual Draft Proposal</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Turn signals into a draft proposal with custom summary and diff.</p>
          </div>
          <button
            onClick={useLastSignal}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>history</span>
            Use Last Signal
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Pathway ID *</label>
            <input value={proposalPathwayId} onChange={e => setProposalPathwayId(e.target.value)} placeholder="Pathway UUID" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Summary</label>
            <input value={proposalSummary} onChange={e => setProposalSummary(e.target.value)} placeholder="Short summary of the proposed update" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 6 }}>Diff (JSON, optional)</label>
          <textarea
            value={proposalDiff}
            onChange={e => setProposalDiff(e.target.value)}
            placeholder='{"add":["New requirement"],"remove":["Old requirement"]}'
            rows={4}
            style={{ ...inputStyle, resize: "vertical", height: "auto", fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={createProposal}
            disabled={!isLoggedIn || proposalSaving}
            style={{
              padding: "11px 22px", borderRadius: 11, border: "none",
              background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff",
              fontWeight: 700, fontSize: "0.85rem",
              cursor: !isLoggedIn || proposalSaving ? "not-allowed" : "pointer",
              opacity: !isLoggedIn ? 0.5 : 1,
              boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            }}
          >
            {proposalSaving ? "Creating…" : "Create Draft Proposal"}
          </button>
          {proposalMessage && (
            <span style={{ fontSize: "0.82rem", color: proposalMessage.toLowerCase().includes("fail") || proposalMessage.toLowerCase().includes("required") ? "#ef4444" : "#22c55e" }}>
              {proposalMessage}
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION 6: Proposal Workflow ── */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>Proposal Workflow</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Review draft proposals and promote them to approved or published.</p>
          </div>
          <button
            onClick={loadProposals}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
            Refresh
          </button>
        </div>

        {proposalsError && (
          <p style={{ fontSize: "0.82rem", color: "#ef4444", marginBottom: 14 }}>{proposalsError}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {proposals.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--muted-2)", display: "block", marginBottom: 8 }}>assignment</span>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>No proposals available yet.</p>
            </div>
          ) : (
            proposals.map(proposal => {
              const conf = PROPOSAL_STATUS_CONFIG[proposal.status] ?? { color: "var(--muted)", bg: "var(--surface-2)", border: "var(--border)" };
              return (
                <div key={proposal.id} style={{ background: "var(--surface-2)", borderRadius: 14, padding: 18, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: "0.62rem", fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                          background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`,
                          textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                        }}>{proposal.status}</span>
                        {proposal.proposed_version_number && (
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>v{proposal.proposed_version_number}</span>
                        )}
                      </div>
                      <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>{proposal.summary || "Draft proposal"}</p>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>
                        Pathway: {proposal.pathway_id} · Created: {new Date(proposal.created_at).toLocaleString()}
                        {proposal.approved_at ? ` · Approved: ${new Date(proposal.approved_at).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {proposal.status !== "approved" && proposal.status !== "published" && (
                        <button
                          onClick={() => approveProposal(proposal.id)}
                          disabled={approvingProposalId === proposal.id}
                          style={{
                            padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(34,197,94,0.3)",
                            background: "rgba(34,197,94,0.08)", color: "#22c55e",
                            fontWeight: 700, fontSize: "0.78rem", cursor: approvingProposalId === proposal.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {approvingProposalId === proposal.id ? "Approving…" : "Approve"}
                        </button>
                      )}
                      {proposal.status === "approved" && (
                        <button
                          onClick={() => publishProposal(proposal.id)}
                          disabled={publishingProposalId === proposal.id}
                          style={{
                            padding: "7px 14px", borderRadius: 9, border: "none",
                            background: "linear-gradient(135deg,#a78bfa,#7c3aed)", color: "#fff",
                            fontWeight: 700, fontSize: "0.78rem", cursor: publishingProposalId === proposal.id ? "not-allowed" : "pointer",
                            boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
                          }}
                        >
                          {publishingProposalId === proposal.id ? "Publishing…" : "Publish"}
                        </button>
                      )}
                    </div>
                  </div>
                  <pre style={{
                    maxHeight: 180, overflowY: "auto", padding: "12px 14px",
                    borderRadius: 10, border: "1px solid var(--border)",
                    background: "rgba(0,0,0,0.3)", fontSize: "0.72rem",
                    color: "var(--muted)", lineHeight: 1.6, fontFamily: "monospace",
                    whiteSpace: "pre-wrap", wordBreak: "break-all",
                  }}>
                    {JSON.stringify(proposal.diff ?? {}, null, 2)}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
