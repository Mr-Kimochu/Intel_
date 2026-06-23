import { useState, useCallback } from "react";
import MapView from "./components/MapView";
import SitePanel from "./components/SitePanel";
import ElevationProfileChart from "./components/ElevationProfileChart";
import { getElevation, getTerrain, getTerrainProfile, getOsmContext } from "./api";
import "./App.css";

const DEFAULT_TOGGLES = {
  osmContext:      true,
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
      <header className="app-header">
        <h1>Construction Site Intelligence</h1>
        <p>Drop a pin. Get answers, not datasets.</p>
      </header>
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
        <aside className="side-pane">
          <SitePanel
            pin={pin}
            elevation={elevation}
            terrain={terrain}
            osm={osm}
            loading={loading}
            error={error}
            toggles={toggles}
            onToggle={handleToggle}
          />
          {!loading && profile && toggles.terrainProfile && (
            <ElevationProfileChart profile={profile} />
          )}
        </aside>
      </div>
    </div>
  );
}