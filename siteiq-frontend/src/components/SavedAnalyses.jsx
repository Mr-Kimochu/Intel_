import { useState, useEffect, useCallback } from "react";
import { getAuthHeader } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const RISK_COLORS = {
  high:         "#ef4444",
  "medium-high":"#f97316",
  medium:       "#f59e0b",
  low:          "#22c55e",
  unknown:      "#9ca3af",
};

function AnalysisRow({ analysis, onLoad, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const site     = analysis.sites ?? {};
  const riskLevel = analysis["flood_risk->risk->>level"] ?? "unknown";
  const elev      = analysis["terrain->point->>elevation_m"];

  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirm(`Delete analysis of "${site.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const headers = await getAuthHeader();
      await fetch(`${API_BASE}/analyses/${analysis.id}`, {
        method: "DELETE", headers,
      });
      onDelete(analysis.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={() => onLoad(analysis.id)}
      style={{
        padding: "12px 14px",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
        transition: "background 0.1s",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Site name */}
        <p style={{
          margin: "0 0 2px", fontSize: 13, fontWeight: 600,
          color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {site.name ?? "Unnamed Site"}
        </p>

        {/* Coordinates */}
        <p style={{ margin: "0 0 6px", fontSize: 10, color: "#9ca3af", fontFamily: "var(--font-mono)" }}>
          {site.lat?.toFixed(4)}, {site.lon?.toFixed(4)}
          {analysis.radius_m && ` · ${analysis.radius_m}m`}
        </p>

        {/* Key metrics row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {elev != null && (
            <span style={{ fontSize: 10, color: "#374151", background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>
              {Number(elev).toFixed(0)}m
            </span>
          )}
          {riskLevel !== "unknown" && (
            <span style={{
              fontSize: 10, color: "#fff", padding: "2px 6px", borderRadius: 4,
              background: RISK_COLORS[riskLevel] ?? "#9ca3af",
              textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              {riskLevel}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#9ca3af" }}>
            {new Date(analysis.created_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>

        {analysis.notes && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>
            {analysis.notes.length > 80 ? analysis.notes.slice(0, 80) + "…" : analysis.notes}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete analysis"
        style={{
          marginLeft: 8, flexShrink: 0,
          background: "none", border: "none",
          color: "#d1d5db", cursor: "pointer", fontSize: 14, padding: "2px 4px",
          borderRadius: 4,
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
        onMouseLeave={e => e.currentTarget.style.color = "#d1d5db"}
      >
        {deleting ? "…" : "✕"}
      </button>
    </div>
  );
}

export default function SavedAnalyses({ user, onLoadAnalysis }) {
  const [open,      setOpen]      = useState(false);
  const [analyses,  setAnalyses]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const resp    = await fetch(`${API_BASE}/analyses`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setAnalyses(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh list whenever drawer opens
  useEffect(() => {
    if (open) fetchAnalyses();
  }, [open, fetchAnalyses]);

  async function handleLoad(analysisId) {
    try {
      const headers = await getAuthHeader();
      const resp    = await fetch(`${API_BASE}/analyses/${analysisId}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      onLoadAnalysis(data);
      setOpen(false);
    } catch (e) {
      alert(`Could not load analysis: ${e.message}`);
    }
  }

  function handleDelete(deletedId) {
    setAnalyses(prev => prev.filter(a => a.id !== deletedId));
  }

  if (!user) return null;

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        title="My saved analyses"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.20)",
          borderRadius: 6, color: "#d1d5db", fontSize: 12,
          fontFamily: "var(--font-body)", cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        Saved
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 4000,
            background: "rgba(0,0,0,0.35)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: "min(380px, 100vw)",
              background: "#fff",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column",
              zIndex: 4001,
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 14px 12px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#1f2937",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                  Saved Analyses
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                  {analyses.length} {analyses.length === 1 ? "site" : "sites"} saved
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.10)", border: "none",
                  color: "#9ca3af", cursor: "pointer", borderRadius: 6,
                  padding: "4px 8px", fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading && (
                <p style={{ padding: 20, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                  Loading…
                </p>
              )}
              {error && (
                <p style={{ padding: 20, fontSize: 12, color: "#ef4444", textAlign: "center" }}>
                  {error}
                </p>
              )}
              {!loading && !error && analyses.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>📍</p>
                  <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    No saved analyses yet.<br />
                    Drop a pin, run an analysis, then click "Save this analysis".
                  </p>
                </div>
              )}
              {!loading && analyses.map(a => (
                <AnalysisRow
                  key={a.id}
                  analysis={a}
                  onLoad={handleLoad}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 14px", borderTop: "1px solid #e5e7eb",
              fontSize: 10, color: "#9ca3af", textAlign: "center",
            }}>
              Click an analysis to restore the full panel · All data is private to your account
            </div>
          </div>
        </div>
      )}
    </>
  );
}