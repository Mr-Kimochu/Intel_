import { useState } from "react";
import { supabase } from "../lib/supabase";

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthButton({ user, onSignOut }) {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
  setLoading(true);
  const redirectTo = import.meta.env.VITE_APP_URL || window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) {
    console.error("Sign in error:", error.message);
    setLoading(false);
  }
}

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignOut?.();
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.full_name ?? "User"}
            style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.35)",
              objectFit: "cover",
            }}
          />
        )}
        <span style={{ fontSize: 12, color: "#d1d5db", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.user_metadata?.full_name?.split(" ")[0] ?? user.email}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            padding: "4px 10px", fontSize: 11,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.20)",
            borderRadius: 5, color: "#d1d5db",
            cursor: "pointer", fontFamily: "var(--font-body)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.20)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.10)"}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "6px 12px",
        background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 6, color: "#fff", fontSize: 12,
        fontFamily: "var(--font-body)", fontWeight: 500,
        cursor: loading ? "default" : "pointer",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => !loading && (e.currentTarget.style.background = "rgba(255,255,255,0.20)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
    >
      <GoogleIcon />
      {loading ? "Redirecting…" : "Sign in"}
    </button>
  );
}