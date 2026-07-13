import { ImageOverlay } from "react-leaflet";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const SOIL_LAYERS = [
  { key: "clay", label: "Clay %",   palette: ["#fffde7","#f9a825","#e65100","#b71c1c","#4a148c"], min: "0",  max: "60%" },
  { key: "sand", label: "Sand %",   palette: ["#e8f5e9","#a5d6a7","#388e3c","#1b5e20","#0d2b0f"], min: "0",  max: "80%" },
  { key: "ph",   label: "pH",       palette: ["#b71c1c","#ef9a9a","#fff9c4","#a5d6a7","#1565c0"], min: "4",  max: "9"   },
  { key: "oc",   label: "Org. C %", palette: ["#fff8e1","#ffe082","#ffb300","#e65100","#1a0a00"], min: "0",  max: "10%" },
];

function bufferBounds(lat, lon, radiusM) {
  const R    = 6371000;
  const dlat = (radiusM / R) * (180 / Math.PI);
  const dlon = dlat / Math.cos((lat * Math.PI) / 180);
  return [[lat - dlat, lon - dlon], [lat + dlat, lon + dlon]];
}

// ── Must be rendered INSIDE <MapContainer> ────────────────────────────────
export function SoilImageLayer({ pin, radiusM, layer }) {
  if (!pin || !layer) return null;
  const bounds = bufferBounds(pin.lat, pin.lon, radiusM);
  const url    = `${API_BASE}/soil-tile?lat=${pin.lat}&lon=${pin.lon}&radius_m=${radiusM}&layer=${layer}`;
  return <ImageOverlay url={url} bounds={bounds} opacity={0.7} zIndex={300} />;
}

// ── Plain div — rendered OUTSIDE <MapContainer> ───────────────────────────
export function SoilControls({ layer, onLayerChange }) {
  const meta = SOIL_LAYERS.find(l => l.key === layer);

  return (
    <>
      {/* Mini legend — bottom-left */}
      {meta && (
        <div style={{
          position: "absolute", bottom: 32, left: 10, zIndex: 500,
          background: "rgba(255,255,255,0.94)", border: "1px solid #e5e7eb",
          borderRadius: 6, padding: "7px 10px", minWidth: 120,
          boxShadow: "0 1px 4px rgba(0,0,0,0.09)", pointerEvents: "none",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "#374151" }}>
            Soil · {meta.label}
          </p>
          <div style={{ display: "flex", height: 10, borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
            {meta.palette.map((c, i) => (
              <div key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9ca3af" }}>
            <span>{meta.min}</span><span>{meta.max}</span>
          </div>
        </div>
      )}

      {/* Layer switcher — top-right, below location button */}
      <div style={{
        position: "absolute", top: 110, right: 10, zIndex: 800,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {SOIL_LAYERS.map(l => (
          <button
            key={l.key}
            onClick={() => onLayerChange(l.key)}
            style={{
              padding: "5px 10px", fontSize: 11,
              fontFamily: "var(--font-body)", fontWeight: 500,
              background: layer === l.key ? "#1f2937" : "rgba(255,255,255,0.93)",
              color:      layer === l.key ? "#fff"    : "#374151",
              border: "1px solid #e5e7eb", borderRadius: 6,
              cursor: "pointer", backdropFilter: "blur(4px)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.09)",
              transition: "all 0.12s",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </>
  );
}