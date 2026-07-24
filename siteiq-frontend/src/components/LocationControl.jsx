import { useState } from "react";
import LocationSearch from "./LocationSearch";

const STATES = {
  idle:    { label: "Use my location", icon: "⊕" },
  loading: { label: "Locating…",        icon: "…" },
  error:   { label: "Location denied",  icon: "✕" },
};

export default function LocationControl({ onLocate }) {
  const [state, setState] = useState("idle");
  const [errMsg, setErrMsg] = useState("");

  function handleClick() {
    if (!("geolocation" in navigator)) {
      setState("error");
      setErrMsg("Geolocation not supported by this browser.");
      return;
    }

    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState("idle");
        onLocate(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setState("error");
        const messages = {
          1: "Location permission denied. Please allow access in your browser settings.",
          2: "Location unavailable. Check your device GPS.",
          3: "Location request timed out. Try again.",
        };
        setErrMsg(messages[err.code] || "Unknown location error.");
        // reset after 4s so user can retry
        setTimeout(() => setState("idle"), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  const { label, icon } = STATES[state];

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 800,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        title={label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.95)",
          border: `1px solid ${state === "error" ? "#ef4444" : "#e5e7eb"}`,
          borderRadius: 8,
          fontSize: 12,
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          color: state === "error" ? "#ef4444" : "#1f2937",
          cursor: state === "loading" ? "default" : "pointer",
          boxShadow: "0 1px 6px rgba(0,0,0,0.10)",
          backdropFilter: "blur(4px)",
          transition: "all 0.15s",
          opacity: state === "loading" ? 0.7 : 1,
        }}
      >
        {/* crosshair SVG */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2"  x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2"  y1="12" x2="6"  y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
        {label}
      </button>

      {/* helper text shown below map on mobile */}
      <p
        style={{
          margin: 0,
          padding: "5px 10px",
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          fontSize: 11,
          color: "#6b7280",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          backdropFilter: "blur(4px)",
          maxWidth: 200,
          textAlign: "right",
          lineHeight: 1.4,
        }}
      >
        {state === "error"
          ? errMsg
          : "Tap the map to drop a pin, or use your device location"}
      </p>

      {/* Search bar — sits below the tooltip in the same stack */}
      <div style={{ width: 220 }}>
        <LocationSearch onSelect={onLocate} variant="light" />
      </div>
    </div>
  );
}