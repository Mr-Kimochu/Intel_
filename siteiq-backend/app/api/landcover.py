from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.services.landcover_service import assess_land_use, fetch_land_cover, fetch_land_cover_tile
from app.utils.cache import CACHE_TTL_SECONDS, cache

router = APIRouter()


@router.get("/land-cover")
def get_land_cover(
    lat:      float = Query(..., ge=-90, le=90),
    lon:      float = Query(..., ge=-180, le=180),
    radius_m: int   = Query(500, ge=100, le=5000),
):
    key    = f"lc:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_land_cover(lat, lon, radius_m)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Land cover error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload


@router.get("/land-cover-tile", response_class=Response)
def get_land_cover_tile(
    lat:      float = Query(..., ge=-90, le=90),
    lon:      float = Query(..., ge=-180, le=180),
    radius_m: int   = Query(500, ge=100, le=5000),
):
    key    = f"lc_tile:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return Response(content=cached, media_type="image/png")

    try:
        png = fetch_land_cover_tile(lat, lon, radius_m)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Land cover tile error: {exc}")

    cache.set(key, png, expire=CACHE_TTL_SECONDS)
    return Response(content=png, media_type="image/png")


@router.get("/land-use-suitability")
def get_land_use_suitability(
    lat:              float = Query(..., ge=-90, le=90),
    lon:              float = Query(..., ge=-180, le=180),
    slope_deg:        Optional[float] = Query(None),
    hand_m:           Optional[float] = Query(None),
    clay_pct:         Optional[float] = Query(None),
    annual_rainfall:  Optional[float] = Query(None),
    dominant_class:   Optional[int]   = Query(None),
):
    result = assess_land_use(slope_deg, hand_m, clay_pct, annual_rainfall, dominant_class)
    return {"lat": lat, "lon": lon, **result}
