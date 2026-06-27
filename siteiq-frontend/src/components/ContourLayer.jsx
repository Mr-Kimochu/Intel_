import { GeoJSON } from "react-leaflet";
import { useMemo } from "react";
import * as d3 from "d3";

/**
 * Converts GEE elevation grid (2D array + bounds) to Leaflet GeoJSON contours.
 * d3.contours() works in pixel space [col, row]; we transform to [lon, lat].
 */
function pixelToGeo(px, py, bounds, cols, rows) {
  const lon = bounds.west  + (px / cols) * (bounds.east  - bounds.west);
  const lat = bounds.north - (py / rows) * (bounds.north - bounds.south);
  return [lon, lat];
}

function transformContour(contour, bounds, cols, rows) {
  return {
    ...contour,
    coordinates: contour.coordinates.map(polygon =>
      polygon.map(ring =>
        ring.map(([px, py]) => pixelToGeo(px, py, bounds, cols, rows))
      )
    ),
  };
}

// Brown topo palette: lighter = lower, darker = higher
function elevColor(elev, min, max) {
  const t = Math.max(0, Math.min(1, (elev - min) / (max - min)));
  // Interpolate from #d4a96a (light brown) to #5a3014 (dark brown)
  const r = Math.round(212 - t * (212 - 90));
  const g = Math.round(169 - t * (169 - 48));
  const b = Math.round(106 - t * (106 - 20));
  return `rgb(${r},${g},${b})`;
}

export default function ContourLayer({ gridData }) {
  const geojson = useMemo(() => {
    if (!gridData?.grid) return null;

    const { grid, rows, cols, bounds } = gridData;
    const flat = grid.flat().map(v => (v === -9999 ? NaN : v));
    const valid = flat.filter(v => !isNaN(v));
    if (valid.length === 0) return null;

    const minElev = Math.min(...valid);
    const maxElev = Math.max(...valid);
    const range   = maxElev - minElev;

    // Interval: tighter for flat terrain, coarser for mountainous
    const interval = range < 30 ? 2 : range < 100 ? 5 : range < 300 ? 10 : 25;
    const start     = Math.ceil(minElev / interval) * interval;
    const thresholds = d3.range(start, maxElev, interval);
    if (thresholds.length === 0) return null;

    // Replace NaN with min so d3-contour doesn't produce artefacts at edges
    const filled = flat.map(v => (isNaN(v) ? minElev : v));

    const pixelContours = d3.contours().size([cols, rows]).thresholds(thresholds)(filled);

    return {
      type: "FeatureCollection",
      features: pixelContours.map(c => ({
        type: "Feature",
        properties: { elevation: c.value, minElev, maxElev },
        geometry: transformContour(c, bounds, cols, rows),
      })),
    };
  }, [gridData]);

  if (!geojson) return null;

  return (
    <GeoJSON
      key={`${gridData.lat}-${gridData.lon}`}
      data={geojson}
      style={(f) => ({
        color:       elevColor(f.properties.elevation, f.properties.minElev, f.properties.maxElev),
        weight:      1.2,
        fillOpacity: 0,
        opacity:     0.75,
      })}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(`${feature.properties.elevation} m`, {
          sticky: true,
          className: "contour-tooltip",
        });
      }}
    />
  );
}