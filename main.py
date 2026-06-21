import os
from typing import Optional

import ee
import requests
from diskcache import Cache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

EE_PROJECT = os.getenv("EE_PROJECT_ID")
CACHE_DIR = os.getenv("CACHE_DIR", "./.cache")
CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days — elevation never changes

cache = Cache(CACHE_DIR)

ee.Initialize(project=EE_PROJECT)

app = FastAPI(title="Construction Site Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # vite dev server
    allow_methods=["GET"],
    allow_headers=["*"],
)

DEM = ee.Image("USGS/SRTMGL1_003")  # 30m global elevation


def cache_key(lat: float, lon: float, precision: int = 4) -> str:
    # ~11m grid at 4 decimal places — good enough to dedupe repeat clicks
    return f"elev:{round(lat, precision)}:{round(lon, precision)}"


def fetch_elevation(lat: float, lon: float) -> Optional[float]:
    point = ee.Geometry.Point([lon, lat])
    result = DEM.reduceRegion(
        reducer=ee.Reducer.first(),
        geometry=point,
        scale=30,
    ).getInfo()
    return result.get("elevation")


def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "construction-site-intel/0.1 (student project)"},
            timeout=5,
        )
        resp.raise_for_status()
        return resp.json().get("display_name")
    except requests.RequestException:
        return None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/elevation")
def get_elevation(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    key = cache_key(lat, lon)
    cached = cache.get(key)
    if cached is not None:
        return cached

    elevation = fetch_elevation(lat, lon)
    if elevation is None:
        raise HTTPException(status_code=404, detail="No elevation data at this point")

    payload = {
        "lat": lat,
        "lon": lon,
        "elevation_m": round(elevation, 1),
        "place_name": reverse_geocode(lat, lon),
    }

    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload