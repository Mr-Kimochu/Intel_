import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE, timeout: 15000 });

export async function getElevation(lat, lon) {
  const { data } = await client.get("/elevation", { params: { lat, lon } });
  return data;
}

export async function getTerrain(lat, lon, radiusM = 100) {
  const { data } = await client.get("/terrain", {
    params: { lat, lon, radius_m: radiusM },
  });
  return data;
}

export async function getTerrainProfile(lat, lon, lengthM = 300) {
  const { data } = await client.get("/terrain-profile", {
    params: { lat, lon, length_m: lengthM },
  });
  return data;
}
