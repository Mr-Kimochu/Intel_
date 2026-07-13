function SoilStat({ label, value, unit, warn }) {
  return (
    <div style={{
      background: warn ? "#fff7ed" : "#f9fafb",
      border: `1px solid ${warn ? "#fed7aa" : "#e5e7eb"}`,
      borderRadius: 7, padding: "8px 10px",
    }}>
      <span style={{
        display: "block", fontSize: 10, color: "#6b7280",
        textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500,
      }}>
        {label}
      </span>
      <span style={{
        display: "block", fontFamily: "var(--font-mono)",
        fontSize: 17, fontWeight: 600, color: "#111827", marginTop: 2,
      }}>
        {value != null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

function Flag({ text, color }) {
  return (
    <p style={{
      margin: "6px 0 0", padding: "7px 10px",
      background: color + "12",
      borderLeft: `3px solid ${color}`,
      borderRadius: "0 6px 6px 0",
      fontSize: 12, color: "#374151", lineHeight: 1.5,
    }}>
      {text}
    </p>
  );
}

export default function SoilCard({ soil }) {
  if (!soil) return null;

  const props   = soil.properties ?? {};
  const texture = soil.texture    ?? {};
  const flags   = soil.flags      ?? {};

  const riskColor = texture.risk_color ?? "#9ca3af";

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
      <p className="section-label">Soil Properties</p>

      {/* Texture class + risk badge */}
      {texture.class_name && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px",
          borderLeft: `4px solid ${riskColor}`,
          background: "#f9fafb",
          borderRadius: "0 8px 8px 0",
          marginBottom: 10,
        }}>
          
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
            {texture.class_name}
          </span>
        </div>
      )}

      {/* Four stat boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <SoilStat label="Clay" value={props.clay_pct} unit="%" warn={props.clay_pct > 40} />
        <SoilStat label="Sand" value={props.sand_pct} unit="%" />
        <SoilStat label="pH"   value={props.ph}       unit=""  warn={props.ph != null && (props.ph < 5.5 || props.ph > 8.5)} />
        <SoilStat label="Org. Carbon" value={props.oc_pct} unit="%" warn={props.oc_pct > 3} />
      </div>

      {/* Texture interpretation */}
      {texture.note && (
        <Flag text={texture.note} color={riskColor} />
      )}

      {/* pH flag */}
      {flags.ph_note && (
        <Flag text={flags.ph_note} color={props.ph < 6.5 ? "#f59e0b" : "#6b7280"} />
      )}

      {/* High OC flag */}
      {flags.high_oc && (
        <Flag
          text="Organic carbon > 3% — soil may be compressible under load. Assess settlement risk."
          color="#f59e0b"
        />
      )}

      <p style={{ margin: "10px 0 0", fontSize: 10, color: "#9ca3af", lineHeight: 1.5 }}>
        Source: iSDAsoil (30m, 0–20cm depth). Remote-sensing derived —
        not a substitute for a site investigation.
      </p>
    </div>
  );
}