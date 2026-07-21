import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 12, height: 12,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff", borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

async function downloadPdf(url, filename) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status}`);
  const blob = await resp.blob();
  const link = document.createElement("a");
  link.href  = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ExportButton({ pin, radiusM, floodRisk, soil, climateSolar, user }) {
  const [open,    setOpen]    = useState(false);
  const [title,   setTitle]   = useState("Site Intelligence Report");
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);

  if (!pin) return null;

  const safeName = `${pin.lat.toFixed(4)}_${pin.lon.toFixed(4)}`;

  async function handleTopo() {
    setLoading("topo"); setError(null);
    try {
      const url = `${API_BASE}/topo-pdf?lat=${pin.lat}&lon=${pin.lon}&radius_m=${radiusM}&title=${encodeURIComponent(title)}`;
      await downloadPdf(url, `topo_${safeName}.pdf`);
    } catch (e) { setError(`Topo failed: ${e.message}`); }
    finally { setLoading(null); }
  }

  async function handleReport() {
    setLoading("report"); setError(null);
    try {
      const resp = await fetch(`${API_BASE}/site-report-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pin.lat, lon: pin.lon, radius_m: radiusM, title,
          flood_risk:    floodRisk    ?? null,
          soil:          soil         ?? null,
          climate_solar: climateSolar ?? null,
        }),
      });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const blob = await resp.blob();
      const link = document.createElement("a");
      link.href  = URL.createObjectURL(blob);
      link.download = `site_report_${safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) { setError(`Report failed: ${e.message}`); }
    finally { setLoading(null); }
  }

  const btnStyle = (color, disabled) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
    background: disabled ? "#9ca3af" : color, color: "#fff",
    border: "none", borderRadius: 7, fontSize: 12,
    fontFamily: "var(--font-body)", fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
    width: "100%", textAlign: "left",
  });

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
      <p className="section-label">Export</p>

      {!open ? (
        <button onClick={() => setOpen(true)} style={btnStyle("#1f2937", false)}>
          <DownloadIcon /> Export Options
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{
            padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 6,
            fontSize: 13, fontFamily: "var(--font-body)", outline: "none", width: "100%",
          }} />

          <button onClick={handleTopo} disabled={!!loading} style={btnStyle("#1f2937", !!loading)}>
            {loading === "topo" ? <Spinner /> : <DownloadIcon />}
            <div>
              <div>Topographic Map PDF</div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>
                1 page · contours, OSM, scale bar, north arrow
              </div>
            </div>
          </button>

          {user ? (
            <button onClick={handleReport} disabled={!!loading} style={btnStyle("#374151", !!loading)}>
              {loading === "report" ? <Spinner /> : <DownloadIcon />}
              <div>
                <div>Full Site Report PDF</div>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>
                  4 pages · topo + terrain + flood/soil + climate/solar
                </div>
              </div>
            </button>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", background: "#f9fafb",
              border: "1px dashed #e5e7eb", borderRadius: 7,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>Full Site Report PDF</p>
                <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>Sign in to unlock · 4 pages</p>
              </div>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}

          <button onClick={() => { setOpen(false); setError(null); }} style={{
            padding: "7px", background: "#f3f4f6", color: "#6b7280",
            border: "1px solid #e5e7eb", borderRadius: 6,
            fontSize: 12, fontFamily: "var(--font-body)", cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}