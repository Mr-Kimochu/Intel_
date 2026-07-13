from typing import Optional

import ee

from app.services.gee import HAND, SLOPE, UPA


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
