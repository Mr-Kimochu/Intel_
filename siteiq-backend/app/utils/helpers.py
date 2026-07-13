from typing import List, Optional

import requests


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


def classify_waterway(waterway_val: str) -> str:
    if waterway_val in {"river", "canal"}:
        return "river"
    if waterway_val in {"stream", "drain"}:
        return "stream"
    return "waterway"


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


def nearest_road_distance(roads: List[dict]) -> Optional[int]:
    return roads[0]["distance_m"] if roads else None


def nearest_waterway_distance(waterways: List[dict]) -> Optional[int]:
    return waterways[0]["distance_m"] if waterways else None


def grid_connected(power: List[dict]) -> bool:
    return len(power) > 0


BUILDING_TYPES = {
    "yes": "building", "house": "residential", "residential": "residential",
    "apartments": "residential", "commercial": "commercial", "retail": "commercial",
    "office": "commercial", "industrial": "industrial", "warehouse": "industrial",
    "school": "education", "college": "education", "university": "education",
    "hospital": "health", "clinic": "health", "church": "worship",
    "mosque": "worship", "temple": "worship",
}


VEGETATION_MAP = {
    "forest": "forest", "wood": "forest",
    "farmland": "farmland", "orchard": "farmland", "vineyard": "farmland",
    "meadow": "grassland", "grass": "grassland", "grassland": "grassland",
    "scrub": "scrub", "heath": "scrub", "bush": "scrub",
    "wetland": "wetland", "marsh": "wetland",
}


# ── Soil texture interpretation for construction ──────────────────────────────
TEXTURE_META = {
    1:  ("Clay",           "high",        "Very high clay. Significant expansive soil risk — specialist geotechnical assessment strongly recommended."),
    2:  ("Silty clay",     "high",        "High clay. Likely expansive. Foundation design must account for swell/shrink behaviour."),
    3:  ("Sandy clay",     "medium-high", "High clay component. Potential swelling in wet season. Investigate further."),
    4:  ("Clay loam",      "medium",      "Moderate clay. Check for seasonal movement in foundation design."),
    5:  ("Silty clay loam","medium",      "Moderate clay with slow drainage. Adequate foundation depth required."),
    6:  ("Sandy clay loam","medium",      "Mixed texture. Generally manageable with standard strip/pad foundations."),
    7:  ("Loam",           "low",         "Balanced texture. Good bearing capacity. Suitable for most standard foundations."),
    8:  ("Silt loam",      "low",         "Good bearing. Low expansion risk. Standard foundations appropriate."),
    9:  ("Sandy loam",     "low",         "Good drainage and bearing. Watch for erosion on slopes."),
    10: ("Silt",           "medium",      "Fine-grained. Can compress when saturated. Assess drainage carefully."),
    11: ("Loamy sand",     "low",         "Good drainage. Standard foundations appropriate."),
    12: ("Sand",           "low",         "Excellent drainage. Low cohesion — may need wider footings or compaction."),
}

RISK_COLORS = {
    "high":        "#ef4444",
    "medium-high": "#f97316",
    "medium":      "#f59e0b",
    "low":         "#22c55e",
}
