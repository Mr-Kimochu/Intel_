import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE, timeout: 20000 });

export async function getElevation(lat, lon) {
  const { data } = await client.get("/elevation", { params: { lat, lon } });
  return data;
}

export async function getTerrain(lat, lon, radiusM = 200) {
  const { data } = await client.get("/terrain", { params: { lat, lon, radius_m: radiusM } });
  return data;
}

export async function getTerrainProfile(lat, lon, lengthM = 500) {
  const { data } = await client.get("/terrain-profile", { params: { lat, lon, length_m: lengthM } });
  return data;
}

export async function getOsmContext(lat, lon) {
  const { data } = await client.get("/osm-context", { params: { lat, lon } });
  return data;
}

export async function getFloodRisk(lat, lon, radiusM = 200, waterwayDistM = null) {
  const params = { lat, lon, radius_m: radiusM };
  if (waterwayDistM != null) params.waterway_dist_m = waterwayDistM;
  const { data } = await client.get("/flood-risk", { params });
  return data;
}

export async function getElevationGrid(lat, lon, radiusM = 500) {
  const { data } = await client.get("/elevation-grid", { params: { lat, lon, radius_m: radiusM } });
  return data;
}