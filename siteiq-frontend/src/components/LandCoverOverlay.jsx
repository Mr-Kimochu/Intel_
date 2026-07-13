import { ImageOverlay } from "react-leaflet";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const ESA_LEGEND = [
  { color: "#006400", label: "Tree cover"       },
  { color: "#ffbb22", label: "Shrubland"         },
  { color: "#ffff4c", label: "Grassland"         },
  { color: "#f096ff", label: "Cropland"          },
  { color: "#fa0000", label: "Built-up"          },
  { color: "#b4b4b4", label: "Bare ground"       },
  { color: "#0064c8", label: "Water"             },
  { color: "#0096a0", label: "Wetland"           },
];

function bufferBounds(lat, lon, radiusM) {
  const R    = 6371000;
  const dlat = (radiusM / R) * (180 / Math.PI);
  const dlon = dlat / Math.cos((lat * Math.PI) / 180);
  return [[lat - dlat, lon - dlon], [lat + dlat, lon + dlon]];
}

export default function LandCoverOverlay({ pin, radiusM }) {
  if (!pin) return null;
  const bounds = bufferBounds(pin.lat, pin.lon, radiusM);
  const url    = `${API_BASE}/land-cover-tile?lat=${pin.lat}&lon=${pin.lon}&radius_m=${radiusM}`;

  return (
    <>
      <ImageOverlay url={url} bounds={bounds} opacity={0.65} zIndex={290} />
      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 10, left: 10, zIndex: 500,
        background: "rgba(255,255,255,0.93)", border: "1px solid #e5e7eb",
        borderRadius: 6, padding: "8px 10px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)", pointerEvents: "none",
      }}>
        <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 600, color: "#374151" }}>
          ESA WorldCover
        </p>
        {ESA_LEGEND.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "#374151" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}