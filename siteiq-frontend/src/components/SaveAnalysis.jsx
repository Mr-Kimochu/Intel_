import { useState } from "react";
import Modal from "./Modal";
import { getAuthHeader } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function SaveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

export default function SaveAnalysis({
  user, pin, elevation, terrain, floodRisk,
  soil, climateSolar, landCover, osm, extent,
}) {
  const [open,     setOpen]     = useState(false);
  const [siteName, setSiteName] = useState("");
  const [notes,    setNotes]    = useState("");
  const [status,   setStatus]   = useState("idle"); // idle | saving | saved | error
  const [savedId,  setSavedId]  = useState(null);
  const [errMsg,   setErrMsg]   = useState("");

  // Only show the button when signed in and an analysis exists
  if (!user || !pin || !elevation) return null;

  // Pre-fill site name from reverse geocode if available
  const defaultName = elevation?.place_name
    ? elevation.place_name.split(",").slice(0, 2).join(", ")
    : `${pin.lat.toFixed(4)}, ${pin.lon.toFixed(4)}`;

  function handleOpen() {
    setSiteName(defaultName);
    setNotes("");
    setStatus("idle");
    setErrMsg("");
    setSavedId(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!siteName.trim()) return;
    setStatus("saving");
    setErrMsg("");

    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/analyses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          site_name:    siteName.trim(),
          notes:        notes.trim() || null,
          lat:          pin.lat,
          lon:          pin.lon,
          radius_m:     extent,
          elevation,
          terrain,
          flood_risk:   floodRisk,
          soil,
          climate_solar: climateSolar,
          land_cover:   landCover,
          osm_context:  osm,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setSavedId(data.analysis_id);
      setStatus("saved");
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 12px", marginTop: 10,
          background: "#1f2937", color: "#fff",
          border: "none", borderRadius: 7,
          fontSize: 12, fontFamily: "var(--font-body)", fontWeight: 500,
          cursor: "pointer", width: "100%",
          justifyContent: "center",
        }}
      >
        <SaveIcon /> Save this analysis
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Save Analysis">
        {status === "saved" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>✅</p>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              Saved as "{siteName}"
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
              You can reload this analysis any time from your saved sites.
            </p>
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: "8px 20px", background: "#1f2937", color: "#fff",
                border: "none", borderRadius: 7, cursor: "pointer",
                fontSize: 13, fontFamily: "var(--font-body)",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                Site name *
              </label>
              <input
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                placeholder="e.g. Wundanyi Plot, Nairobi Site A"
                style={{
                  width: "100%", padding: "8px 10px",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  fontSize: 13, fontFamily: "var(--font-body)", outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any observations, next steps, or context…"
                rows={3}
                style={{
                  width: "100%", padding: "8px 10px",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  fontSize: 13, fontFamily: "var(--font-body)",
                  resize: "vertical", outline: "none",
                }}
              />
            </div>

            {/* Summary of what gets saved */}
            <div style={{
              background: "#f9fafb", borderRadius: 6, padding: "10px 12px",
              fontSize: 11, color: "#6b7280", lineHeight: 1.6,
              border: "1px solid #e5e7eb",
            }}>
              Saving: {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)} · {extent}m radius
              {elevation?.elevation_m != null && ` · ${elevation.elevation_m}m elevation`}
              {floodRisk?.risk?.level && ` · ${floodRisk.risk.level} flood risk`}
            </div>

            {errMsg && (
              <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>
                Save failed: {errMsg}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={!siteName.trim() || status === "saving"}
                style={{
                  flex: 1, padding: "9px",
                  background: siteName.trim() ? "#1f2937" : "#9ca3af",
                  color: "#fff", border: "none", borderRadius: 7,
                  fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500,
                  cursor: siteName.trim() ? "pointer" : "default",
                }}
              >
                {status === "saving" ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "9px 16px", background: "#f3f4f6", color: "#374151",
                  border: "1px solid #e5e7eb", borderRadius: 7,
                  fontSize: 13, fontFamily: "var(--font-body)", cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}