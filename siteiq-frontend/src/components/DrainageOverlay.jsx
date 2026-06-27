import { ImageOverlay } from "react-leaflet";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/**
 * Compute a square bounding box [[south,west],[north,east]] for a circular buffer.
 * Simple degree-offset using the haversine approximation — good enough for <5km.
 */
function bufferBounds(lat, lon, radiusM) {
  const R     = 6371000;
  const dlat  = (radiusM / R) * (180 / Math.PI);
  const dlon  = dlat / Math.cos((lat * Math.PI) / 180);
  return [
    [lat - dlat, lon - dlon],   // SW corner
    [lat + dlat, lon + dlon],   // NE corner
  ];
}

export default function DrainageOverlay({ pin, radiusM = 2000 }) {
  if (!pin) return null;

  const bounds = bufferBounds(pin.lat, pin.lon, radiusM);
  // Append a cache-bust param keyed to the pin so React re-fetches when pin moves
  const url = `${API_BASE}/drainage-tile?lat=${pin.lat}&lon=${pin.lon}&radius_m=${radiusM}`;

  return (
    <ImageOverlay
      url={url}
      bounds={bounds}
      opacity={0.6}
      zIndex={250}
    />
  );
}