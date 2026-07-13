import { useState } from "react";

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 12, height: 12,
      border: "2px solid #e5e7eb", borderTopColor: "#374151",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

export default function Section({
  title, summary, loading, loadingText,
  defaultOpen, error, children,
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div style={{ borderTop: "1px solid #e5e7eb" }}>
      <div
        onClick={() => !loading && setOpen(v => !v)}
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "11px 0",
          cursor: loading ? "default" : "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
            {title}
          </span>
          {!open && !loading && summary && (
            <span style={{
              fontSize: 11, color: "#6b7280",
              marginLeft: 8, whiteSpace: "nowrap",
            }}>
              {summary}
            </span>
          )}
          {error && !open && (
            <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 8 }}>
              unavailable
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {loading && <Spinner />}
          {!loading && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d={open ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"}
                stroke="#9ca3af" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {open && (
        <div style={{ paddingBottom: 16 }}>
          {loading
            ? <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{loadingText || "Loading…"}</p>
            : error
            ? <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>Data unavailable for this location.</p>
            : children
          }
        </div>
      )}
    </div>
  );
}