"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiSend, API_BASE, getAuthHeaders } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { ChecklistItem, Proof, StorageMeta, Readiness, EvidenceMapResponse } from "@/types/api";

const PROFICIENCY_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Learning the basics", color: "#f59e0b", weight: "50%" },
  { value: "intermediate", label: "Intermediate", desc: "Working knowledge", color: "#06b6d4", weight: "75%" },
  { value: "professional", label: "Professional", desc: "Production-ready", color: "#22c55e", weight: "100%" },
] as const;

type ProficiencyValue = "beginner" | "intermediate" | "professional";

function ProficiencySelector({ value, onChange, disabled, itemId }: {
  value: ProficiencyValue; onChange: (v: ProficiencyValue) => void; disabled: boolean; itemId: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>
        Proficiency Level
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {PROFICIENCY_LEVELS.map(lvl => (
          <button
            key={lvl.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(lvl.value)}
            data-testid={`proficiency-${lvl.value}-${itemId}`}
            style={{
              border: `1px solid ${value === lvl.value ? lvl.color : "var(--border)"}`,
              background: value === lvl.value ? `${lvl.color}18` : "transparent",
              borderRadius: 10, padding: "8px 4px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: value === lvl.value ? lvl.color : "var(--muted)" }}>
              {lvl.label}
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--muted-2)" }}>{lvl.weight}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VerificationBadge({ status, reviewNote }: { status: string; reviewNote?: string | null }) {
  if (status === "verified") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontWeight: 700 }} data-testid="verification-badge-verified">
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span> AI Verified
    </span>
  );
  if (status === "rejected") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, background: "rgba(239,68,68,0.12)", color: "#ef4444", fontWeight: 700 }} title={reviewNote || ""} data-testid="verification-badge-rejected">
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>cancel</span> Not Verified
    </span>
  );
  if (status === "submitted" || status === "needs_more_evidence") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontWeight: 700 }} data-testid="verification-badge-pending">
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
      AI Reviewing...
    </span>
  );
  return null;
}

