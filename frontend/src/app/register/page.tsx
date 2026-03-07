"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiSend, API_BASE } from "@/lib/api";
import { useSession } from "@/lib/session";

type AuthResponse = {
  user_id: string;
  auth_token?: string | null;
  refresh_token?: string | null;
  email_verification_required?: boolean;
  message?: string | null;
};

export default function RegisterPage() {
  const { login } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordPolicyHint = "Min 8 chars, one uppercase, one special character.";
  const setMsg = (msg: string, error = true) => { setStatus(msg); setStatusIsError(error); };

  const handleRegister = async () => {
    const emailValue = email.trim();
    if (!username.trim()) return setMsg("Username is required.");
    if (!emailValue) return setMsg("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) return setMsg("Enter a valid email address.");
    if (!password.trim()) return setMsg("Password is required.");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) return setMsg(passwordPolicyHint);
    if (password !== confirmPassword) return setMsg("Passwords do not match.");
    setLoading(true); setStatus(null);
    try {
      const res = await apiSend<AuthResponse>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: emailValue, password }),
      });
      if (res.auth_token && res.refresh_token) {
        login(username.trim(), res.auth_token, res.refresh_token);
        // Auto-upload resume stored from landing page hook
        try {
          const pendingName = sessionStorage.getItem("pending_resume_name");
          const pendingType = sessionStorage.getItem("pending_resume_type");
          const pendingData = sessionStorage.getItem("pending_resume_data");
          if (pendingName && pendingData) {
            const binary = atob(pendingData.split(",")[1]);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: pendingType || "application/octet-stream" });
            const fd = new FormData();
            fd.append("file", new File([blob], pendingName, { type: pendingType || "application/octet-stream" }));
            await fetch(`${API_BASE}/user/profile/resume`, {
              method: "POST",
              headers: { "X-Auth-Token": res.auth_token, "X-User-Id": username.trim() },
              body: fd,
            }).catch(() => {});
            sessionStorage.removeItem("pending_resume_name");
            sessionStorage.removeItem("pending_resume_type");
            sessionStorage.removeItem("pending_resume_data");
          }
        } catch { /* non-critical — resume can be uploaded later */ }
        // Always send new users through onboarding to select pathway
        router.push("/student/onboarding");
      } else if (res.email_verification_required) {
        setMsg(res.message ?? "Account created. Verify your email before signing in.", false);
      } else {
        setMsg("Account created. Please log in.", false);
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Registration failed.");
    } finally { setLoading(false); }
  };

  const strength =
    password.length === 0 ? null
    : password.length < 6 ? { label: "Weak", pct: 25, color: "#ef4444" }
    : password.length < 8 || !/[A-Z]/.test(password) ? { label: "Fair", pct: 55, color: "#f59e0b" }
    : /[^A-Za-z0-9]/.test(password) ? { label: "Strong", pct: 100, color: "#22c55e" }
    : { label: "Good", pct: 80, color: "#7c3aed" };

  const PERKS = [
    { icon: "analytics", label: "Real-time MRI Score", sub: "Updated daily from 50k+ job postings" },
    { icon: "code_blocks", label: "GitHub Signal Audit", sub: "AI-verified proof of your skills" },
    { icon: "view_kanban", label: "90-Day Mission Plan", sub: "Personalized AI roadmap with GitHub sync" },
    { icon: "radar", label: "Sentinel Market Alerts", sub: "Get notified when market shifts happen" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 11,
    padding: "11px 14px",
    color: "var(--fg)",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div data-testid="register-page" style={{ minHeight: "100dvh", display: "flex", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "#7c3aed", filter: "blur(120px)", opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "#06b6d4", filter: "blur(100px)", opacity: 0.1 }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      </div>

      {/* Left panel — desktop only */}
      <div style={{ display: "none", width: "42%", padding: "48px", flexDirection: "column", justifyContent: "space-between", position: "relative", zIndex: 1, borderRight: "1px solid var(--border)" }} className="left-panel-lg">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 18 }}>bolt</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em", color: "var(--fg)" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></span>
        </Link>

        <div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 32 }}>
            Build your<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>proof-of-work</span><br />
            profile today.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PERKS.map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: "#a78bfa", fontSize: 20 }}>{p.icon}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--fg)" }}>{p.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex" }}>
            {["#7c3aed","#06b6d4","#f43f5e","#22c55e"].map((c, i) => (
              <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: "2px solid var(--bg)", marginLeft: i > 0 ? -9 : 0 }} />
            ))}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            Join the <strong style={{ color: "var(--fg)" }}>early access program</strong> — free
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", position: "relative", zIndex: 1 }}>

        {/* Mobile logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 32 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 17 }}>bolt</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.02em", color: "var(--fg)" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></span>
        </Link>

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 420,
          background: "rgba(11,11,30,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 24, padding: "36px 32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#a78bfa" }}>star</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase" }}>Create Account</span>
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Join Market Ready</h1>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Start your proof-first career journey in 60 seconds.</p>
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Username */}
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Username</label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--muted-2)", pointerEvents: "none" }}>person</span>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" autoFocus
                  data-testid="register-username-input" className="login-input" style={{ paddingLeft: 38 }} />
              </div>
            </div>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Email</label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--muted-2)", pointerEvents: "none" }}>mail</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu"
                  data-testid="register-email-input" className="login-input" style={{ paddingLeft: 38 }} />
              </div>
            </div>
            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Password</label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--muted-2)", pointerEvents: "none" }}>key</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  data-testid="register-password-input" className="login-input" style={{ paddingLeft: 38, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", display: "flex" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {strength && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                  <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: strength.color }}>{strength.label}</span>
                </div>
              )}
              <p style={{ fontSize: "0.68rem", color: "var(--muted-2)", marginTop: 5 }}>{passwordPolicyHint}</p>
            </div>
            {/* Confirm */}
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--muted-2)", pointerEvents: "none" }}>lock_person</span>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                  data-testid="register-confirm-input" className="login-input" style={{ paddingLeft: 38 }} />
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleRegister} disabled={loading} data-testid="register-submit-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
                width: "100%", padding: "13px 20px", borderRadius: 12,
                background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#5b21b6)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)", transition: "all 0.2s",
              }}>
              {loading ? (
                <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>refresh</span>Creating account...</>
              ) : (
                <>Get Started<span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span></>
              )}
            </button>

            {/* Status */}
            {status && (
              <div data-testid="register-status" style={{
                display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 10,
                background: statusIsError ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                border: `1px solid ${statusIsError ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                color: statusIsError ? "#f87171" : "#4ade80", fontSize: "0.82rem",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>{statusIsError ? "error" : "check_circle"}</span>
                {status}
              </div>
            )}
          </div>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.82rem", color: "var(--muted)" }}>
            Already registered?{" "}
            <Link href="/login" data-testid="register-login-link" style={{ color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
