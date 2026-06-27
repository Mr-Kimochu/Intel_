import io
import math
import os
from typing import Dict, List, Optional
# https://secure.dc7.pageuppeople.com/apply/671/cw/applicationForm/exitInfo.asp
import ee
import matplotlib
matplotlib.use("Agg")  # non-interactive backend — must be set before importing pyplot
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
import numpy as np
import requests
from diskcache import Cache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import json

load_dotenv()

CACHE_DIR = os.getenv("CACHE_DIR", "./.cache")
CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days

cache = Cache(CACHE_DIR)

# ── Earth Engine auth ────────────────────────────────────────────────────────
raw_key = os.getenv("EE_SERVICE_ACCOUNT_JSON")

if raw_key is None:
    raise RuntimeError("EE_SERVICE_ACCOUNT_JSON is not set. Check Render Environment tab.")

key_dict = json.loads(raw_key)

credentials = ee.ServiceAccountCredentials(
    email=key_dict["client_email"],
    key_data=json.dumps(key_dict),
)
ee.Initialize(credentials=credentials, project=key_dict["project_id"])

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Site Intelligence API")

app.add_middleware(
    CORSMiddleware,
    # allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:5173",
    allow_origins=[
        "http://localhost:5173",
        "https://geositeintel.vercel.app",
        "https://sakinsiteintel.vercel.app",
        ], 
    allow_methods=["GET"],
    allow_headers=["*"],
)

DEM   = ee.Image("USGS/SRTMGL1_003")        # 30m global elevation
SLOPE = ee.Terrain.slope(DEM)               # degrees, 0-90
ASPECT= ee.Terrain.aspect(DEM)              # compass degrees the slope faces, 0-360
MERIT = ee.Image("MERIT/Hydro/v1_0_1")     # 90m — HAND, upstream area, river mask
HAND  = MERIT.select("hnd")                # height above nearest drainage (metres)
UPA   = MERIT.select("upa")                # upstream contributing area (km²)


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
    radius_m: int = Query(200, ge=20, le=5000, description="Site buffer radius in meters"),
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


# ─── Phase 3.5 · DEM contours, drainage, flood risk ──────────────────────────

def composite_flood_risk(hand_m: Optional[float], slope_deg: Optional[float], waterway_dist_m: Optional[int]) -> dict:
    """
    Three-input risk score:
      Primary   — HAND (vertical exposure to drainage)
      Modifier  — slope (flat land near drainage floods wider)
      Secondary — OSM waterway proximity (catches small streams absent from MERIT 90m)
    """
    if hand_m is None:
        return {
            "level": "unknown", "label": "Insufficient data",
            "description": "HAND data unavailable at this location. Consider commissioning a site-specific assessment.",
            "color": "#9ca3af",
        }

    if hand_m < 5:
        level = "high"
    elif hand_m < 10:
        level = "medium-high" if (slope_deg is not None and slope_deg < 5) else "medium"
    else:
        # Low HAND but very close OSM waterway — small stream not in MERIT model
        level = "medium" if (waterway_dist_m is not None and waterway_dist_m < 200) else "low"

    slope_note = f", {slope_deg:.1f}° slope" if slope_deg is not None else ""
    ww_note = f" Nearest waterway {waterway_dist_m}m." if waterway_dist_m is not None else ""

    LABELS = {
        "high": (
            "High flood risk",
            f"Site sits only {hand_m:.1f}m above nearest drainage{slope_note}. Regularly inundated in moderate rainfall events.{ww_note} A hydrological assessment is strongly recommended before any site works.",
            "#ef4444",
        ),
        "medium-high": (
            "Medium-high flood risk",
            f"Site is {hand_m:.1f}m above drainage on gently sloping terrain{slope_note}. Flat land amplifies inundation extent during heavy rainfall.{ww_note}",
            "#f97316",
        ),
        "medium": (
            "Moderate flood risk",
            f"Site is {hand_m:.1f}m above nearest drainage{slope_note}.{ww_note} Risk increases during prolonged or high-intensity rainfall.",
            "#f59e0b",
        ),
        "low": (
            "Low flood risk",
            f"Site sits {hand_m:.1f}m above nearest drainage channel{slope_note}. Low inundation risk under normal conditions.",
            "#22c55e",
        ),
    }

    label, description, color = LABELS[level]
    return {"level": level, "label": label, "description": description, "color": color}


