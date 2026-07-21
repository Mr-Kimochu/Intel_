from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from app.services.supabase_service import get_supabase
from app.utils.auth import get_current_user

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("")
def list_sites(user: dict = Depends(get_current_user)):
    """Return all sites for the authenticated user, newest first."""
    sb     = get_supabase()
    result = (
        sb.table("sites")
        .select("*, analyses(count)")
        .eq("user_id", user["sub"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("")
def create_site(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """
    Create a named site.
    Required body fields: name, lat, lon
    Optional: description, radius_m
    """
    sb      = get_supabase()
    user_id = user["sub"]

    if not body.get("name") or body.get("lat") is None or body.get("lon") is None:
        raise HTTPException(status_code=422, detail="name, lat, and lon are required")

    result = (
        sb.table("sites")
        .insert({
            "user_id":     user_id,
            "name":        body["name"].strip(),
            "description": body.get("description"),
            "lat":         body["lat"],
            "lon":         body["lon"],
            "radius_m":    body.get("radius_m", 500),
        })
        .execute()
    )
    return result.data[0]


@router.patch("/{site_id}")
def update_site(
    site_id: str,
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Update a site's name or description. Only the owner can update."""
    sb = get_supabase()

    allowed = {k: body[k] for k in ("name", "description", "radius_m") if k in body}
    if not allowed:
        raise HTTPException(status_code=422, detail="Nothing to update")

    result = (
        sb.table("sites")
        .update(allowed)
        .eq("id", site_id)
        .eq("user_id", user["sub"])   # ownership check
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Site not found")
    return result.data[0]


@router.delete("/{site_id}")
def delete_site(site_id: str, user: dict = Depends(get_current_user)):
    """
    Delete a site and all its associated analyses (cascade in DB).
    Only the owner can delete.
    """
    sb = get_supabase()
    sb.table("sites").delete().eq("id", site_id).eq("user_id", user["sub"]).execute()
    return {"deleted": True, "site_id": site_id}