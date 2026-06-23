import { Polyline, CircleMarker, Tooltip } from "react-leaflet";

// ── colour scheme ──────────────────────────────────────────────────────────
const ROAD_COLORS = {
  "major road":     "#e07b39",
  "secondary road": "#d4a93c",
  "local road":     "#9e9e7a",
  "track / path":   "#b0a898",
};

const WATERWAY_COLOR = "#3a8fc7";

const AMENITY_COLORS = {
  education: "#7b52ab",
  health:    "#c0392b",
  emergency: "#e74c3c",
  commerce:  "#2ecc71",
};

// ── sub-components ─────────────────────────────────────────────────────────
function RoadLayer({ roads }) {
  return roads.map((road, i) => {
    const color = ROAD_COLORS[road.type] || "#888";
    const positions = road.geometry.map((p) => [p.lat, p.lon]);
    if (positions.length < 2) return null;
    return (
      <Polyline key={`road-${i}`} positions={positions} color={color} weight={3} opacity={0.8}>
        <Tooltip sticky>
          <strong>{road.name}</strong>
          <br />
          {road.type} · {road.distance_m}m away
        </Tooltip>
      </Polyline>
    );
  });
}

function WaterwayLayer({ waterways }) {
  return waterways.map((ww, i) => {
    const positions = ww.geometry.map((p) => [p.lat, p.lon]);
    if (positions.length < 2) return null;
    return (
      <Polyline
        key={`ww-${i}`}
        positions={positions}
        color={WATERWAY_COLOR}
        weight={2.5}
        opacity={0.85}
        dashArray="6 3"
      >
        <Tooltip sticky>
          <strong>{ww.name}</strong>
          <br />
          {ww.type} · {ww.distance_m}m away
        </Tooltip>
      </Polyline>
    );
  });
}

function AmenityLayer({ amenities }) {
  return amenities.map((a, i) => {
    const color = AMENITY_COLORS[a.group] || "#555";
    return (
      <CircleMarker
        key={`am-${i}`}
        center={[a.lat, a.lon]}
        radius={7}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1.5 }}
      >
        <Tooltip>
          <strong>{a.name}</strong>
          <br />
          {a.amenity} · {a.distance_m}m away
        </Tooltip>
      </CircleMarker>
    );
  });
}

function PowerLayer({ power }) {
  return power.map((p, i) => (
    <CircleMarker
      key={`pw-${i}`}
      center={[p.lat, p.lon]}
      radius={5}
      pathOptions={{ color: "#f5c518", fillColor: "#f5c518", fillOpacity: 0.9, weight: 1.5 }}
    >
      <Tooltip>
        <strong>{p.type}</strong>
        {p.voltage && <><br />Voltage: {p.voltage}</>}
        <br />
        {p.distance_m}m away
      </Tooltip>
    </CircleMarker>
  ));
}

// ── Legend ─────────────────────────────────────────────────────────────────
function LegendItem({ color, label, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <svg width="24" height="10">
        <line
          x1="0" y1="5" x2="24" y2="5"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={dashed ? "5 3" : undefined}
        />
      </svg>
      <span style={{ fontSize: 11 }}>{label}</span>
    </div>
  );
}

function DotItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <svg width="14" height="14">
        <circle cx="7" cy="7" r="5" fill={color} />
      </svg>
      <span style={{ fontSize: 11 }}>{label}</span>
    </div>
  );
}

export function OsmLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: 12,
        zIndex: 1000,
        background: "rgba(255,253,247,0.95)",
        border: "1px solid #d8d6c8",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 160,
        pointerEvents: "none",
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#5c6354" }}>
        Context layers
      </p>
      <LegendItem color="#e07b39" label="Major road" />
      <LegendItem color="#d4a93c" label="Secondary road" />
      <LegendItem color="#9e9e7a" label="Local road" />
      <LegendItem color="#3a8fc7" label="Waterway" dashed />
      <DotItem color="#7b52ab" label="Education" />
      <DotItem color="#c0392b" label="Health" />
      <DotItem color="#e74c3c" label="Emergency" />
      <DotItem color="#f5c518" label="Power" />
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function OsmOverlay({ osm }) {
  if (!osm) return null;
  return (
    <>
      <RoadLayer roads={osm.roads} />
      <WaterwayLayer waterways={osm.waterways} />
      <AmenityLayer amenities={osm.amenities} />
      <PowerLayer power={osm.power} />
    </>
  );
}
