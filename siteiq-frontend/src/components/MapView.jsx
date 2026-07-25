import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import OsmOverlay, { OsmLegend } from "./OsmOverlay";
import LocationControl from "./LocationControl";
import ContourLayer from "./ContourLayer";
import LandCoverOverlay from "./LandCoverOverlay";
import { SoilImageLayer, SoilControls } from "./SoilMapOverlay";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function offsetLatLon(lat, lon, distanceM, bearingDeg) {
  const R = 6371000;
  const b = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
    Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(b)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(b) * Math.sin(distanceM / R) * Math.cos(lat1),
    Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [lat2 * (180 / Math.PI), lon2 * (180 / Math.PI)];
}

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function FlyToPin({ pin }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.flyTo([pin.lat, pin.lon], 15, { duration: 1.2 });
  }, [pin, map]);
  return null;
}

function ElevationBufferOverlay({ pin, terrain }) {
  if (!pin || !terrain?.site_buffer) return null;
  return (
    <Circle
      center={[pin.lat, pin.lon]}
      radius={terrain.site_buffer.radius_m}
      pathOptions={{
        color: "#374151", fillColor: "#374151",
        fillOpacity: 0.07, weight: 1.5, dashArray: "5 4",
      }}
    />
  );
}

function TerrainProfileOverlay({ pin, profile }) {
  if (!pin || !profile) return null;
  const half = profile.length_m / 2;
  const N = offsetLatLon(pin.lat, pin.lon, half, 0);
  const S = offsetLatLon(pin.lat, pin.lon, half, 180);
  const E = offsetLatLon(pin.lat, pin.lon, half, 90);
  const W = offsetLatLon(pin.lat, pin.lon, half, 270);
  return (
    <>
      <Polyline positions={[N, [pin.lat, pin.lon], S]}
        pathOptions={{ color: "#6b7280", weight: 1.5, dashArray: "6 4", opacity: 0.7 }} />
      <Polyline positions={[W, [pin.lat, pin.lon], E]}
        pathOptions={{ color: "#6b7280", weight: 1.5, dashArray: "6 4", opacity: 0.7 }} />
    </>
  );
}

export default function MapView({ pin, osm, terrain, profile, elevGrid, toggles, extent, onPick }) {
  const center = pin ? [pin.lat, pin.lon] : [-1.2833, 36.8167];  // Nairobi, Kenya

  // soilLayer state lives here so it can be shared between
  // SoilImageLayer (inside MapContainer) and SoilControls (outside)
  const [soilLayer, setSoilLayer] = useState("clay");

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>

      {/* ── Leaflet map ─────────────────────────────────────────────── */}
      <MapContainer
        center={center}
        zoom={pin ? 14 : 10}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        <FlyToPin pin={pin} />
        {pin && <Marker position={[pin.lat, pin.lon]} />}

        {/* Terrain */}
        {toggles.elevationBuffer && <ElevationBufferOverlay pin={pin} terrain={terrain} />}
        {toggles.terrainProfile  && <TerrainProfileOverlay pin={pin} profile={profile} />}
        {toggles.contours        && <ContourLayer gridData={elevGrid} />}

        {/* OSM */}
        {toggles.osmContext && <OsmOverlay osm={osm} />}

        {/* Land cover — ImageOverlay must be inside MapContainer */}
        {toggles.landCover && pin && (
          <LandCoverOverlay pin={pin} radiusM={extent ?? 500} />
        )}

      </MapContainer>

      {/* ── Overlays outside MapContainer (plain HTML, no Leaflet context) ── */}

      {/* GPS locate button */}
      <LocationControl onLocate={onPick} />

      {/* OSM legend */}
      {osm && toggles.osmContext && <OsmLegend />}
    </div>
  );
}