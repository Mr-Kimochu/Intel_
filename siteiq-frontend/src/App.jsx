import { useState, useCallback } from "react";
import MapView from "./components/MapView";
import SitePanel from "./components/SitePanel";
import LayersMenu from "./components/LayersMenu.jsx";
import { getElevation, getTerrain, getTerrainProfile, getOsmContext } from "./api";
import "./App.css";

const DEFAULT_TOGGLES = {
  osmContext:      false,
  elevationBuffer: true,
  terrainProfile:  true,
};

export default function App() {
  const [pin,       setPin]       = useState(null);
  const [elevation, setElevation] = useState(null);
  const [terrain,   setTerrain]   = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [osm,       setOsm]       = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [toggles,   setToggles]   = useState(DEFAULT_TOGGLES);

  const handleToggle = useCallback((key) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handlePick = useCallback(async (lat, lon) => {
    setPin({ lat, lon });
    setLoading(true);
    setError(null);
    setElevation(null);
    setTerrain(null);
    setProfile(null);
    setOsm(null);

    try {
      const [elevationData, terrainData, profileData, osmData] = await Promise.all([
        getElevation(lat, lon),
        getTerrain(lat, lon),
        getTerrainProfile(lat, lon),
        getOsmContext(lat, lon),
      ]);
      setElevation(elevationData);
      setTerrain(terrainData);
      setProfile(profileData);
      setOsm(osmData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-title">
          <h1>Site Intelligence</h1>
          <span className="app-header-sub">Drop a pin — get answers</span>
        </div>
        <LayersMenu toggles={toggles} onToggle={handleToggle} />
      </header>

      {/* ── Body ── */}
      <div className="app-body">
        <div className="map-pane">
          <MapView
            pin={pin}
            osm={osm}
            terrain={terrain}
            profile={profile}
            toggles={toggles}
            onPick={handlePick}
          />
        </div>
        <SitePanel
          pin={pin}
          elevation={elevation}
          terrain={terrain}
          osm={osm}
          profile={profile}
          loading={loading}
          error={error}
          toggles={toggles}
        />
      </div>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>Made by <a href="mailto:sakindeborah@outlook.com">Sakin</a> · 2026</span>
        <span>·</span>
        <span>Open source · Data: OSM, NASA, ESA</span>
      </footer>
    </div>
  );
}