function ChecklistPageContent() {
  const { username, isLoggedIn } = useSession();
  const searchParams = useSearchParams();
  const focusItemId = searchParams.get("item");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [proofType, setProofType] = useState<Record<string, string>>({});
  const [proofFile, setProofFile] = useState<Record<string, File | null>>({});
  const [proficiency, setProficiency] = useState<Record<string, ProficiencyValue>>({});
  const [proofsByItem, setProofsByItem] = useState<Record<string, Proof[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storageMeta, setStorageMeta] = useState<StorageMeta | null>(null);
  const [reevaluation, setReevaluation] = useState<Readiness | null>(null);
  const [mappingEvidence, setMappingEvidence] = useState(false);
  const [mappingMessage, setMappingMessage] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const headers = useMemo(() => ({ "X-User-Id": username }), [username]);

  const isCertificateProofType = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return normalized === "cert_upload" || normalized.includes("cert");
  };

  const getStatusLabel = (proofs: Proof[], fallback?: string) => {
    if (!proofs.length) return "incomplete";
    const verifiedProofs = proofs.filter(p => p.status === "verified");
    if (verifiedProofs.length) {
      const hasOnlyResumeMatches = verifiedProofs.every(p => p.proof_type === "resume_upload_match");
      return hasOnlyResumeMatches ? "satisfied by resume upload" : "complete";
    }
    if (proofs.some(p => p.status === "submitted")) return "AI reviewing...";
    if (proofs.some(p => p.status === "needs_more_evidence")) return "needs more evidence";
    if (proofs.some(p => p.status === "rejected")) return "rejected";
    return fallback || "submitted";
  };

  const prettyProofType = (t: string) => t === "resume_upload_match" ? "resume upload match" : t.replace(/_/g, " ");

  const loadProofs = () => {
    if (!isLoggedIn) return;
    apiGet<Proof[]>("/user/proofs", headers).then(proofs => {
      const grouped: Record<string, Proof[]> = {};
      proofs.forEach(p => { if (!grouped[p.checklist_item_id]) grouped[p.checklist_item_id] = []; grouped[p.checklist_item_id].push(p); });
      setProofsByItem(grouped);
    }).catch(() => setProofsByItem({}));
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGet<ChecklistItem[]>("/user/checklist", headers).then(setItems).catch(() => setError("Unable to load checklist."));
  }, [headers, isLoggedIn]);

  useEffect(() => {
    if (!focusItemId) return;
    const target = document.getElementById(`checklist-${focusItemId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusItemId, items.length]);

  useEffect(() => { loadProofs(); }, [headers, isLoggedIn]);

  useEffect(() => {
    apiGet<StorageMeta>("/meta/storage").then(setStorageMeta).catch(() => setStorageMeta({ s3_enabled: false, local_enabled: true }));
  }, []);

  const submitProof = async (item: ChecklistItem, options: { selfAttested?: boolean } = {}) => {
    if (!isLoggedIn) { setMessage("Please log in first."); return; }
    const allowedProofTypes = item.allowed_proof_types ?? [];
    const selectedType = proofType[item.id] || allowedProofTypes[0];
    const file = proofFile[item.id];
    const requiresDocumentUpload = isCertificateProofType(selectedType || "");
    const selectedProficiency: ProficiencyValue = proficiency[item.id] || "intermediate";

    if (!selectedType) { setMessage("Select a proof type."); return; }
    if (requiresDocumentUpload && !file) { setMessage("Certificate proof requires document upload."); return; }
    if (!requiresDocumentUpload && !options.selfAttested) { setMessage("Use the proficiency button to mark this item."); return; }

    setSaving(item.id); setMessage(null);
    try {
      let fileUrl = "";
      if (requiresDocumentUpload && file) {
        const s3Enabled = storageMeta?.s3_enabled ?? false;
        if (s3Enabled) {
          const { upload_url, s3_key } = await apiSend<{ upload_url: string; s3_key: string }>("/user/proofs/presign", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, content_type: file.type }),
          });
          await fetch(upload_url, { method: "PUT", body: file });
          fileUrl = s3_key;
        } else {
          const fd = new FormData();
          fd.append("file", file);
          const uploadRes = await fetch(`${API_BASE}/user/proofs/upload`, { method: "POST", headers: getAuthHeaders(headers), body: fd });
          if (!uploadRes.ok) throw new Error("File upload failed");
          const { file_url } = await uploadRes.json();
          fileUrl = file_url;
        }
      }

      const proof = await apiSend<Proof>("/user/proofs", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist_item_id: item.id,
          proof_type: selectedType,
          url: requiresDocumentUpload ? fileUrl : "self_attested://yes",
          proficiency_level: selectedProficiency,
          metadata: { filename: file?.name },
        }),
      });

      if (requiresDocumentUpload && proof.status === "verified") {
        setMessage(`Certificate AI-verified! Proficiency: ${selectedProficiency}. MRI score updated.`);
      } else if (requiresDocumentUpload) {
        setMessage(`Certificate submitted for AI verification. Status: ${proof.status}.`);
      } else {
        setMessage(`Proficiency set to ${selectedProficiency}. MRI score updated.`);
      }

      loadProofs();
      apiGet<Readiness>("/user/readiness", headers).then(setReevaluation).catch(() => {});
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally { setSaving(null); }
  };

  const runEvidenceMapper = async () => {
    if (!isLoggedIn) return;
    setMappingEvidence(true); setMappingMessage(null);
    try {
      const result = await apiSend<EvidenceMapResponse>("/user/ai/evidence-map", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const mapped = result?.matched_count ?? 0;
      setMappingMessage(mapped > 0 ? `AI Mapper applied: ${mapped} requirement(s) auto-satisfied.` : "No new requirements could be auto-satisfied.");
      loadProofs();
    } catch (err) {
      setMappingMessage(err instanceof Error ? err.message : "Failed to run evidence mapper.");
    } finally { setMappingEvidence(false); }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const nonNegotiables = items.filter(i => i.tier === "non_negotiable");
  const strongSignals = items.filter(i => i.tier === "strong_signal");
  const others = items.filter(i => i.tier !== "non_negotiable" && i.tier !== "strong_signal");

  const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
    complete: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", icon: "check_circle" },
    "AI reviewing...": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "pending" },
    "needs more evidence": { color: "#f97316", bg: "rgba(249,115,22,0.1)", icon: "warning" },
    rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "cancel" },
    "satisfied by resume upload": { color: "#06b6d4", bg: "rgba(6,182,212,0.1)", icon: "description" },
    incomplete: { color: "var(--muted)", bg: "transparent", icon: "radio_button_unchecked" },
  };

  const renderItem = (item: ChecklistItem) => {
    const allowedProofTypes = item.allowed_proof_types ?? [];
    const selectedType = proofType[item.id] ?? allowedProofTypes[0] ?? "";
    const requiresDocumentUpload = isCertificateProofType(selectedType);
    const itemProofs = proofsByItem[item.id] ?? [];
    const displayStatus = getStatusLabel(itemProofs);
    const bestProof = itemProofs.find(p => p.status === "verified") || itemProofs[0];
    const selectedProficiency: ProficiencyValue = proficiency[item.id] || "intermediate";
    const isNonNeg = item.tier === "non_negotiable";
    const cfg = statusConfig[displayStatus] || statusConfig.incomplete;
    const isExpanded = expandedItems.has(item.id);
    const isDone = displayStatus === "complete" || displayStatus === "satisfied by resume upload";

    return (
      <div
        key={item.id}
        id={`checklist-${item.id}`}
        data-testid={`checklist-item-${item.id}`}
        style={{
          borderRadius: 16,
          border: `1px solid ${focusItemId === item.id ? "var(--primary)" : isDone ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
          background: isDone ? "rgba(34,197,94,0.03)" : "var(--surface)",
          overflow: "hidden",
          transition: "all 0.2s",
          boxShadow: focusItemId === item.id ? "0 0 20px rgba(124,58,237,0.2)" : "none",
        }}
      >
        {/* Header row */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
          onClick={() => toggleExpand(item.id)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--fg)" }}>{item.title}</span>
              {isNonNeg && (
                <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", fontWeight: 700 }}>Required</span>
              )}
              {bestProof && (
                <VerificationBadge status={bestProof.status} reviewNote={bestProof.review_note} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 9999, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
                {displayStatus}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--muted-2)", padding: "2px 8px", border: "1px solid var(--border)", borderRadius: 9999 }}>
                {(item.tier ?? "core").replace("_", " ")}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>
            expand_more
          </span>
        </div>

        {/* Expanded controls */}
        {isExpanded && (
          <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ProficiencySelector
                  value={selectedProficiency}
                  onChange={v => setProficiency(prev => ({ ...prev, [item.id]: v }))}
                  disabled={!isLoggedIn || saving === item.id}
                  itemId={item.id}
                />

                {allowedProofTypes.length > 1 && (
                  <div>
                    <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>Proof Type</p>
                    <select
                      value={selectedType}
                      title={`Proof type for ${item.title}`}
                      aria-label={`Proof type for ${item.title}`}
                      onChange={e => {
                        setProofType(prev => ({ ...prev, [item.id]: e.target.value }));
                        if (!isCertificateProofType(e.target.value)) setProofFile(prev => ({ ...prev, [item.id]: null }));
                      }}
                      disabled={!isLoggedIn}
                      data-testid={`proof-type-select-${item.id}`}
                      style={{
                        width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: "0.82rem",
                        background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)",
                      }}
                    >
                      {allowedProofTypes.map(type => <option key={type} value={type}>{prettyProofType(type)}</option>)}
                    </select>
                  </div>
                )}

                {bestProof?.review_note && bestProof.status !== "verified" && (
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                    {bestProof.review_note}
                  </p>
                )}
                {bestProof?.url && !bestProof.url.startsWith("self_attested") && (
                  <a href={(bestProof.view_url || bestProof.url).startsWith("http") ? bestProof.view_url || bestProof.url : `${API_BASE}${bestProof.view_url || bestProof.url}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "var(--primary-light)", textDecoration: "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                    View certificate
                  </a>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                {requiresDocumentUpload ? (
                  <>
                    {isNonNeg && (
                      <div style={{ fontSize: "0.72rem", padding: "8px 10px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, color: "var(--primary-light)" }}>
                        AI will verify this certificate automatically
                      </div>
                    )}
                    <label style={{ fontSize: "0.72rem", color: "var(--muted)", cursor: "pointer" }}>
                      Upload certificate
                      <input
                        id={`certificate-upload-${item.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        title={`Upload certificate for ${item.title}`}
                        aria-label={`Upload certificate for ${item.title}`}
                        onChange={e => setProofFile(prev => ({ ...prev, [item.id]: e.target.files?.[0] ?? null }))}
                        disabled={!isLoggedIn}
                        data-testid={`cert-upload-${item.id}`}
                        style={{ display: "block", marginTop: 6, fontSize: "0.78rem", color: "var(--muted)", width: "100%" }}
                      />
                    </label>
                    <button
                      onClick={() => submitProof(item)}
                      disabled={!isLoggedIn || saving === item.id}
                      data-testid={`submit-cert-btn-${item.id}`}
                      style={{
                        padding: "10px 16px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: "0.8rem",
                        background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
                        cursor: saving === item.id ? "wait" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      {saving === item.id ? (
                        <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 15 }}>refresh</span>Verifying...</>
                      ) : (
                        <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>verified_user</span>Submit & AI Verify</>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => submitProof(item, { selfAttested: true })}
                    disabled={!isLoggedIn || saving === item.id}
                    data-testid={`mark-proficient-btn-${item.id}`}
                    style={{
                      padding: "10px 16px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: "0.8rem",
                      background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff",
                      cursor: saving === item.id ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {saving === item.id ? "Saving..." : `Mark as ${PROFICIENCY_LEVELS.find(l => l.value === selectedProficiency)?.label}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const sectionGroups = [
    { label: "Required", sublabel: "Non-Negotiable", items: nonNegotiables, color: "#ef4444", icon: "lock" },
    { label: "Strong Signals", sublabel: "Competitive edge", items: strongSignals, color: "#f59e0b", icon: "star" },
    { label: "Core Skills", sublabel: "All other skills", items: others, color: "var(--muted)", icon: "checklist" },
  ].filter(g => g.items.length > 0);

  const total = items.length;
  const completed = items.filter(i => {
    const proofs = proofsByItem[i.id] ?? [];
    const status = getStatusLabel(proofs);
    return status === "complete" || status === "satisfied by resume upload";
  }).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Skills Checklist</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Set proficiency levels. AI-verifies certificates on required items.</p>
        </div>
        <button
          onClick={runEvidenceMapper}
          disabled={!isLoggedIn || mappingEvidence}
          data-testid="evidence-mapper-btn"
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12,
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
            color: "#a78bfa", fontWeight: 700, fontSize: "0.82rem", cursor: mappingEvidence ? "wait" : "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
          {mappingEvidence ? "Mapping..." : "AI Evidence Mapper"}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Overall Progress</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: pct >= 85 ? "#22c55e" : pct >= 65 ? "#a78bfa" : "var(--fg)" }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4)", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[
            { label: "Required", count: nonNegotiables.length, color: "#ef4444" },
            { label: "Strong Signals", count: strongSignals.length, color: "#f59e0b" },
            { label: "Core Skills", count: others.length, color: "var(--muted)" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{s.count} {s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proficiency legend */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 18, border: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 12 }}>How Proficiency Affects Your MRI Score</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {PROFICIENCY_LEVELS.map(lvl => (
            <div key={lvl.value} style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, border: `1px solid ${lvl.color}28` }}>
              <p style={{ fontWeight: 700, fontSize: "0.82rem", color: lvl.color }}>{lvl.label}</p>
              <p style={{ fontSize: "1rem", fontWeight: 800, color: lvl.color }}>{lvl.weight}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>{lvl.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10 }}>
          AI-verified certs on required items earn an extra <span style={{ color: "#22c55e", fontWeight: 700 }}>+15% bonus</span>.
        </p>
      </div>

      {/* Skill state legend */}
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 18, border: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 12 }}>Skill Verification States</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[
            { icon: "verified", symbol: "✓", label: "AI-Verified", desc: "Proof submitted and confirmed by AI", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
            { icon: "edit_note", symbol: "◐", label: "Self-Attested", desc: "You marked it — no AI review yet", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
            { icon: "description", symbol: "⊕", label: "Resume-Matched", desc: "Detected from your resume upload", color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
            { icon: "radio_button_unchecked", symbol: "○", label: "Missing", desc: "Not yet started or no proof added", color: "var(--muted)", bg: "rgba(255,255,255,0.03)" },
          ].map(s => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 10, background: s.bg, border: `1px solid ${s.color}28`, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.85rem", color: s.color, fontWeight: 800 }}>{s.symbol}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: s.color }}>{s.label}</span>
              </div>
              <p style={{ fontSize: "0.65rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      {mappingMessage && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--primary-light)", fontSize: "0.82rem" }}>
          {mappingMessage}
        </div>
      )}
      {!isLoggedIn && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.82rem" }}>
          Please log in to view your checklist.
        </div>
      )}
      {message && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: "0.82rem" }} data-testid="checklist-message">
          {message}
        </div>
      )}
      {error && <p style={{ color: "#ef4444", fontSize: "0.82rem" }}>{error}</p>}

      {reevaluation && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", fontSize: "0.85rem" }}>
          <span style={{ fontWeight: 700, color: "var(--primary-light)" }}>MRI Recalculated: {reevaluation.score.toFixed(0)}/100</span>
          {" · "}
          <span style={{ color: "var(--muted)" }}>{reevaluation.band}</span>
          {reevaluation.next_actions?.length ? (
            <div style={{ marginTop: 4, color: "var(--muted)", fontSize: "0.78rem" }}>Next: {reevaluation.next_actions.slice(0, 2).join(" · ")}</div>
          ) : null}
        </div>
      )}

      {/* Sections */}
      {sectionGroups.map(group => (
        <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: group.color }}>{group.icon}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: group.color }}>{group.label}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>— {group.sublabel}</span>
            <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted-2)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 99 }}>
              {group.items.length} items
            </span>
          </div>
          {group.items.map(renderItem)}
        </div>
      ))}
    </div>
  );
}

export default function StudentChecklistPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 40, borderRadius: 12, background: "var(--surface)", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 120, borderRadius: 16, background: "var(--surface)", animation: "shimmer 1.5s infinite" }} />
      </div>
    }>
      <ChecklistPageContent />
    </Suspense>
  );
}
