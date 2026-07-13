from fastapi import APIRouter, HTTPException, Query

from app.services.climate_service import fetch_climate_solar
from app.utils.cache import cache

router = APIRouter()


@router.get("/climate-solar")
def get_climate_solar(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    key    = f"climate:{round(lat, 3)}:{round(lon, 3)}"  # 3dp — NASA POWER is ~10km grid
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_climate_solar(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Climate data error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=60 * 60 * 24 * 90)   # 90 days — climatology barely changes
    return payload
