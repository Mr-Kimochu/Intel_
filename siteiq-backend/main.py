import math
import os
from typing import Dict, List, Optional

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

# server deployments auths
import json
raw_key = os.getenv("EE_SERVICE_ACCOUNT_JSON")

if raw_key is None:
    raise RuntimeError("EE_SERVICE_ACCOUNT_JSON is not set. Check Render Environment tab.")

key_dict = json.loads(raw_key)

credentials = ee.ServiceAccountCredentials(
    email=key_dict["client_email"],
    key_data=json.dumps(key_dict),   # ee accepts the full JSON string directly
)
ee.Initialize(credentials=credentials, project=key_dict["project_id"])

app = FastAPI(title="Construction Site Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://sakinsiteintel.vercel.app/",
        ],  # vite dev server
    allow_methods=["GET"],
    allow_headers=["*"],
)

DEM = ee.Image("USGS/SRTMGL1_003")  # 30m global elevation
SLOPE = ee.Terrain.slope(DEM)  # degrees, 0-90
ASPECT = ee.Terrain.aspect(DEM)  # compass degrees the slope faces, 0-360


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


def classify_slope(deg: Optional[float]) -> Optional[str]:
    if deg is None:
        return None
    if deg < 5:
        return "flat — easy to build"
    if deg < 15:
        return "gentle — minor grading"
    if deg < 30:
        return "moderate — engineering required"
    return "steep — high construction cost/risk"


def fetch_terrain_stats(lat: float, lon: float, radius_m: int) -> Dict:
    point = ee.Geometry.Point([lon, lat])
    buffer = point.buffer(radius_m)

    point_values = (
        DEM.addBands(SLOPE)
        .addBands(ASPECT)
        .reduceRegion(reducer=ee.Reducer.first(), geometry=point, scale=30)
        .getInfo()
    )

    elevation_stats = DEM.reduceRegion(
        reducer=ee.Reducer.minMax().combine(ee.Reducer.mean(), sharedInputs=True),
        geometry=buffer,
        scale=30,
        maxPixels=1e8,
    ).getInfo()

    slope_stats = SLOPE.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.max(), sharedInputs=True),
        geometry=buffer,
        scale=30,
        maxPixels=1e8,
    ).getInfo()

    point_slope = point_values.get("slope")

    return {
        "point": {
            "elevation_m": point_values.get("elevation"),
            "slope_deg": point_slope,
            "slope_class": classify_slope(point_slope),
            "aspect_deg": point_values.get("aspect"),
        },
        "site_buffer": {
            "radius_m": radius_m,
            "elevation_min_m": elevation_stats.get("elevation_min"),
            "elevation_max_m": elevation_stats.get("elevation_max"),
            "elevation_mean_m": elevation_stats.get("elevation_mean"),
            "slope_mean_deg": slope_stats.get("slope_mean"),
            "slope_max_deg": slope_stats.get("slope_max"),
        },
    }


def offset_point(lat: float, lon: float, distance_m: float, bearing_deg: float) -> tuple[float, float]:
    """Move a point a given distance (m) along a compass bearing (0=north, 90=east)."""
    if distance_m == 0:
        return lat, lon
    R = 6371000  # Earth radius in meters
    bearing = math.radians(bearing_deg)
    lat1, lon1 = math.radians(lat), math.radians(lon)

    lat2 = math.asin(
        math.sin(lat1) * math.cos(distance_m / R)
        + math.cos(lat1) * math.sin(distance_m / R) * math.cos(bearing)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(distance_m / R) * math.cos(lat1),
        math.cos(distance_m / R) - math.sin(lat1) * math.sin(lat2),
    )
    return math.degrees(lat2), math.degrees(lon2)


def sample_transect(lat: float, lon: float, bearing_deg: float, half_length_m: int, num_samples: int = 21) -> List[Dict]:
    """Sample DEM elevation at evenly spaced points along a line through (lat, lon)."""
    step = (2 * half_length_m) / (num_samples - 1)
    features = []
    for i in range(num_samples):
        signed_dist = i * step - half_length_m  # negative = before the pin, positive = after
        bearing = bearing_deg if signed_dist >= 0 else (bearing_deg + 180) % 360
        plat, plon = offset_point(lat, lon, abs(signed_dist), bearing)
        features.append(
            ee.Feature(ee.Geometry.Point([plon, plat]), {"distance_m": round(signed_dist, 1)})
        )

    sampled = DEM.sampleRegions(
        collection=ee.FeatureCollection(features), scale=30, geometries=False
    ).getInfo()

    results = [
        {
            "distance_m": f["properties"]["distance_m"],
            "elevation_m": f["properties"].get("elevation"),
        }
        for f in sampled["features"]
    ]
    results.sort(key=lambda r: r["distance_m"])
    return results


