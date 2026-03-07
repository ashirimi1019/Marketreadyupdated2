"use client";

import { useSession } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/admin/skills", label: "Skills", icon: "psychology" },
  { href: "/admin/checklists", label: "Checklists", icon: "checklist" },
  { href: "/admin/proofs", label: "Proofs", icon: "verified" },
  { href: "/admin/market", label: "Market", icon: "trending_up" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { username, isLoggedIn } = useSession();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50, background: "rgba(11,11,30,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)", padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff" }}>admin_panel_settings</span>
          </div>
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#ef4444" }}>Admin Console</p>
            <p style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{isLoggedIn ? username : "Not logged in"}</p>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_ITEMS.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9,
                border: "1px solid transparent", color: "var(--muted)", fontWeight: 600, fontSize: "0.82rem",
                textDecoration: "none", transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(239,68,68,0.08)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#ef4444";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(239,68,68,0.2)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "transparent";
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
          Back to App
        </a>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px" }}>
        {/* Warning banner */}
        <div style={{
          marginBottom: 24, padding: "12px 16px", borderRadius: 12,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#ef4444" }}>warning</span>
          <p style={{ fontSize: "0.78rem", color: "var(--fg-2)" }}>
            <strong style={{ color: "#ef4444" }}>Admin Mode</strong> — Changes here affect all students. Proceed with care.
            {isLoggedIn ? ` Signed in as ${username}.` : " Log in to manage safely."}
          </p>
        </div>

        <main>{children}</main>
      </div>
    </div>
  );
}
