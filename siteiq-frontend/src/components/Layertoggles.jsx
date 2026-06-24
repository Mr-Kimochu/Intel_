/**
 * Vertical toggle strip that sits on the LEFT edge of the map pane.
 * Each button shows a coloured icon + label. Active = filled, inactive = ghost.
 */
const TOGGLES = [
  { key: "osmContext",      label: "OSM",      icon: "🗺️",  color: "#2f5d1f" },
  { key: "elevationBuffer", label: "Buffer",   icon: "⬤",  color: "#b5651d" },
  { key: "terrainProfile",  label: "Profile",  icon: "📈",  color: "#3a5fa0" },
];

export default function LayerToggles({ toggles, onToggle }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 10,
        zIndex: 800,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {TOGGLES.map(({ key, label, icon, color }) => {
        const active = toggles[key];
        return (
          <button
            key={key}
            title={label}
            onClick={() => onToggle(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 10px",
              borderRadius: 8,
              border: `1.5px solid ${active ? color : "#ccc"}`,
              background: active ? color : "rgba(255,253,247,0.92)",
              color: active ? "#fff" : "#5c6354",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              minWidth: 80,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}