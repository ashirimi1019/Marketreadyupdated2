"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The Career Hub / Onboarding page has been consolidated into the Profile page.
 * This page redirects users to the Career Path tab of the Profile page.
 */
export default function StudentOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/profile?tab=career");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid rgba(124,58,237,0.2)",
          borderTop: "3px solid #7c3aed",
          animation: "spin 1s linear infinite",
          margin: "0 auto 12px",
        }} />
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Redirecting to Career Path…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
