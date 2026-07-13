from typing import Dict, List

import ee

from app.services.gee import ASPECT, DEM, SLOPE
from app.utils.geometry import offset_point
from app.utils.helpers import classify_slope


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
