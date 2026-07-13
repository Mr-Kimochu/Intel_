/**
 * Land cover breakdown + land use suitability recommendations.
 */
const SUITABILITY_COLORS = {
  residential:  "#374151",
  commercial:   "#1e40af",
  agriculture:  "#15803d",
  conservation: "#92400e",
};

function LcBar({ label, color, percent }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 11 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#111827" }}>
          {percent}%
        </span>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: 3, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, background: color, height: "100%", borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function SuitabilityRow({ use, key_, score, suitable }) {
  const color = SUITABILITY_COLORS[key_] ?? "#6b7280";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12,
    }}>
      <span style={{ color: "#374151" }}>{use}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 60, background: "#f3f4f6", borderRadius: 3, height: 5 }}>
          <div style={{ width: `${score * 10}%`, background: suitable ? color : "#d1d5db", height: "100%", borderRadius: 3 }} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          color: suitable ? color : "#9ca3af", minWidth: 30,
        }}>
          {suitable ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}

export default function LandCoverCard({ landCover, suitability }) {
  if (!landCover) return null;

  const topClasses = (landCover.classes ?? []).slice(0, 6);

  return (
    <>
      {/* Dominant class */}
      {landCover.dominant_label && (
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Dominant: {landCover.dominant_label}
        </p>
      )}

      {/* Class breakdown */}
      {topClasses.map((c, i) => (
        <LcBar key={i} label={c.label} color={c.color} percent={c.percent} />
      ))}

      <p style={{ margin: "6px 0 0", fontSize: 10, color: "#9ca3af" }}>
        {landCover.source} · {landCover.radius_m}m buffer
      </p>

      {/* Land use suitability */}
      {suitability && (
        <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Land use suitability</p>

          {suitability.ranked?.map((r, i) => (
            <SuitabilityRow key={i} use={r.use} key_={r.key} score={r.score} suitable={r.suitable} />
          ))}

          {suitability.factors?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {suitability.factors.map((f, i) => (
                <p key={i} style={{
                  margin: "4px 0", fontSize: 11, color: "#374151",
                  padding: "4px 8px", background: "#f9fafb",
                  borderRadius: 4, lineHeight: 1.4,
                }}>
                  · {f}
                </p>
              ))}
            </div>
          )}

          <p style={{ margin: "8px 0 0", fontSize: 10, color: "#9ca3af", lineHeight: 1.4 }}>
            {suitability.disclaimer}
          </p>
        </div>
      )}
    </>
  );
}