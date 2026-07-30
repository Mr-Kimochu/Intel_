def format_sms_report(report: dict, service: str) -> str:
    """
    Converts the analysis report into a short SMS.
    """

    recommendation = report.get("recommendation", {})
    location = report.get("location", "Unknown")

    score = recommendation.get("score", "N/A")
    rating = recommendation.get("rating", "Unknown")
    reasons = recommendation.get("reasons", [])
    advice = recommendation.get(
        "recommendation",
        "No recommendation available."
    )

    bullets = "\n".join(
        f"• {reason}" for reason in reasons[:2]
    )

    if service == "site":

        return (
            f"SiteIntel\n\n"
            f"Location: {location}\n"
            f"Suitability: {score}/100\n"
            f"Rating: {rating}\n\n"
            f"{bullets}\n\n"
            f"{advice}\n\n"
            f"Reply ASSESS for another analysis."
        )

    elif service == "flood":

        flood = report.get("flood_risk", {})

        risk = (
            flood.get("risk")
            or flood.get("risk_level")
            or flood.get("classification")
            or rating
        )

        return (
            f"Flood Assessment\n\n"
            f"Location: {location}\n"
            f"Flood Risk: {risk}\n\n"
            f"{advice}\n\n"
            f"Reply ASSESS for another analysis."
        )

    elif service == "climate":

        climate = report.get("climate", {})

        rainfall = (
            climate.get("annual_rainfall")
            or climate.get("rainfall")
            or "N/A"
        )

        return (
            f"Climate Outlook\n\n"
            f"Location: {location}\n"
            f"Rainfall: {rainfall}\n\n"
            f"{advice}\n\n"
            f"Reply ASSESS for another analysis."
        )

    return (
        f"Analysis completed for {location}.\n"
        f"Score: {score}/100"
    )
