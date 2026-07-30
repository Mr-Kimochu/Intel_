from app.services.geocoding_service import geocode_location

lat, lon = geocode_location("Kitengela")

print(lat)
print(lon)
