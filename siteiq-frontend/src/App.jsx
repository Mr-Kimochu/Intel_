import { useState, useCallback } from "react";
import MapView from "./components/MapView";
import SitePanel from "./components/SitePanel";
import LayersMenu from "./components/LayersMenu";
import {
  getElevation, getTerrain, getTerrainProfile,
  getOsmContext, getFloodRisk, getElevationGrid,
} from "./api";
import "./App.css";

const DEFAULT_TOGGLES = {
  osmContext:      false,
  elevationBuffer: true,
  terrainProfile:  true,
  contours:        false,
  drainage:        false,
};

export default function App() {
  const [pin,       setPin]       = useState(null);
  const [elevation, setElevation] = useState(null);
  const [terrain,   setTerrain]   = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [osm,       setOsm]       = useState(null);
  const [floodRisk, setFloodRisk] = useState(null);
  const [elevGrid,  setElevGrid]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [toggles,   setToggles]   = useState(DEFAULT_TOGGLES);

  const handleToggle = useCallback((key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handlePick = useCallback(async (lat, lon) => {
    setPin({ lat, lon });
    setLoading(true);
    setError(null);
    setElevation(null); setTerrain(null); setProfile(null);
    setOsm(null); setFloodRisk(null); setElevGrid(null);

    try {
      // Phase 1+2: elevation and terrain — fast, always needed
      const [elevData, terrainData, profileData] = await Promise.all([
        getElevation(lat, lon),
        getTerrain(lat, lon),
        getTerrainProfile(lat, lon),
      ]);
      setElevation(elevData);
      setTerrain(terrainData);
      setProfile(profileData);

      // Phase 3: OSM — slightly slower, fetch in parallel with flood risk
      const [osmData, floodData, gridData] = await Promise.all([
        getOsmContext(lat, lon),
        getFloodRisk(lat, lon, 200, null),   // waterway dist filled in below
        getElevationGrid(lat, lon, 500),
      ]);
      setOsm(osmData);
      setElevGrid(gridData);

      // Re-fetch flood risk with OSM waterway distance for better composite score
      const waterwayDist = osmData?.summary?.nearest_waterway_m ?? null;
      if (waterwayDist !== null) {
        const refinedFlood = await getFloodRisk(lat, lon, 200, waterwayDist);
        setFloodRisk(refinedFlood);
      } else {
        setFloodRisk(floodData);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title">
          <h1>Construction Site Intelligence</h1>
          <span className="app-header-sub">Drop a pin — get answers, not datasets</span>
        </div>
        <LayersMenu toggles={toggles} onToggle={handleToggle} />
      </header>

      <div className="app-body">
        <div className="map-pane">
          <MapView
            pin={pin}
            osm={osm}
            terrain={terrain}
            profile={profile}
            elevGrid={elevGrid}
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
          floodRisk={floodRisk}
          loading={loading}
          error={error}
          toggles={toggles}
        />
      </div>

      <footer className="app-footer">
        <span>Made by <a href="mailto:sakin@example.com">Sakin</a> · 2026</span>
        <span>·</span>
        <span>Open source · Data: OSM, NASA, ESA, MERIT</span>
      </footer>
    </div>
  );
}