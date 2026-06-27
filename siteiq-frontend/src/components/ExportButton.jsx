import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function ExportButton({ pin, radiusM }) {
  const [title, setTitle] = useState("Site Topographic Map");
  const [open,  setOpen]  = useState(false);

  if (!pin) return null;

  const url = `${API_BASE}/topo-pdf?lat=${pin.lat}&lon=${pin.lon}&radius_m=${radiusM}&title=${encodeURIComponent(title)}`;

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
      <p className="section-label">Export</p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            padding: "9px",
            background: "#1f2937",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Topo Map (PDF)
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, color: "#6b7280" }}>Map title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              padding: "7px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "var(--font-body)",
              outline: "none",
              width: "100%",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                padding: "8px",
                background: "#1f2937",
                color: "#fff",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Download PDF
            </a>
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: "8px 12px",
                background: "#f3f4f6",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>
            Includes contours, OSM context, scale bar, and north arrow.
            Analysis radius: {radiusM}m.
          </p>
        </div>
      )}
    </div>
  );
}