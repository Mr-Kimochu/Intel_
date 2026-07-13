from diskcache import Cache

from app.config import CACHE_DIR, CACHE_TTL_SECONDS

cache = Cache(CACHE_DIR)


def cache_key(lat: float, lon: float, precision: int = 4) -> str:
    # ~11m grid at 4 decimal places — good enough to dedupe repeat clicks
    return f"elev:{round(lat, precision)}:{round(lon, precision)}"
