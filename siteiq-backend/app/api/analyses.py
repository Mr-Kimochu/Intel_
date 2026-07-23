from fastapi import APIRouter, Body, Depends, HTTPException

from app.services.supabase_service import get_supabase
from app.utils.auth import get_current_user

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.get("")
def list_analyses(user: dict = Depends(get_current_user)):
    """
    Return all analyses for the user, newest first.
    Joins site name/location so the list is displayable without extra queries.
    """
    sb     = get_supabase()
    result = (
        sb.table("analyses")
        .select(
            "id, radius_m, notes, created_at, "
            "sites(id, name, lat, lon), "
            "flood_risk->risk->>level, "
            "terrain->point->>elevation_m"
        )
        .eq("user_id", user["sub"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    """
    Return a single full analysis including all jsonb data layers.
    Used to restore the full panel state from a saved analysis.
    """
    sb     = get_supabase()
    result = (
        sb.table("analyses")
        .select("*, sites(id, name, lat, lon, radius_m)")
        .eq("id", analysis_id)
        .eq("user_id", user["sub"])
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result.data


@router.post("")
def save_analysis(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """
    Save a complete analysis snapshot.

    If site_id is provided the analysis attaches to that existing site.
    If not, a new site row is created using site_name / lat / lon.

    Body:
      site_id?      uuid   — attach to existing site
      site_name?    str    — name for new site (required if no site_id)
      lat           float
      lon           float
      radius_m      int
      notes?        str
      elevation?    dict   — raw API response
      terrain?      dict
      flood_risk?   dict
      soil?         dict
      climate_solar? dict
      land_cover?   dict
      osm_context?  dict
    """
    sb      = get_supabase()
    user_id = user["sub"]

    if body.get("lat") is None or body.get("lon") is None:
        raise HTTPException(status_code=422, detail="lat and lon are required")

    # ── Resolve or create site ─────────────────────────────────────────────
    site_id = body.get("site_id")

    if not site_id:
        site_name = (body.get("site_name") or "").strip() or "Unnamed Site"
        site_res  = (
            sb.table("sites")
            .insert({
                "user_id":  user_id,
                "name":     site_name,
                "lat":      body["lat"],
                "lon":      body["lon"],
                "radius_m": body.get("radius_m", 500),
            })
            .execute()
        )
        site_id = site_res.data[0]["id"]
    else:
        # Verify ownership before attaching
        check = (
            sb.table("sites")
            .select("id")
            .eq("id", site_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if not check.data:
            raise HTTPException(status_code=404, detail="Site not found")

    # ── Save analysis row ──────────────────────────────────────────────────
    analysis_res = (
        sb.table("analyses")
        .insert({
            "site_id":      site_id,
            "user_id":      user_id,
            "radius_m":     body.get("radius_m", 500),
            "notes":        body.get("notes"),
            "elevation":    body.get("elevation"),
            "terrain":      body.get("terrain"),
            "flood_risk":   body.get("flood_risk"),
            "soil":         body.get("soil"),
            "climate_solar": body.get("climate_solar"),
            "land_cover":   body.get("land_cover"),
            "osm_context":  body.get("osm_context"),
        })
        .execute()
    )

    analysis = analysis_res.data[0]
    return {
        "site_id":     site_id,
        "analysis_id": analysis["id"],
        "created_at":  analysis["created_at"],
    }


@router.delete("/{analysis_id}")
def delete_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    """Delete one analysis. Only the owner can delete."""
    sb = get_supabase()
    sb.table("analyses").delete() \
      .eq("id", analysis_id) \
      .eq("user_id", user["sub"]) \
      .execute()
    return {"deleted": True, "analysis_id": analysis_id}