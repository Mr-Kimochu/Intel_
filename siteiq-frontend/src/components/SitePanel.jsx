import { useState } from "react";
import ElevationProfileChart from "./ElevationProfileChart";
import FloodRiskCard from "./FloodRiskCard";
import ExtentSelector from "./ExtentSelector";
import ExportButton from "./ExportButton";

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function OsmRow({ label, value, flag }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13,
    }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600, color: flag ? "#ef4444" : "#111827" }}>{value}</span>
    </div>
  );
}

export default function SitePanel({
  pin, elevation, terrain, osm, profile, floodRisk,
  loading, error, toggles, extent, onExtentChange,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const wrap = (children) => (
    <div className={`side-pane${sheetOpen ? " open" : ""}`}>
      <div className="sheet-handle" onClick={() => setSheetOpen(v => !v)} />
      {children}
    </div>
  );

  if (!pin) return wrap(
    <div className="panel placeholder">
      <p>Click anywhere on the map to analyze a site.</p>
    </div>
  );

  if (loading) return wrap(
    <div className="panel placeholder">
      <p>Analyzing {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}…</p>
    </div>
  );

  if (error) return wrap(
    <div className="panel error"><p>{error}</p></div>
  );

  const nearestWater = osm?.summary?.nearest_waterway_m;
  const floodFlag    = nearestWater != null && nearestWater < 300;

  return wrap(
    <>
      {/* Mobile peek strip */}
      {!sheetOpen && (
        <span className="sheet-peek-label">
          {elevation?.elevation_m != null
            ? `${elevation.elevation_m}m · ${terrain?.point?.slope_class ?? ""}`
            : "Tap for site data"}
        </span>
      )}

      <div className="panel">

        {/* ── Location ── */}
        <h2>{elevation?.place_name || "Selected site"}</h2>
        <p className="coords">{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</p>

        {/* ── Extent selector ── */}
        <ExtentSelector value={extent} onChange={onExtentChange} />

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
            <p>
              Elevation range: {terrain.site_buffer.elevation_min_m?.toFixed(0)}–
              {terrain.site_buffer.elevation_max_m?.toFixed(0)} m
            </p>
            <p>
              Avg slope: {terrain.site_buffer.slope_mean_deg?.toFixed(1)}°,
              max {terrain.site_buffer.slope_max_deg?.toFixed(1)}°
            </p>
          </div>
        )}

        {/* ── Terrain profile chart ── */}
        {profile && toggles.terrainProfile && (
          <ElevationProfileChart profile={profile} />
        )}

        {/* ── Flood risk ── */}
        <FloodRiskCard floodRisk={floodRisk} />

        {/* ── OSM context ── */}
        {osm && toggles.osmContext && (
          <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
            <p className="section-label">
              Context within {(osm.search_radius_m / 1000).toFixed(1)}km
            </p>

            <OsmRow
              label="Nearest road"
              value={osm.summary.nearest_road_m != null
                ? `${osm.summary.nearest_road_m}m` : "None found"}
            />
            <OsmRow
              label="Nearest waterway"
              value={nearestWater != null ? `${nearestWater}m` : "None found"}
              flag={floodFlag}
            />
            <OsmRow
              label="Grid power"
              value={osm.summary.grid_connected ? "Mapped nearby" : "None found"}
              flag={!osm.summary.grid_connected}
            />
            <OsmRow
              label="Amenities"
              value={`${osm.summary.amenity_count} found`}
            />

            {floodFlag && (
              <p style={{
                margin: "10px 0 0", padding: "8px 12px",
                background: "#fef2f2", borderLeft: "3px solid #ef4444",
                borderRadius: "0 6px 6px 0", fontSize: 12, color: "#b91c1c",
              }}>
                Waterway within 300m — see Flood Risk section above.
              </p>
            )}

            {osm.roads.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="section-label">Nearest roads</p>
                {osm.roads.slice(0, 3).map((r, i) => (
                  <p key={i} style={{ margin: "3px 0", fontSize: 12 }}>
                    <strong>{r.name}</strong>
                    <span style={{ color: "#6b7280" }}> · {r.type} · {r.distance_m}m</span>
                  </p>
                ))}
              </div>
            )}

            {osm.amenities.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p className="section-label">Nearby amenities</p>
                {osm.amenities.slice(0, 5).map((a, i) => (
                  <p key={i} style={{ margin: "3px 0", fontSize: 12 }}>
                    <strong>{a.name}</strong>
                    <span style={{ color: "#6b7280" }}> · {a.amenity} · {a.distance_m}m</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PDF export ── */}
        <ExportButton pin={pin} radiusM={extent} />

        {/* ── Disclaimer ── */}
        <p style={{
          margin: "16px 0 0", fontSize: 10, color: "#9ca3af",
          lineHeight: 1.5, borderTop: "1px solid #f3f4f6", paddingTop: 10,
        }}>
          Indicative data only. Not a substitute for a licensed site survey.
          Data: SRTM (NASA/USGS), OSM contributors, MERIT Hydro.
        </p>

      </div>
    </>
  );
}