def fetch_flood_risk(lat: float, lon: float, radius_m: int, waterway_dist_m: Optional[int]) -> dict:
    point  = ee.Geometry.Point([lon, lat])
    buffer = point.buffer(radius_m)

    hand_point = HAND.reduceRegion(
        reducer=ee.Reducer.first(), geometry=point, scale=90
    ).getInfo()

    hand_buffer = HAND.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.min(), sharedInputs=True),
        geometry=buffer, scale=90, maxPixels=1e8,
    ).getInfo()

    slope_point = SLOPE.reduceRegion(
        reducer=ee.Reducer.first(), geometry=point, scale=30
    ).getInfo()

    hand_m  = hand_point.get("hnd")
    slope_d = slope_point.get("slope")

    risk = composite_flood_risk(hand_m, slope_d, waterway_dist_m)

    return {
        "hand": {
            "point_m":      round(hand_m, 1) if hand_m is not None else None,
            "buffer_mean_m": round(hand_buffer.get("hnd_mean", 0) or 0, 1),
            "buffer_min_m":  round(hand_buffer.get("hnd_min", 0) or 0, 1),
        },
        "risk": risk,
        "inputs": {
            "hand_m":          round(hand_m, 1) if hand_m is not None else None,
            "slope_deg":       round(slope_d, 1) if slope_d is not None else None,
            "waterway_dist_m": waterway_dist_m,
        },
    }


def fetch_elevation_grid(lat: float, lon: float, radius_m: int) -> dict:
    region = ee.Geometry.Point([lon, lat]).buffer(radius_m).bounds()

    # Target ~40 samples across the diameter; clamp to native 30m minimum
    scale = max(30, int((radius_m * 2) / 40))
    dem_scaled = DEM.reproject(crs="EPSG:4326", scale=scale)

    sampled   = dem_scaled.sampleRectangle(region=region, defaultValue=-9999)
    array_2d  = sampled.get("elevation").getInfo()
    rows      = len(array_2d)
    cols      = len(array_2d[0]) if rows else 0

    # Bounding box for georeferencing on the frontend
    bbox = region.bounds().getInfo()["coordinates"][0]
    west, south = bbox[0]
    east, north = bbox[2]

    return {
        "grid":   array_2d,
        "rows":   rows,
        "cols":   cols,
        "bounds": {"north": north, "south": south, "east": east, "west": west},
        "scale_m": scale,
        "radius_m": radius_m,
    }


