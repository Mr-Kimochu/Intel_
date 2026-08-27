import requests


class GeocodingError(Exception):
    """Raised when a location cannot be geocoded."""
    pass


def geocode_location(location: str):
    """
    Convert a location name into latitude and longitude using
    OpenStreetMap Nominatim.

    Returns:
        (latitude, longitude)
    """

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": location,
        "format": "json",
        "limit": 1,
    }

    headers = {
        "User-Agent": "SiteIntel/1.0"
    }

    try:
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10,
        )

        response.raise_for_status()

        data = response.json()

        if not data:
            raise GeocodingError(
                f"Location '{location}' was not found."
            )

        latitude = float(data[0]["lat"])
        longitude = float(data[0]["lon"])

        return latitude, longitude

    except requests.RequestException as e:
        raise GeocodingError(
            f"Failed to contact geocoding service: {e}"
        )
