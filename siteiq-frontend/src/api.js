import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const client   = axios.create({ baseURL: API_BASE, timeout: 25000 });

export const tileUrl = (path, params) =>
  `${API_BASE}${path}?${new URLSearchParams(params).toString()}`;

export async function getElevation(lat, lon) {
  const { data } = await client.get("/elevation", { params: { lat, lon } });
  return data;
}
export async function getTerrain(lat, lon, radiusM = 500) {
  const { data } = await client.get("/terrain", { params: { lat, lon, radius_m: radiusM } });
  return data;
}
export async function getTerrainProfile(lat, lon, lengthM = 500) {
  const { data } = await client.get("/terrain-profile", { params: { lat, lon, length_m: lengthM } });
  return data;
}
export async function getOsmContext(lat, lon, radiusM = 1000) {
  const { data } = await client.get("/osm-context", { params: { lat, lon, radius_m: radiusM } });
  return data;
}
export async function getFloodRisk(lat, lon, radiusM = 500, waterwayDistM = null) {
  const params = { lat, lon, radius_m: radiusM };
  if (waterwayDistM != null) params.waterway_dist_m = waterwayDistM;
  const { data } = await client.get("/flood-risk", { params });
  return data;
}
export async function getElevationGrid(lat, lon, radiusM = 500) {
  const { data } = await client.get("/elevation-grid", { params: { lat, lon, radius_m: radiusM } });
  return data;
}
export async function getClimateSolar(lat, lon) {
  const { data } = await client.get("/climate-solar", { params: { lat, lon } });
  return data;
}
export async function getSoil(lat, lon) {
  const { data } = await client.get("/soil", { params: { lat, lon } });
  return data;
}
export async function getLandCover(lat, lon, radiusM = 500) {
  const { data } = await client.get("/land-cover", { params: { lat, lon, radius_m: radiusM } });
  return data;
}
export async function getLandUseSuitability(lat, lon, params = {}) {
  const { data } = await client.get("/land-use-suitability", { params: { lat, lon, ...params } });
  return data;
}