// ── Toggle pill button ─────────────────────────────────────────────────────
function Toggle({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 20,
        border: `1.5px solid ${active ? color : "#d8d6c8"}`,
        background: active ? color + "18" : "transparent",
        color: active ? color : "#5c6354",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <span
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: active ? color : "#d8d6c8",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

// ── OSM summary row ────────────────────────────────────────────────────────
function OsmRow({ icon, label, value, flag }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f0ede3", fontSize: 13 }}>
      <span style={{ color: "#5c6354" }}>{icon} {label}</span>
      <span style={{ fontWeight: 600, color: flag ? "#c0392b" : "#232620" }}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SitePanel({ pin, elevation, terrain, osm, loading, error, toggles, onToggle }) {
  if (!pin) {
    return (
      <div className="panel placeholder">
        <p>Click anywhere on the map to analyze a site.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel placeholder">
        <p>Reading the ground at {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel error">
        <p>Could not fetch site data: {error}</p>
      </div>
    );
  }

  const nearestWater = osm?.summary?.nearest_waterway_m;
  const floodFlag = nearestWater !== null && nearestWater !== undefined && nearestWater < 300;

  return (
    <div className="panel">

      {/* ── Location ── */}
      <h2>{elevation?.place_name || "Selected site"}</h2>
      <p className="coords">{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</p>

      {/* ── Map layer toggles ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 16px" }}>
        <Toggle
          label="OSM Context"
          active={toggles.osmContext}
          color="#2f5d1f"
          onClick={() => onToggle("osmContext")}
        />
        <Toggle
          label="Elevation Buffer"
          active={toggles.elevationBuffer}
          color="#b5651d"
          onClick={() => onToggle("elevationBuffer")}
        />
        <Toggle
          label="Terrain Profile"
          active={toggles.terrainProfile}
          color="#3a5fa0"
          onClick={() => onToggle("terrainProfile")}
        />
      </div>

      {/* ── Terrain stats ── */}
      <div className="stat-grid">
        <Stat label="Elevation" value={`${elevation?.elevation_m ?? "—"} m`} />
        <Stat label="Slope" value={`${terrain?.point?.slope_deg?.toFixed(1) ?? "—"}°`} />
        <Stat label="Aspect" value={`${terrain?.point?.aspect_deg?.toFixed(0) ?? "—"}°`} />
      </div>

      {terrain?.point?.slope_class && (
        <p className="callout">{terrain.point.slope_class}</p>
      )}

      {terrain?.site_buffer && (
        <div className="site-buffer">
          <h3>Within {terrain.site_buffer.radius_m}m</h3>
          <p>Elevation range: {terrain.site_buffer.elevation_min_m?.toFixed(0)}–{terrain.site_buffer.elevation_max_m?.toFixed(0)} m</p>
          <p>Average slope: {terrain.site_buffer.slope_mean_deg?.toFixed(1)}°, max {terrain.site_buffer.slope_max_deg?.toFixed(1)}°</p>
        </div>
      )}

      {/* ── OSM context summary ── */}
      {osm && (
        <div style={{ marginTop: 20, borderTop: "1px solid #d8d6c8", paddingTop: 14 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: "#5c6354", margin: "0 0 8px" }}>
            Context within {(osm.search_radius_m / 1000).toFixed(1)}km
          </h3>

          <OsmRow
            icon="🛣️" label="Nearest road"
            value={osm.summary.nearest_road_m != null ? `${osm.summary.nearest_road_m}m` : "None found"}
          />
          <OsmRow
            icon="🌊" label="Nearest waterway"
            value={osm.summary.nearest_waterway_m != null ? `${osm.summary.nearest_waterway_m}m` : "None found"}
            flag={floodFlag}
          />
          <OsmRow
            icon="⚡" label="Grid power"
            value={osm.summary.grid_connected ? "Mapped nearby" : "None found"}
            flag={!osm.summary.grid_connected}
          />
          <OsmRow
            icon="🏫" label="Amenities"
            value={`${osm.summary.amenity_count} found`}
          />

          {floodFlag && (
            <p style={{ margin: "10px 0 0", padding: "8px 12px", background: "#fff0ee", borderLeft: "3px solid #c0392b", borderRadius: "0 6px 6px 0", fontSize: 12, color: "#c0392b" }}>
              ⚠️ Waterway within 300m — indicative flood risk. Commission a hydrological assessment before site works.
            </p>
          )}

          {/* nearest road detail */}
          {osm.roads.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "#5c6354", margin: "0 0 4px" }}>Nearest roads</p>
              {osm.roads.slice(0, 3).map((r, i) => (
                <p key={i} style={{ margin: "3px 0", fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <span style={{ color: "#5c6354" }}> · {r.type} · {r.distance_m}m</span>
                </p>
              ))}
            </div>
          )}

          {/* nearest amenities */}
          {osm.amenities.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "#5c6354", margin: "0 0 4px" }}>Nearby amenities</p>
              {osm.amenities.slice(0, 5).map((a, i) => (
                <p key={i} style={{ margin: "3px 0", fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span style={{ color: "#5c6354" }}> · {a.amenity} · {a.distance_m}m</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}