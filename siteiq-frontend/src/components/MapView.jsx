import { MapContainer, TileLayer, Marker, useMapEvents, Circle, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import OsmOverlay, { OsmLegend } from "./OsmOverlay";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Haversine offset: move (lat,lon) by distance_m along bearing_deg
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

// Low-opacity circle showing the elevation/slope stats buffer
function ElevationBufferOverlay({ pin, terrain }) {
  if (!pin || !terrain?.site_buffer) return null;
  const radius = terrain.site_buffer.radius_m;
  return (
    <Circle
      center={[pin.lat, pin.lon]}
      radius={radius}
      pathOptions={{
        color: "#b5651d",
        fillColor: "#b5651d",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "5 4",
      }}
    />
  );
}

// Two dashed arms showing the N-S and E-W terrain profile reach
function TerrainProfileOverlay({ pin, profile }) {
  if (!pin || !profile) return null;
  const half = profile.length_m / 2;

  const northEnd = offsetLatLon(pin.lat, pin.lon, half, 0);
  const southEnd = offsetLatLon(pin.lat, pin.lon, half, 180);
  const eastEnd  = offsetLatLon(pin.lat, pin.lon, half, 90);
  const westEnd  = offsetLatLon(pin.lat, pin.lon, half, 270);

  return (
    <>
      <Polyline
        positions={[northEnd, [pin.lat, pin.lon], southEnd]}
        pathOptions={{ color: "#3a5fa0", weight: 1.5, dashArray: "6 4", opacity: 0.6 }}
      />
      <Polyline
        positions={[westEnd, [pin.lat, pin.lon], eastEnd]}
        pathOptions={{ color: "#3a5fa0", weight: 1.5, dashArray: "6 4", opacity: 0.6 }}
      />
    </>
  );
}

export default function MapView({ pin, osm, terrain, profile, toggles, onPick }) {
  const center = pin ? [pin.lat, pin.lon] : [-3.45, 38.35];

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer center={center} zoom={pin ? 14 : 10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        {pin && <Marker position={[pin.lat, pin.lon]} />}

        {toggles.elevationBuffer && <ElevationBufferOverlay pin={pin} terrain={terrain} />}
        {toggles.terrainProfile  && <TerrainProfileOverlay pin={pin} profile={profile} />}
        {toggles.osmContext      && <OsmOverlay osm={osm} />}
      </MapContainer>

      {osm && toggles.osmContext && <OsmLegend />}
    </div>
  );
}