import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Wraps any feature that requires a signed-in account.
 * When user is null, renders the children with a frosted overlay
 * and a "Sign in to unlock" prompt instead of hiding them entirely.
 * This lets anonymous users see what they're missing before signing up.
 *
 * Usage:
 *   <GatedFeature user={user} label="Save analyses">
 *     <SaveAnalysis ... />
 *   </GatedFeature>
 */
export default function GatedFeature({ user, label = "this feature", children, inline = false }) {
  const [loading, setLoading] = useState(false);

  // If signed in, render children normally
  if (user) return <>{children}</>;

  async function handleSignIn() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  if (inline) {
    // Compact inline lock — for use inside small cards or rows
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", background: "#f9fafb",
        border: "1px solid #e5e7eb", borderRadius: 7,
        fontSize: 12, color: "#6b7280",
      }}>
        <span>🔒 Sign in to {label}</span>
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            padding: "4px 10px", fontSize: 11,
            background: "#1f2937", color: "#fff",
            border: "none", borderRadius: 5, cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          {loading ? "…" : "Sign in"}
        </button>
      </div>
    );
  }

  // Full overlay — wraps children with a blur and prompt on top
  return (
    <div style={{ position: "relative" }}>
      {/* Blurred preview of the feature */}
      <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
        {children}
      </div>

      {/* Overlay prompt */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.7)",
        borderRadius: 8, gap: 8,
      }}>
        <span style={{ fontSize: 12, color: "#374151", fontWeight: 500, textAlign: "center" }}>
          Sign in to unlock {label}
        </span>
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", fontSize: 12,
            background: "#1f2937", color: "#fff",
            border: "none", borderRadius: 6,
            cursor: loading ? "default" : "pointer",
            fontFamily: "var(--font-body)", fontWeight: 500,
          }}
        >
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}