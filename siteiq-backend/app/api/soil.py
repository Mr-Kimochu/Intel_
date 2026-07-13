from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.services.soil_service import SOIL_LAYER_META, fetch_soil, fetch_soil_tile
from app.utils.cache import CACHE_TTL_SECONDS, cache

router = APIRouter()


@router.get("/soil")
def get_soil(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    key    = f"soil:{round(lat, 4)}:{round(lon, 4)}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_soil(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Soil data error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=CACHE_TTL_SECONDS)
    return payload


@router.get("/soil-tile", response_class=Response)
def get_soil_tile(
    lat:      float = Query(..., ge=-90, le=90),
    lon:      float = Query(..., ge=-180, le=180),
    radius_m: int   = Query(500, ge=100, le=5000),
    layer:    str   = Query("clay"),   # clay | sand | ph | oc
):
    if layer not in SOIL_LAYER_META:
        raise HTTPException(status_code=422, detail=f"layer must be one of: {list(SOIL_LAYER_META)}")

    key    = f"soil_tile:{layer}:{round(lat, 4)}:{round(lon, 4)}:{radius_m}"
    cached = cache.get(key)
    if cached is not None:
        return Response(content=cached, media_type="image/png",
                        headers={"Cache-Control": "max-age=86400"})

    try:
        png = fetch_soil_tile(lat, lon, radius_m, layer)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Soil tile error: {exc}")

    cache.set(key, png, expire=CACHE_TTL_SECONDS)
    return Response(content=png, media_type="image/png",
                    headers={"Cache-Control": "max-age=86400"})
