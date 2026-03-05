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

  const passwordPolicyHint = "Min 8 chars, one uppercase, one special character.";

  const setMsg = (msg: string, error = true) => {
    setStatus(msg);
    setStatusIsError(error);
  };

  const handleLogin = async () => {
    if (!username.trim()) return setMsg("Username is required.");
    if (!password.trim()) return setMsg("Password is required.");
    setLoading(true);
    setStatus(null);
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
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotIdentity.trim()) return setMsg("Enter username or email.");
    const body = forgotIdentity.includes("@")
      ? { email: forgotIdentity.trim() }
      : { username: forgotIdentity.trim() };
    try {
      const res = await apiSend<ActionResponse>("/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMsg(res.message, false);
    } catch (error) {
      if (isRateLimited(error)) {
        const retry = getRetryAfterSeconds(error);
        setMsg(retry ? `Rate limited. Retry in ${retry}s.` : "Rate limited. Please wait.");
      } else {
        setMsg(getErrorMessage(error) || "Reset request failed.");
      }
    }
  };

  const handleResetPassword = async () => {
    if (!username.trim() || !resetCode.trim() || !newPassword.trim())
      return setMsg("Fill in username, code, and new password.");
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword))
      return setMsg(passwordPolicyHint);
    try {
      const res = await apiSend<ActionResponse>("/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), code: resetCode.trim(), new_password: newPassword }),
      });
      setMsg(res.message, false);
      setResetCode("");
      setNewPassword("");
    } catch (error) {
      if (isRateLimited(error)) {
        const retry = getRetryAfterSeconds(error);
        setMsg(retry ? `Rate limited. Retry in ${retry}s.` : "Rate limited. Please wait.");
      } else {
        setMsg(getErrorMessage(error) || "Password reset failed.");
      }
    }
  };

  return (
    <div className="flex items-start justify-center pt-8 px-4">
      <div
        className="login-card w-full max-w-md"
        data-testid="login-page"
      >
        {/* Header */}
        <div className="mb-8">
          <span className="badge mb-4 inline-flex" data-testid="login-badge">Secure Access</span>
          <h1 className="text-2xl font-bold mt-3 tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm login-description">
            Enter your credentials to access your readiness dashboard.
          </p>
        </div>

        {/* Login Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username-input" className="text-xs font-mono uppercase tracking-widest login-field-label">
              Username
            </label>
            <input
              id="username-input"
              className="login-input w-full"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              data-testid="login-username-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-input" className="text-xs font-mono uppercase tracking-widest login-field-label">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              className="login-input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              data-testid="login-password-input"
            />
          </div>
        </div>

        <button
          className="cta w-full mt-6"
          onClick={handleLogin}
          disabled={loading}
          data-testid="login-submit-btn"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {status && (
          <div
            className={`login-status ${statusIsError ? "error" : "success"}`}
            data-testid="login-status"
            role="alert"
          >
            {status}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Link href="/register" className="login-register-link" data-testid="login-register-link">
            Create account
          </Link>
          <button
            className="login-footer-button"
            onClick={() => setShowReset((v) => !v)}
            data-testid="login-toggle-reset-btn"
          >
            {showReset ? "Hide reset" : "Forgot password?"}
          </button>
        </div>

        {/* Password Reset */}
        {showReset && (
          <div
            className="login-reset-container"
            data-testid="login-reset-section"
          >
            <p className="text-xs font-mono uppercase tracking-widest login-reset-title">
              Password Reset
            </p>
            <div className="flex gap-2">
              <input
                id="reset-identity-input"
                className="login-input flex-1"
                placeholder="Username or email"
                value={forgotIdentity}
                onChange={(e) => setForgotIdentity(e.target.value)}
                data-testid="reset-identity-input"
              />
              <button
                className="cta cta-secondary text-sm px-4 py-2 whitespace-nowrap"
                onClick={handleForgotPassword}
                data-testid="reset-request-btn"
              >
                Send Code
              </button>
            </div>
            <input
              id="reset-code-input"
              className="login-input"
              placeholder="Reset code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              data-testid="reset-code-input"
            />
            <input
              id="reset-password-input"
              type="password"
              className="login-input"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="reset-newpw-input"
            />
            <p className="login-hint-text">{passwordPolicyHint}</p>
            <button
              className="cta cta-secondary"
              onClick={handleResetPassword}
              data-testid="reset-submit-btn"
            >
              Reset Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
