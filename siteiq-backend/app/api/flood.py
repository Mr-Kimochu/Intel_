from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.flood_service import fetch_drainage_geojson, fetch_flood_risk
from app.utils.cache import CACHE_TTL_SECONDS, cache

router = APIRouter()


@router.get("/flood-risk")
def get_flood_risk(
    lat:             float = Query(..., ge=-90, le=90),
    lon:             float = Query(..., ge=-180, le=180),
    radius_m:        int   = Query(500, ge=50, le=5000),
    waterway_dist_m: Optional[int] = Query(None),
):
    key    = f"flood:{round(lat, 4)}:{round(lon, 4)}:{radius_m}:{waterway_dist_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_flood_risk(lat, lon, radius_m, waterway_dist_m)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GEE flood risk error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload


@router.get("/drainage-geojson")
def get_drainage_geojson(
    lat:      float = Query(..., ge=-90, le=90),
    lon:      float = Query(..., ge=-180, le=180),
    radius_m: int   = Query(2000, ge=500, le=5000),
):
    key    = f"drain:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_drainage_geojson(lat, lon, radius_m)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Drainage error: {exc}")

    cache.set(key, data, expire=CACHE_TTL_SECONDS)
    return data