def fetch_drainage_geojson(lat: float, lon: float, radius_m: int) -> dict:
    """
    Sample MERIT upstream-area raster on a grid and return channel pixels
    as GeoJSON points. Uses ee.Image.sample() — works with Viewer permissions,
    no thumbnail creation needed.
    Channels defined as UPA > 10 km² (meaningful stream network).
    """
    region   = ee.Geometry.Point([lon, lat]).buffer(radius_m)
    channels = UPA.updateMask(UPA.gt(10))

    # Sample at ~200m spacing — gives a manageable number of points
    # and still shows channel routing clearly at zoom 14-15
    scale = max(200, radius_m // 10)

    points = channels.sample(
        region=region,
        scale=scale,
        geometries=True,
        dropNulls=True,
    )

    raw = points.getInfo()  # returns a GeoJSON FeatureCollection

    # Slim the payload — only keep coordinates and upa value
    features = [
        {
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {"upa": round(f["properties"].get("upa", 0), 1)},
        }
        for f in raw.get("features", [])
    ]

    return {"type": "FeatureCollection", "features": features}


@app.get("/elevation-grid")
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


@app.get("/flood-risk")
def get_flood_risk(
    lat:             float = Query(..., ge=-90, le=90),
    lon:             float = Query(..., ge=-180, le=180),
    radius_m:        int   = Query(200, ge=50, le=5000),
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


@app.get("/drainage-geojson")
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


# ─── Topo PDF export ──────────────────────────────────────────────────────────

def _contour_levels(grid_flat: list, interval: Optional[int] = None) -> list:
    valid = [v for v in grid_flat if v != -9999 and not math.isnan(v)]
    if not valid:
        return []
    lo, hi = min(valid), max(valid)
    rng = hi - lo
    if interval is None:
        interval = 2 if rng < 30 else 5 if rng < 100 else 10 if rng < 300 else 25
    start = math.ceil(lo / interval) * interval
    return list(range(int(start), int(hi), interval))


def generate_topo_pdf(lat: float, lon: float, radius_m: int, title: str) -> bytes:
    # ── Fetch data (all cached after first pin click) ──────────────────────
    grid_data = fetch_elevation_grid(lat, lon, radius_m)
    try:
        osm_data = fetch_osm_context(lat, lon)
    except Exception:
        osm_data = None

    bounds = grid_data["bounds"]
    rows, cols = grid_data["rows"], grid_data["cols"]
    grid_np = np.array(grid_data["grid"], dtype=float)
    grid_np[grid_np == -9999] = np.nan

    # lon/lat axes matching the GEE sampleRectangle output (row 0 = north)
    lon_axis = np.linspace(bounds["west"],  bounds["east"],  cols)
    lat_axis = np.linspace(bounds["north"], bounds["south"], rows)

    # ── Figure setup — A4 landscape ────────────────────────────────────────
    fig = plt.figure(figsize=(11.69, 8.27))

    # Layout: main map + right info strip
    ax = fig.add_axes([0.06, 0.10, 0.70, 0.82])          # map frame
    ax_info = fig.add_axes([0.78, 0.10, 0.20, 0.82])     # info strip
    ax_info.axis("off")

    # ── Contours ───────────────────────────────────────────────────────────
    levels = _contour_levels(grid_np.flatten().tolist())
    if levels:
        cs = ax.contour(
            lon_axis, lat_axis, grid_np,
            levels=levels,
            colors="#7B4F2E",
            linewidths=0.6,
        )
        ax.clabel(cs, inline=True, fontsize=5, fmt="%dm",
                  colors="#5a3920",
                  inline_spacing=2)

    # ── OSM roads ──────────────────────────────────────────────────────────
    if osm_data:
        ROAD_COLORS = {
            "major road":     "#c0622a",
            "secondary road": "#c0832a",
            "local road":     "#a09070",
            "track / path":   "#c8c0b0",
        }
        for road in osm_data.get("roads", []):
            geom = road.get("geometry", [])
            if len(geom) >= 2:
                xs = [p["lon"] for p in geom]
                ys = [p["lat"] for p in geom]
                ax.plot(xs, ys, color=ROAD_COLORS.get(road["type"], "#a09070"),
                        linewidth=0.8, solid_capstyle="round")

        for ww in osm_data.get("waterways", []):
            geom = ww.get("geometry", [])
            if len(geom) >= 2:
                xs = [p["lon"] for p in geom]
                ys = [p["lat"] for p in geom]
                ax.plot(xs, ys, color="#3a8fc7", linewidth=0.9,
                        linestyle="--", solid_capstyle="round")

        for am in osm_data.get("amenities", []):
            COLORS = {"education": "#7b52ab", "health": "#c0392b",
                      "emergency": "#e74c3c", "commerce": "#2ecc71"}
            ax.plot(am["lon"], am["lat"], "o",
                    color=COLORS.get(am["group"], "#555"),
                    markersize=3, zorder=4)

    # ── Site pin ───────────────────────────────────────────────────────────
    ax.plot(lon, lat, "r^", markersize=7, zorder=5, label="Site")
    ax.plot(lon, lat, "r^", markersize=7, zorder=5,
            path_effects=[pe.withStroke(linewidth=2, foreground="white")])

    # ── Axis formatting ────────────────────────────────────────────────────
    ax.set_xlim(bounds["west"],  bounds["east"])
    ax.set_ylim(bounds["south"], bounds["north"])
    ax.set_xlabel("Longitude", fontsize=7)
    ax.set_ylabel("Latitude",  fontsize=7)
    ax.tick_params(labelsize=6)
    ax.grid(True, linestyle=":", linewidth=0.3, alpha=0.5, color="#999")
    for spine in ax.spines.values():
        spine.set_linewidth(0.8)

    # ── Scale bar ──────────────────────────────────────────────────────────
    km_per_deg = 111.32 * math.cos(math.radians(lat))
    map_width_km = (bounds["east"] - bounds["west"]) * km_per_deg
    bar_km = max(0.1, round(map_width_km / 4, 1))
    bar_deg = bar_km / km_per_deg

    sb_x = bounds["west"]  + 0.04 * (bounds["east"] - bounds["west"])
    sb_y = bounds["south"] + 0.04 * (bounds["north"] - bounds["south"])
    dy   = 0.004 * (bounds["north"] - bounds["south"])

    ax.fill_between([sb_x, sb_x + bar_deg / 2], [sb_y, sb_y], [sb_y + dy, sb_y + dy],
                    color="black")
    ax.fill_between([sb_x + bar_deg / 2, sb_x + bar_deg], [sb_y, sb_y], [sb_y + dy, sb_y + dy],
                    color="white", edgecolor="black", linewidth=0.5)
    ax.text(sb_x, sb_y - dy * 0.8, "0", fontsize=5, ha="center")
    ax.text(sb_x + bar_deg, sb_y - dy * 0.8, f"{bar_km:.1f}km", fontsize=5, ha="center")

    # ── North arrow ────────────────────────────────────────────────────────
    na_x = bounds["east"]  - 0.06 * (bounds["east"] - bounds["west"])
    na_y = bounds["north"] - 0.06 * (bounds["north"] - bounds["south"])
    arr_len = 0.025 * (bounds["north"] - bounds["south"])
    ax.annotate("", xy=(na_x, na_y), xytext=(na_x, na_y - arr_len),
                arrowprops=dict(arrowstyle="-|>", color="black", lw=1.2))
    ax.text(na_x, na_y + arr_len * 0.3, "N", ha="center", va="bottom",
            fontsize=7, fontweight="bold")

    # ── Info strip ─────────────────────────────────────────────────────────
    info_y = 0.97
    def info_line(text, y, size=7, bold=False, color="black"):
        ax_info.text(0.02, y, text, transform=ax_info.transAxes,
                     fontsize=size, fontweight="bold" if bold else "normal",
                     color=color, va="top", wrap=True)

    info_line(title, info_y, size=9, bold=True)
    info_y -= 0.06
    info_line(f"Lat: {lat:.5f}  Lon: {lon:.5f}", info_y, size=6.5)
    info_y -= 0.04
    info_line(f"Analysis radius: {radius_m}m", info_y, size=6.5)
    info_y -= 0.04
    info_line(f"Elevation range:", info_y, size=6.5, bold=True)
    valid = grid_np[~np.isnan(grid_np)]
    if valid.size:
        info_y -= 0.035
        info_line(f"  Min: {valid.min():.0f}m", info_y, size=6.5)
        info_y -= 0.03
        info_line(f"  Max: {valid.max():.0f}m", info_y, size=6.5)
        info_y -= 0.03
        info_line(f"  Range: {valid.max()-valid.min():.0f}m", info_y, size=6.5)

    # Legend
    info_y -= 0.07
    info_line("Legend", info_y, size=7, bold=True)
    legend_items = [
        ("#7B4F2E", "─",  "Contours (5m interval)"),
        ("#c0622a", "─",  "Major road"),
        ("#c0832a", "─",  "Secondary road"),
        ("#a09070", "─",  "Local road"),
        ("#3a8fc7", "--", "Waterway"),
        ("#ff0000", "▲",  "Site pin"),
        ("#7b52ab", "●",  "Education"),
        ("#c0392b", "●",  "Health facility"),
    ]
    for color, sym, label in legend_items:
        info_y -= 0.04
        ax_info.text(0.04, info_y, sym, transform=ax_info.transAxes,
                     fontsize=8, color=color, va="top")
        ax_info.text(0.18, info_y, label, transform=ax_info.transAxes,
                     fontsize=6, va="top")

    # Data sources footer
    info_y -= 0.07
    info_line("Data sources:", info_y, size=6, bold=True)
    info_y -= 0.035
    info_line("Elevation: SRTM 30m (NASA/USGS)", info_y, size=5.5, color="#555")
    info_y -= 0.03
    info_line("Context: OpenStreetMap contributors", info_y, size=5.5, color="#555")
    info_y -= 0.03
    info_line("Indicative use only. Not a licensed survey.", info_y, size=5.5, color="#888")

    # ── Figure title + footer ──────────────────────────────────────────────
    import datetime
    fig.text(0.06, 0.96, title, fontsize=11, fontweight="bold", va="bottom")
    fig.text(0.06, 0.03,
             f"Generated by Site Intelligence · {datetime.date.today().isoformat()} · "
             f"sakinsiteintel.vercel.app",
             fontsize=6, color="#888")

    # ── Export to PDF bytes ────────────────────────────────────────────────
    buf = io.BytesIO()
    fig.savefig(buf, format="pdf", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


@app.get("/topo-pdf", response_class=Response)
def get_topo_pdf(
    lat:      float = Query(..., ge=-90,   le=90),
    lon:      float = Query(..., ge=-180,  le=180),
    radius_m: int   = Query(500, ge=100,   le=2500),
    title:    str   = Query("Site Topographic Map"),
):
    try:
        pdf_bytes = generate_topo_pdf(lat, lon, radius_m, title)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"PDF generation error: {exc}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="site_topo_{round(lat,4)}_{round(lon,4)}.pdf"'},
    )