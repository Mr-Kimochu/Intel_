from app.services.geocoding_service import geocode_location

from app.services.gee import fetch_elevation
from app.services.terrain_service import fetch_terrain_stats
from app.services.flood_service import fetch_flood_risk
from app.services.soil_service import fetch_soil
from app.services.climate_service import fetch_climate_solar
from app.services.landcover_service import fetch_land_cover
from app.services.osm_service import fetch_osm_context

from app.services.recommendation_service import calculate_suitability


class AnalysisService:

    @staticmethod
    def run_from_location(location: str, radius_m: int = 500):
        """
        Convert a location name to coordinates and run the complete analysis.
        """

        lat, lon = geocode_location(location)

        return AnalysisService.run_from_coordinates(
            lat=lat,
            lon=lon,
            radius_m=radius_m,
            location_name=location,
        )

    @staticmethod
    def run_from_coordinates(
        lat: float,
        lon: float,
        radius_m: int = 500,
        location_name: str | None = None,
    ):
        """
        Run the complete geospatial analysis.
        Every service is executed safely so that one failure
        doesn't stop the whole analysis.
        """

        report = {
            "location": location_name,
            "coordinates": {
                "lat": lat,
                "lon": lon,
            },
        }

        # -------------------------
        # Elevation
        # -------------------------
        report["elevation"] = AnalysisService._safe_run(
            "Elevation",
            fetch_elevation,
            lat,
            lon,
        )

        # -------------------------
        # Terrain
        # -------------------------
        report["terrain"] = AnalysisService._safe_run(
            "Terrain",
            fetch_terrain_stats,
            lat,
            lon,
            radius_m,
        )

        # -------------------------
        # Flood Risk
        # -------------------------
        report["flood_risk"] = AnalysisService._safe_run(
            "Flood Risk",
            fetch_flood_risk,
            lat=lat,
            lon=lon,
            radius_m=radius_m,
            waterway_dist_m=None,
        )

        # -------------------------
        # Soil
        # -------------------------
        report["soil"] = AnalysisService._safe_run(
            "Soil",
            fetch_soil,
            lat,
            lon,
        )

        # -------------------------
        # Climate
        # -------------------------
        report["climate"] = AnalysisService._safe_run(
            "Climate",
            fetch_climate_solar,
            lat,
            lon,
        )

        # -------------------------
        # Land Cover
        # -------------------------
        report["land_cover"] = AnalysisService._safe_run(
            "Land Cover",
            fetch_land_cover,
            lat,
            lon,
            radius_m,
        )

        # -------------------------
        # OSM Context
        # -------------------------
        report["osm_context"] = AnalysisService._safe_run(
            "OSM Context",
            fetch_osm_context,
            lat,
            lon,
            radius_m,
        )

        # -------------------------
        # Recommendation Engine
        # -------------------------
        report["recommendation"] = calculate_suitability(report)

        return report

    @staticmethod
    def _safe_run(name, func, *args, **kwargs):
        """
        Executes a service safely.

        If one service fails, the rest of the analysis
        continues instead of returning HTTP 500.
        """
        try:
            return func(*args, **kwargs)

        except Exception as e:

            print(f"{name} failed: {e}")

            return {
                "status": "error",
                "message": str(e)
            }
