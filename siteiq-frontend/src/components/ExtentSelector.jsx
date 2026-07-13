const PRESETS = [
  { label: "200m",  value: 200  },
  { label: "500m",  value: 500  },
  { label: "1km",   value: 1000 },
  { label: "2km",   value: 2000 },
  { label: "5km",   value: 5000 },
];

export default function ExtentSelector({ value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p className="section-label" style={{ marginBottom: 6 }}>Analysis radius</p>
      <div style={{ display: "flex", gap: 4 }}>
        {PRESETS.map(({ label, value: v }) => {
          const active = value === v;
          return (
            <button key={v} onClick={() => onChange(v)} style={{
              flex: 1, padding: "5px 0", fontSize: 11,
              fontFamily: "var(--font-body)", fontWeight: active ? 600 : 400,
              background: active ? "#1f2937" : "#f3f4f6",
              color: active ? "#fff" : "#6b7280",
              border: `1px solid ${active ? "#1f2937" : "#e5e7eb"}`,
              borderRadius: 6, cursor: "pointer", transition: "all 0.12s",
            }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}