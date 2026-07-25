from fastapi import APIRouter, Depends

from app.services.supabase_service import get_supabase
from app.utils.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's profile from the public.users table.
    The JWT payload (user["sub"] = Supabase user UUID) is used to look up the row
    created automatically by the on_auth_user_created trigger.
    """
    sb      = get_supabase()
    user_id = user["sub"]

    result = (
        sb.table("users")
        .select("id, email, display_name, avatar_url, created_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data or {"id": user_id, "email": user.get("email")}