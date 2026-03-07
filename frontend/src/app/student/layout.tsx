"use client";

import { useSession } from "@/lib/session";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { formatDisplayName } from "@/lib/name";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  kind: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

const NAV_ITEMS = [
  { href: "/student/readiness", label: "MRI Dashboard", icon: "analytics", section: "Core" },
  { href: "/student/checklist", label: "Tasks", icon: "checklist", section: "Core" },
  { href: "/student/proofs", label: "Proof Vault", icon: "folder_zip", section: "Core" },
  { href: "/student/kanban", label: "90-Day Mission", icon: "view_kanban", section: "Core" },
  { href: "/student/github", label: "GitHub Audit", icon: "code_blocks", section: "Signals" },
  { href: "/student/crc", label: "CRC Score", icon: "calculate", section: "Signals" },
  { href: "/student/interview", label: "Interview AI", icon: "psychology", section: "Signals" },
  { href: "/student/resume-architect", label: "Resume AI", icon: "description", section: "Signals" },
  { href: "/student/timeline", label: "Timeline", icon: "timeline", section: "Planning" },
  { href: "/student/profile", label: "My Profile", icon: "manage_accounts", section: "Account" },
];

const SECTIONS = ["Core", "Signals", "Planning", "Account"] as const;
// "Planning" now only contains Timeline; "Account" contains My Profile (with Career Path tab)

const kindColor: Record<string, string> = {
  market_shift: "#f59e0b",
  market_pulse: "#7c3aed",
  skills_trend: "#22c55e",
  profile_tip: "#06b6d4",
};
const kindLabel: Record<string, string> = {
  market_shift: "Market Shift",
  market_pulse: "Market Pulse",
  skills_trend: "Skills Trend",
  profile_tip: "Profile Tip",
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, username, logout, refreshToken } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const displayName = formatDisplayName(username);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (isLoggedIn) {
      apiGet<Notification[]>("/user/notifications")
        .then(setNotifications)
        .catch(() => setNotifications([]));
    }
  }, [isLoggedIn]);

  const markRead = async (id: string) => {
    await apiSend(`/user/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (refreshToken) {
        await apiSend("/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch { /* silent */ }
    finally {
      if (username) window.localStorage.removeItem(`mp_selection_${username}`);
      logout();
      window.localStorage.removeItem("mp_admin_token");
      router.push("/login");
      setLoggingOut(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 32px rgba(124,58,237,0.4)" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 26 }}>lock</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Access Required</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
            Sign in to access your Market Ready student portal.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/login" style={{ padding: "11px 24px", borderRadius: 11, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>Sign In</Link>
            <Link href="/" style={{ padding: "11px 24px", borderRadius: 11, background: "var(--surface)", border: "1px solid var(--border-2)", color: "var(--fg-2)", fontWeight: 600, textDecoration: "none" }}>Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {SECTIONS.map(section => {
        const items = NAV_ITEMS.filter(i => i.section === section);
        return (
          <div key={section} style={{ marginBottom: 8 }}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
                || (item.href === "/student/profile" && pathname === "/student/onboarding");
              return (
                <Link key={item.href} href={item.href}
                  onClick={onNavigate}
                  data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
                  className={`sidebar-nav-item ${active ? "active" : ""}`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" data-testid="student-sidebar">
        {/* Logo */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 16 }}>bolt</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.78rem", letterSpacing: "-0.01em", color: "var(--fg)" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 1 }}>{displayName}</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
          <NavItems />
        </div>

        {/* Logout */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <button onClick={handleLogout} disabled={loggingOut}
            className="sidebar-nav-item"
            style={{ width: "calc(100% - 0px)", color: loggingOut ? "var(--muted)" : "#f87171", background: "none", border: "none", cursor: loggingOut ? "not-allowed" : "pointer", textAlign: "left" }}>
            <span className="material-symbols-outlined">{loggingOut ? "refresh" : "logout"}</span>
            {loggingOut ? "Logging out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
        display: "none",
        alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 60,
        background: "rgba(3,3,17,0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }} id="mobile-header">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 15 }}>bolt</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "-0.01em" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></span>
        </Link>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setNotifOpen(v => !v)} data-testid="notification-bell"
            style={{ position: "relative", padding: "8px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
            {unread > 0 && (
              <span data-testid="notification-unread-count" style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen(v => !v)}
            style={{ padding: "8px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{mobileOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMobileOpen(false)}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 260,
            background: "var(--void)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
            boxShadow: "40px 0 80px rgba(0,0,0,0.6)",
          }} onClick={e => e.stopPropagation()}>
            {/* Mobile sidebar header */}
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: 15 }}>bolt</span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--fg)" }}>MARKET<span style={{ color: "#a78bfa" }}>READY</span></div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{displayName}</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </div>
            <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
              <button onClick={handleLogout} disabled={loggingOut}
                className="sidebar-nav-item"
                style={{ width: "100%", color: "#f87171", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span className="material-symbols-outlined">logout</span>
                {loggingOut ? "Logging out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Notification Bell (top-right) ── */}
      <div style={{ position: "fixed", top: 16, right: 20, zIndex: 40, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setNotifOpen(v => !v)}
            data-testid="notification-bell"
            style={{
              position: "relative", padding: "9px 12px", borderRadius: 11,
              background: "rgba(11,11,30,0.85)", backdropFilter: "blur(12px)",
              border: "1px solid var(--border-2)", cursor: "pointer", color: "var(--muted)",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s",
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
            {unread > 0 && (
              <span data-testid="notification-unread-count-desktop" style={{ width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {notifOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, zIndex: 200 }}
              onClick={e => e.stopPropagation()}>
              <div data-testid="notification-panel" style={{
                background: "rgba(11,11,30,0.96)", backdropFilter: "blur(24px)",
                border: "1px solid rgba(124,58,237,0.3)", borderRadius: 16,
                boxShadow: "0 20px 60px rgba(0,0,0,0.7)", overflow: "hidden",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                  <h3 style={{ fontWeight: 700, fontSize: "0.875rem" }}>Sentinel Alerts</h3>
                  <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", marginBottom: 8 }}>notifications_off</span>
                      No alerts yet. Check back soon!
                    </div>
                  ) : notifications.slice(0, 15).map(note => (
                    <div key={note.id} data-testid={`notification-${note.id}`}
                      onClick={() => markRead(note.id)}
                      style={{
                        padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                        opacity: note.is_read ? 0.5 : 1,
                        background: note.is_read ? "transparent" : "rgba(124,58,237,0.04)",
                        transition: "background 0.15s",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                          background: `${kindColor[note.kind] || "#7c3aed"}18`,
                          color: kindColor[note.kind] || "#7c3aed",
                        }}>{kindLabel[note.kind] || note.kind}</span>
                        {!note.is_read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", marginLeft: "auto" }} />}
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55 }}>{note.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click-away for notif */}
      {notifOpen && <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setNotifOpen(false)} />}

      {/* ── Main Content ── */}
      <main className="student-shell">
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          #mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
