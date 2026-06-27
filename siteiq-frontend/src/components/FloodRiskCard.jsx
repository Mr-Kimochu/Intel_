const LEVEL_CONFIG = {
  high:          { border: "#ef4444", badge: "#ef4444", icon: "▲" },
  "medium-high": { border: "#f97316", badge: "#f97316", icon: "▲" },
  medium:        { border: "#f59e0b", badge: "#f59e0b", icon: "◆" },
  low:           { border: "#22c55e", badge: "#22c55e", icon: "●" },
  unknown:       { border: "#9ca3af", badge: "#6b7280", icon: "?" },
};

function Row({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "5px 0",
      borderBottom: "1px solid #f3f4f6",
      fontSize: 12,
    }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong style={{ color: "#111827", fontFamily: "var(--font-mono)" }}>
        {value != null ? value : "—"}
      </strong>
    </div>
  );
}

// Show a clear "waiting" state if data hasn't arrived yets
function EmptyCard() {
  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
      <p className="section-label">Flood Risk</p>
      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Computing…</p>
    </div>
  );
}

export default function FloodRiskCard({ floodRisk }) {
  if (!floodRisk) return <EmptyCard />;

  // Safely unpack each nested object
  const risk   = floodRisk.risk   ?? {};
  const inputs = floodRisk.inputs ?? {};
  const hand   = floodRisk.hand   ?? {};

  const level       = risk.level       ?? "unknown";
  const label       = risk.label       ?? "Risk level unavailable";
  const description = risk.description ?? "";
  const color       = risk.color       ?? "#6b7280";
  const cfg         = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.unknown;

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
      <p className="section-label">Flood Risk</p>

      {/* ── Level row ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderLeft: `4px solid ${cfg.border}`,
        background: "#f9fafb",
        borderRadius: "0 8px 8px 0",
        marginBottom: 10,
      }}>
        {/* Coloured badge */}
        <span style={{
          background: cfg.badge,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "3px 10px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {cfg.icon} {level}
        </span>

        {/* Label — always dark so it's visible */}
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#111827",
          lineHeight: 1.3,
        }}>
          {label}
        </span>
      </div>

      {/* ── Description — always dark text ── */}
      {description ? (
        <p style={{
          margin: "0 0 12px",
          fontSize: 12,
          color: "#374151",
          lineHeight: 1.6,
          padding: "8px 10px",
          background: "#f9fafb",
          borderRadius: 6,
          border: "1px solid #e5e7eb",
        }}>
          {description}
        </p>
      ) : null}

      {/* ── Input values that drove the score ── */}
      <Row
        label="Height above drainage (HAND)"
        value={inputs.hand_m != null ? `${Number(inputs.hand_m).toFixed(1)} m` : null}
      />
      <Row
        label="Min HAND in buffer"
        value={hand.buffer_min_m != null ? `${Number(hand.buffer_min_m).toFixed(1)} m` : null}
      />
      <Row
        label="Site slope"
        value={inputs.slope_deg != null ? `${Number(inputs.slope_deg).toFixed(1)}°` : null}
      />
      <Row
        label="Nearest waterway"
        value={inputs.waterway_dist_m != null ? `${inputs.waterway_dist_m} m` : null}
      />

      {/* ── Disclaimer ── */}
      <p style={{
        margin: "10px 0 0",
        fontSize: 10,
        color: "#9ca3af",
        lineHeight: 1.5,
      }}>
        Based on MERIT Hydro HAND model at 90m resolution.
        Indicative screening only — not a certified flood assessment.
      </p>
    </div>
  );
}