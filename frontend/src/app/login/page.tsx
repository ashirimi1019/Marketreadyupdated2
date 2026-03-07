"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiSend } from "@/lib/api";
import { useSession } from "@/lib/session";
import { getErrorMessage, getRetryAfterSeconds, isRateLimited } from "@/lib/errors";

type AuthResponse = {
  user_id: string;
  auth_token?: string | null;
  refresh_token?: string | null;
  email_verification_required?: boolean;
  message?: string | null;
};

type ActionResponse = { ok: boolean; message: string };

export default function LoginPage() {
  const { login } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [forgotIdentity, setForgotIdentity] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordPolicyHint = "Min 8 chars, one uppercase, one special character.";

  const setMsg = (msg: string, error = true) => { setStatus(msg); setStatusIsError(error); };

  const handleLogin = async () => {
    if (!username.trim()) return setMsg("Username is required.");
    if (!password.trim()) return setMsg("Password is required.");
    setLoading(true); setStatus(null);
    try {
      const res = await apiSend<AuthResponse>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.auth_token || !res.refresh_token) return setMsg(res.message ?? "Login blocked.");
      login(res.user_id, res.auth_token, res.refresh_token);
      setPassword("");
      router.push("/");
    } catch (error) {
      if (isRateLimited(error)) {
        const retry = getRetryAfterSeconds(error);
        setMsg(retry ? `Too many attempts. Try again in ${retry}s.` : "Too many attempts. Please wait.");
      } else {
        setMsg(getErrorMessage(error) || "Login failed. Check credentials.");
      }
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!forgotIdentity.trim()) return setMsg("Enter username or email.");
    const body = forgotIdentity.includes("@") ? { email: forgotIdentity.trim() } : { username: forgotIdentity.trim() };
    try {
      const res = await apiSend<ActionResponse>("/auth/password/forgot", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      setMsg(res.message, false);
    } catch (error) {
      if (isRateLimited(error)) {
        const retry = getRetryAfterSeconds(error);
        setMsg(retry ? `Rate limited. Retry in ${retry}s.` : "Rate limited. Please wait.");
      } else { setMsg(getErrorMessage(error) || "Reset request failed."); }
    }
  };

  const handleResetPassword = async () => {
    if (!username.trim() || !resetCode.trim() || !newPassword.trim()) return setMsg("Fill in username, code, and new password.");
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) return setMsg(passwordPolicyHint);
    try {
      const res = await apiSend<ActionResponse>("/auth/password/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), code: resetCode.trim(), new_password: newPassword }),
      });
      setMsg(res.message, false);
      setResetCode(""); setNewPassword("");
    } catch (error) {
      if (isRateLimited(error)) {
        const retry = getRetryAfterSeconds(error);
        setMsg(retry ? `Rate limited. Retry in ${retry}s.` : "Rate limited. Please wait.");
      } else { setMsg(getErrorMessage(error) || "Password reset failed."); }
    }
  };

  return (
    <div data-testid="login-page" style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "24px", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-15%", width: 600, height: 600, borderRadius: "50%", background: "#7c3aed", filter: "blur(120px)", opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "#06b6d4", filter: "blur(100px)", opacity: 0.1 }} />
        {/* Grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
              <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 18 }}>bolt</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em", color: "var(--fg)" }}>
              MARKET<span style={{ color: "#a78bfa" }}>READY</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(11,11,30,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 24, padding: "36px 32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#a78bfa" }}>lock</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Secure Access</span>
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Welcome back</h1>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Sign in to access your Market-Ready Index dashboard.</p>
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Username */}
            <div>
              <label htmlFor="username-input" style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 7, fontFamily: "var(--font-mono)" }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: "var(--muted-2)", pointerEvents: "none" }}>person</span>
                <input id="username-input" type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="your_username" autoFocus
                  data-testid="login-username-input"
                  className="login-input"
                  style={{ paddingLeft: 40 }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password-input" style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 7, fontFamily: "var(--font-mono)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: "var(--muted-2)", pointerEvents: "none" }}>key</span>
                <input id="password-input" type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  data-testid="login-password-input"
                  className="login-input"
                  style={{ paddingLeft: 40, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", display: "flex", alignItems: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleLogin} disabled={loading}
              data-testid="login-submit-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "13px 20px", borderRadius: 12,
                background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#5b21b6)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                transition: "all 0.2s",
              }}>
              {loading ? (
                <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>refresh</span>Signing in...</>
              ) : (
                <>Sign In<span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
              )}
            </button>

            {/* Status */}
            {status && (
              <div data-testid="login-status" role="alert" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "11px 14px", borderRadius: 10,
                background: statusIsError ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                border: `1px solid ${statusIsError ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                color: statusIsError ? "#f87171" : "#4ade80",
                fontSize: "0.82rem",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>{statusIsError ? "error" : "check_circle"}</span>
                {status}
              </div>
            )}
          </div>

          {/* Footer links */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/register" data-testid="login-register-link"
              style={{ fontSize: "0.82rem", color: "#a78bfa", textDecoration: "none", fontWeight: 600, transition: "color 0.15s" }}>
              Create account →
            </Link>
            <button onClick={() => setShowReset(v => !v)} data-testid="login-toggle-reset-btn"
              style={{ fontSize: "0.82rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--fg-2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
              {showReset ? "Hide reset" : "Forgot password?"}
            </button>
          </div>

          {/* Password Reset */}
          {showReset && (
            <div data-testid="login-reset-section" style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Password Reset</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="login-input" style={{ flex: 1 }} placeholder="Username or email"
                  value={forgotIdentity} onChange={e => setForgotIdentity(e.target.value)}
                  data-testid="reset-identity-input" />
                <button onClick={handleForgotPassword} data-testid="reset-request-btn"
                  style={{ padding: "0 16px", borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                  Send Code
                </button>
              </div>
              <input className="login-input" placeholder="Reset code" value={resetCode}
                onChange={e => setResetCode(e.target.value)} data-testid="reset-code-input" />
              <input className="login-input" type="password" placeholder="New password"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} data-testid="reset-newpw-input" />
              <p style={{ fontSize: "0.72rem", color: "var(--muted-2)" }}>{passwordPolicyHint}</p>
              <button onClick={handleResetPassword} data-testid="reset-submit-btn"
                style={{ padding: "11px 20px", borderRadius: 10, background: "transparent", border: "1px solid var(--border-2)", color: "var(--fg-2)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                Reset Password
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.72rem", color: "var(--muted-2)" }}>
          Protected by rate limiting · 8 attempts per 10 min
        </p>
      </div>
    </div>
  );
}
