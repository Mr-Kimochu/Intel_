import { useState, useRef, useEffect } from "react";

const LAYERS = [
  { key: "osmContext",      label: "OSM Context",        description: "Roads, waterways, amenities" },
  { key: "elevationBuffer", label: "Elevation Buffer",    description: "Site analysis radius" },
  { key: "terrainProfile",  label: "Terrain Profile",     description: "N–S / E–W transect arms" },
  { key: "contours",        label: "Elevation Contours",  description: "DEM-derived contour lines (brown)" },
];

export default function LayersMenu({ toggles, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: open ? "rgba(255,255,255,0.18)" : "transparent",
          border: "1px solid rgba(255,255,255,0.30)",
          borderRadius: 6,
          color: "#fff",
          fontSize: 13,
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        Layers
        {activeCount > 0 && (
          <span style={{
            background: "rgba(255,255,255,0.25)",
            borderRadius: 10,
            fontSize: 11,
            padding: "1px 6px",
            fontWeight: 600,
          }}>
            {activeCount}
          </span>
        )}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d={open ? "M9 5L5 1L1 5" : "M1 1L5 5L9 1"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          minWidth: 230,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          zIndex: 2000,
          overflow: "hidden",
        }}>
          <p style={{
            margin: 0,
            padding: "10px 14px 8px",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#9ca3af",
            borderBottom: "1px solid #f3f4f6",
          }}>
            Map Layers
          </p>

          {LAYERS.map(({ key, label, description }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #f9fafb",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <input
                type="checkbox"
                checked={!!toggles[key]}
                onChange={() => onToggle(key)}
                style={{ width: 15, height: 15, accentColor: "#374151", cursor: "pointer", flexShrink: 0 }}
              />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{description}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}