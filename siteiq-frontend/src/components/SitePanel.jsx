function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default function SitePanel({ pin, elevation, terrain, loading, error }) {
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
        <p>
          Reading the ground at {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}…
        </p>
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

  return (
    <div className="panel">
      <h2>{elevation?.place_name || "Selected site"}</h2>
      <p className="coords">
        {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}
      </p>

      <div className="stat-grid">
        <Stat label="Elevation" value={`${elevation?.elevation_m ?? "—"} m`} />
        <Stat label="Slope" value={`${terrain?.point?.slope_deg?.toFixed(1) ?? "—"}°`} />
        <Stat label="Aspect" value={`${terrain?.point?.aspect_deg?.toFixed(0) ?? "—"}°`} />
      </div>

      {terrain?.point?.slope_class && <p className="callout">{terrain.point.slope_class}</p>}

      {terrain?.site_buffer && (
        <div className="site-buffer">
          <h3>Within {terrain.site_buffer.radius_m}m</h3>
          <p>
            Elevation range: {terrain.site_buffer.elevation_min_m?.toFixed(0)}–
            {terrain.site_buffer.elevation_max_m?.toFixed(0)} m
          </p>
          <p>
            Average slope: {terrain.site_buffer.slope_mean_deg?.toFixed(1)}°, max{" "}
            {terrain.site_buffer.slope_max_deg?.toFixed(1)}°
          </p>
        </div>
      )}
    </div>
  );
}
