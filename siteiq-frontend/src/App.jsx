import { useState, useCallback } from "react";
import MapView from "./components/MapView";
import SitePanel from "./components/SitePanel";
import ElevationProfileChart from "./components/ElevationProfileChart";
import { getElevation, getTerrain, getTerrainProfile } from "./api";
import "./App.css";

export default function App() {
  const [pin, setPin] = useState(null);
  const [elevation, setElevation] = useState(null);
  const [terrain, setTerrain] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePick = useCallback(async (lat, lon) => {
    setPin({ lat, lon });
    setLoading(true);
    setError(null);
    setElevation(null);
    setTerrain(null);
    setProfile(null);

    try {
      const [elevationData, terrainData, profileData] = await Promise.all([
        getElevation(lat, lon),
        getTerrain(lat, lon),
        getTerrainProfile(lat, lon),
      ]);
      setElevation(elevationData);
      setTerrain(terrainData);
      setProfile(profileData);
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
          <MapView pin={pin} onPick={handlePick} />
        </div>
        <aside className="side-pane">
          <SitePanel pin={pin} elevation={elevation} terrain={terrain} loading={loading} error={error} />
          {!loading && profile && <ElevationProfileChart profile={profile} />}
        </aside>
      </div>
    </div>
  );
}