# ─── Phase 3 · OSM context ───────────────────────────────────────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OSM_HEADERS = {"User-Agent": "construction-site-intel/0.1 (student project)"}
OSM_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days — roads/amenities change slowly

# Context buffer fixed at 1 km — covers vehicle access range and walkable amenities
# without over-fetching in dense areas
OSM_RADIUS_M = 1000


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line distance in metres between two lat/lon points."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def overpass_query(lat: float, lon: float, radius_m: int, filters: List[str]) -> dict:
    """
    Run a single Overpass QL query for multiple filter strings inside one radius.
    Uses 'out geom' so every element carries its full coordinate geometry —
    nodes get top-level lat/lon, ways get a geometry[] array of {lat,lon} objects.
    """
    union_parts = "\n  ".join(
        f'{f}(around:{radius_m},{lat},{lon});' for f in filters
    )
    query = f"""
[out:json][timeout:25];
(
  {union_parts}
);
out geom;
"""
    resp = requests.post(
        OVERPASS_URL, data={"data": query}, headers=OSM_HEADERS, timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def _point(el: dict) -> Optional[Dict]:
    """Best single lat/lon for a node or the centroid of a way's geometry."""
    if el["type"] == "node":
        return {"lat": el["lat"], "lon": el["lon"]}
    geom = el.get("geometry", [])
    if not geom:
        return None
    lats = [g["lat"] for g in geom]
    lons = [g["lon"] for g in geom]
    return {"lat": sum(lats) / len(lats), "lon": sum(lons) / len(lons)}


def _line(el: dict) -> List[Dict]:
    """Full coordinate array for a way (empty list for nodes)."""
    if el["type"] != "way":
        return []
    return [{"lat": g["lat"], "lon": g["lon"]} for g in el.get("geometry", [])]


def classify_road(highway_val: str) -> str:
    primary = {"motorway", "trunk", "primary"}
    secondary = {"secondary", "tertiary"}
    if highway_val in primary:
        return "major road"
    if highway_val in secondary:
        return "secondary road"
    if highway_val in {"residential", "unclassified"}:
        return "local road"
    return "track / path"


def parse_roads(elements: List[dict], lat: float, lon: float) -> List[dict]:
    seen, roads = set(), []
    for el in elements:
        tags = el.get("tags", {})
        hwy = tags.get("highway")
        if not hwy or el["id"] in seen:
            continue
        pt = _point(el)
        if not pt:
            continue
        seen.add(el["id"])
        roads.append({
            "name": tags.get("name") or tags.get("ref") or "Unnamed road",
            "type": classify_road(hwy),
            "highway_tag": hwy,
            "distance_m": round(haversine_m(lat, lon, pt["lat"], pt["lon"])),
            "centroid": pt,
            "geometry": _line(el),   # [] for nodes; polyline coords for ways
        })
    roads.sort(key=lambda r: r["distance_m"])
    return roads[:5]


def classify_waterway(waterway_val: str) -> str:
    if waterway_val in {"river", "canal"}:
        return "river"
    if waterway_val in {"stream", "drain"}:
        return "stream"
    return "waterway"


def parse_waterways(elements: List[dict], lat: float, lon: float) -> List[dict]:
    seen, waterways = set(), []
    for el in elements:
        tags = el.get("tags", {})
        ww = tags.get("waterway")
        if not ww or el["id"] in seen:
            continue
        pt = _point(el)
        if not pt:
            continue
        seen.add(el["id"])
        waterways.append({
            "name": tags.get("name") or "Unnamed waterway",
            "type": classify_waterway(ww),
            "distance_m": round(haversine_m(lat, lon, pt["lat"], pt["lon"])),
            "centroid": pt,
            "geometry": _line(el),
        })
    waterways.sort(key=lambda w: w["distance_m"])
    return waterways[:5]


AMENITY_GROUPS = {
    "school": "education",
    "college": "education",
    "university": "education",
    "hospital": "health",
    "clinic": "health",
    "pharmacy": "health",
    "doctors": "health",
    "fire_station": "emergency",
    "police": "emergency",
    "marketplace": "commerce",
    "bank": "commerce",
}


def parse_amenities(elements: List[dict], lat: float, lon: float) -> List[dict]:
    seen, amenities = set(), []
    for el in elements:
        tags = el.get("tags", {})
        amenity = tags.get("amenity")
        if not amenity or amenity not in AMENITY_GROUPS or el["id"] in seen:
            continue
        pt = _point(el)
        if not pt:
            continue
        seen.add(el["id"])
        amenities.append({
            "name": tags.get("name") or f"Unnamed {amenity}",
            "amenity": amenity,
            "group": AMENITY_GROUPS[amenity],
            "distance_m": round(haversine_m(lat, lon, pt["lat"], pt["lon"])),
            "lat": pt["lat"],
            "lon": pt["lon"],
        })
    amenities.sort(key=lambda a: a["distance_m"])
    return amenities[:10]


def classify_power(power_val: str) -> str:
    mapping = {
        "line": "high-voltage line",
        "minor_line": "distribution line",
        "tower": "transmission tower",
        "pole": "utility pole",
        "substation": "substation",
        "transformer": "transformer",
    }
    return mapping.get(power_val, "power infrastructure")


def parse_power(elements: List[dict], lat: float, lon: float) -> List[dict]:
    seen, power = set(), []
    for el in elements:
        tags = el.get("tags", {})
        pw = tags.get("power")
        if not pw or el["id"] in seen:
            continue
        pt = _point(el)
        if not pt:
            continue
        seen.add(el["id"])
        power.append({
            "type": classify_power(pw),
            "name": tags.get("name") or tags.get("ref") or None,
            "voltage": tags.get("voltage") or None,
            "distance_m": round(haversine_m(lat, lon, pt["lat"], pt["lon"])),
            "lat": pt["lat"],
            "lon": pt["lon"],
        })
    power.sort(key=lambda p: p["distance_m"])
    return power[:5]


def nearest_road_distance(roads: List[dict]) -> Optional[int]:
    return roads[0]["distance_m"] if roads else None


def nearest_waterway_distance(waterways: List[dict]) -> Optional[int]:
    return waterways[0]["distance_m"] if waterways else None


def grid_connected(power: List[dict]) -> bool:
    """True if any mapped power infrastructure exists within the search radius."""
    return len(power) > 0


def fetch_osm_context(lat: float, lon: float) -> dict:
    """Single Overpass round-trip fetching roads, waterways, amenities, and power."""
    raw = overpass_query(
        lat, lon, OSM_RADIUS_M,
        filters=[
            'way["highway"]',
            'way["waterway"]',
            'node["amenity"]',
            'way["amenity"]',
            'node["power"]',
            'way["power"]',
        ],
    )

    elements = raw.get("elements", [])

    roads = parse_roads(elements, lat, lon)
    waterways = parse_waterways(elements, lat, lon)
    amenities = parse_amenities(elements, lat, lon)
    power = parse_power(elements, lat, lon)

    return {
        "search_radius_m": OSM_RADIUS_M,
        "summary": {
            "nearest_road_m": nearest_road_distance(roads),
            "nearest_waterway_m": nearest_waterway_distance(waterways),
            "grid_connected": grid_connected(power),
            "amenity_count": len(amenities),
        },
        "roads": roads,
        "waterways": waterways,
        "amenities": amenities,
        "power": power,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

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


@app.get("/terrain")
def get_terrain(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(200, ge=20, le=1000, description="Site buffer radius in meters"),
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


@app.get("/terrain-profile")
def get_terrain_profile(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    length_m: int = Query(500, ge=50, le=2000, description="Total transect length in meters"),
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


@app.get("/osm-context")
def get_osm_context(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    key = f"osm:{round(lat, 4)}:{round(lon, 4)}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        data = fetch_osm_context(lat, lon)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Overpass API error: {exc}")

    payload = {"lat": lat, "lon": lon, **data}
    cache.set(key, payload, expire=OSM_CACHE_TTL)
    return payload