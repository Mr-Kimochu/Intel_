import { useState } from "react";
import ElevationProfileChart from "./ElevationProfileChart";

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function OsmRow({ icon, label, value, flag }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0", borderBottom: "1px solid #f0ede3", fontSize: 13,
    }}>
      <span style={{ color: "#5c6354" }}>{icon} {label}</span>
      <span style={{ fontWeight: 600, color: flag ? "#c0392b" : "#232620" }}>{value}</span>
    </div>
  );
}

export default function SitePanel({
  pin, elevation, terrain, osm, profile,
  loading, error, toggles,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Mobile sheet handle (no-op on desktop via CSS) ──
  const handleHandle = () => setSheetOpen((v) => !v);

  if (!pin) {
    return (
      <div className={`side-pane${sheetOpen ? " open" : ""}`}>
        <div className="sheet-handle" onClick={handleHandle} />
        <div className="panel placeholder">
          <p>Click anywhere on the map to analyze a site.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`side-pane${sheetOpen ? " open" : ""}`}>
        <div className="sheet-handle" onClick={handleHandle} />
        <div className="panel placeholder">
          <p>Reading the ground at {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`side-pane${sheetOpen ? " open" : ""}`}>
        <div className="sheet-handle" onClick={handleHandle} />
        <div className="panel error"><p>{error}</p></div>
      </div>
    );
  }

  const nearestWater = osm?.summary?.nearest_waterway_m;
  const floodFlag = nearestWater != null && nearestWater < 300;

  return (
    <div className={`side-pane${sheetOpen ? " open" : ""}`}>
      {/* ── Drag handle (visible on mobile only via CSS) ── */}
      <div className="sheet-handle" onClick={handleHandle} />

      {/* peek text shown in collapsed state on mobile */}
      {!sheetOpen && (
        <span className="sheet-peek-label">
          {elevation?.elevation_m != null ? `${elevation.elevation_m}m · ${terrain?.point?.slope_class ?? ""}` : "Tap for site data"}
        </span>
      )}

      <div className="panel">
        {/* ── Location ── */}
        <h2>{elevation?.place_name || "Selected site"}</h2>
        <p className="coords">{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</p>

        {/* ── Terrain stats ── */}
        <div className="stat-grid">
          <Stat label="Elevation" value={`${elevation?.elevation_m ?? "—"} m`} />
          <Stat label="Slope"     value={`${terrain?.point?.slope_deg?.toFixed(1) ?? "—"}°`} />
          <Stat label="Aspect"    value={`${terrain?.point?.aspect_deg?.toFixed(0) ?? "—"}°`} />
        </div>

        {terrain?.point?.slope_class && (
          <p className="callout">{terrain.point.slope_class}</p>
        )}

        {terrain?.site_buffer && (
          <div className="site-buffer">
            <h3>Within {terrain.site_buffer.radius_m}m</h3>
            <p>Elevation range: {terrain.site_buffer.elevation_min_m?.toFixed(0)}–{terrain.site_buffer.elevation_max_m?.toFixed(0)} m</p>
            <p>Avg slope: {terrain.site_buffer.slope_mean_deg?.toFixed(1)}°, max {terrain.site_buffer.slope_max_deg?.toFixed(1)}°</p>
          </div>
        )}

        {/* ── Terrain profile chart — above OSM block ── */}
        {profile && toggles.terrainProfile && (
          <ElevationProfileChart profile={profile} />
        )}

        {/* ── OSM context summary — only when toggle is on ── */}
        {osm && toggles.osmContext && (
          <div style={{ marginTop: 20, borderTop: "1px solid #d8d6c8", paddingTop: 14 }}>
            <p className="section-label">Context within {(osm.search_radius_m / 1000).toFixed(1)}km</p>

            <OsmRow icon="🛣️" label="Nearest road"
              value={osm.summary.nearest_road_m != null ? `${osm.summary.nearest_road_m}m` : "None found"} />
            <OsmRow icon="🌊" label="Nearest waterway"
              value={osm.summary.nearest_waterway_m != null ? `${osm.summary.nearest_waterway_m}m` : "None found"}
              flag={floodFlag} />
            <OsmRow icon="⚡" label="Grid power"
              value={osm.summary.grid_connected ? "Mapped nearby" : "None found"}
              flag={!osm.summary.grid_connected} />
            <OsmRow icon="🏫" label="Amenities"
              value={`${osm.summary.amenity_count} found`} />

            {floodFlag && (
              <p style={{
                margin: "10px 0 0", padding: "8px 12px",
                background: "#fff0ee", borderLeft: "3px solid #c0392b",
                borderRadius: "0 6px 6px 0", fontSize: 12, color: "#c0392b",
              }}>
                ⚠️ Waterway within 300m — indicative flood risk. Commission a hydrological assessment before site works.
              </p>
            )}

            {osm.roads.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="section-label">Nearest roads</p>
                {osm.roads.slice(0, 3).map((r, i) => (
                  <p key={i} style={{ margin: "3px 0", fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span style={{ color: "#5c6354" }}> · {r.type} · {r.distance_m}m</span>
                  </p>
                ))}
              </div>
            )}

            {osm.amenities.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p className="section-label">Nearby amenities</p>
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
    </div>
  );
}