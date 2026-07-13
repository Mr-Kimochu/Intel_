import requests
from fastapi import APIRouter, HTTPException, Query

from app.services.osm_service import OSM_CACHE_TTL, OSM_RADIUS_M, fetch_osm_context
from app.utils.cache import cache

router = APIRouter()


@router.get("/osm-context")
def get_osm_context(
    lat:      float = Query(..., ge=-90, le=90),
    lon:      float = Query(..., ge=-180, le=180),
    radius_m: int   = Query(OSM_RADIUS_M, ge=200, le=5000),
):
    key = f"osm:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_osm_context(lat, lon, radius_m)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Overpass API error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=OSM_CACHE_TTL)
    return payload
