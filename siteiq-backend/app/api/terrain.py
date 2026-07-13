from fastapi import APIRouter, HTTPException, Query

from app.services.gee import fetch_elevation
from app.services.terrain_service import fetch_elevation_grid, fetch_terrain_stats, sample_transect
from app.utils.cache import CACHE_TTL_SECONDS, cache, cache_key
from app.utils.helpers import reverse_geocode

router = APIRouter()


@router.get("/elevation")
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


@router.get("/terrain")
def get_terrain(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(500, ge=20, le=5000, description="Site buffer radius in meters"),
):
    key = f"terrain:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    stats = fetch_terrain_stats(lat, lon, radius_m)
    if stats["point"]["elevation_m"] is None:
        raise HTTPException(status_code=404, detail="No terrain data at this point")

    payload = {"lat": lat, "lon": lon, **stats}
    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload


@router.get("/terrain-profile")
def get_terrain_profile(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    length_m: int = Query(500, ge=50, le=5000, description="Total transect length in meters"),
):
    key = f"profile:{round(lat, 4)}:{round(lon, 4)}:{length_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    half = length_m // 2
    payload = {
        "lat": lat,
        "lon": lon,
        "length_m": length_m,
        "transects": {
            "north_south": sample_transect(lat, lon, bearing_deg=0, half_length_m=half),
            "east_west": sample_transect(lat, lon, bearing_deg=90, half_length_m=half),
        },
    }
    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload


@router.get("/elevation-grid")
def get_elevation_grid(
    lat:      float = Query(..., ge=-90, le=90),
    lon:      float = Query(..., ge=-180, le=180),
    radius_m: int   = Query(500, ge=100, le=5000),
):
    key    = f"grid:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_elevation_grid(lat, lon, radius_m)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GEE grid error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload
