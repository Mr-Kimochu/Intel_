def calculate_suitability(report: dict):
    """
    Calculates a simple suitability score based on
    the analysis report.
    """

    score = 100
    reasons = []

    # ---------------- Flood ----------------

    flood = report.get("flood_risk", {})

    risk = str(
        flood.get("risk")
        or flood.get("risk_level")
        or flood.get("classification")
        or ""
    ).upper()

    if risk == "HIGH":
        score -= 40
        reasons.append("High flood risk")

    elif risk == "MODERATE":
        score -= 20
        reasons.append("Moderate flood risk")

    else:
        reasons.append("Low flood risk")

    # ---------------- Terrain ----------------

    terrain = report.get("terrain", {})

    slope = str(
        terrain.get("slope_class")
        or ""
    ).upper()

    if "STEEP" in slope:
        score -= 20
        reasons.append("Steep terrain")

    elif "MODERATE" in slope:
        score -= 10
        reasons.append("Moderate terrain")

    else:
        reasons.append("Gentle terrain")

    # ---------------- Soil ----------------

    soil = report.get("soil", {})

    texture = str(
        soil.get("texture")
        or ""
    ).lower()

    if "clay" in texture:
        score -= 10
        reasons.append("Clay soil")

    else:
        reasons.append("Suitable soil")

    # ---------------- Land Cover ----------------

    land_cover = report.get("land_cover", {})

    cover = str(
        land_cover.get("dominant_class")
        or ""
    ).lower()

    if "water" in cover:
        score -= 30
        reasons.append("Water body nearby")

    elif "wetland" in cover:
        score -= 25
        reasons.append("Wetland area")

    score = max(0, min(score, 100))

    if score >= 80:
        rating = "EXCELLENT"
        recommendation = "Suitable for development."

    elif score >= 60:
        rating = "GOOD"
        recommendation = "Suitable with minor precautions."

    elif score >= 40:
        rating = "FAIR"
        recommendation = "Further assessment recommended."

    else:
        rating = "POOR"
        recommendation = "Not recommended for development."

    return {
        "score": score,
        "rating": rating,
        "reasons": reasons,
        "recommendation": recommendation,
    }
