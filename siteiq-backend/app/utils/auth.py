import os
from typing import Optional

from fastapi import Header, HTTPException
from jose import JWTError, jwt

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


def _decode(token: str) -> dict:
    """
    Verify a Supabase-issued JWT using the project JWT secret.
    Raises HTTP 401 if the token is missing, expired, or tampered with.
    """
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_JWT_SECRET is not configured on the server.",
        )
    try:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    FastAPI dependency for protected routes.
    Requires a valid Supabase JWT in the Authorization header.

    Usage:
        @router.get("/protected")
        def protected(user: dict = Depends(get_current_user)):
            user_id = user["sub"]   # Supabase user UUID
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header required: Bearer <token>",
        )
    token = authorization.split(" ", 1)[1]
    return _decode(token)


async def get_optional_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """
    FastAPI dependency for routes that work both authenticated and not.
    Returns None if no token is present; raises 401 only if a bad token is sent.
    """
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        return _decode(token)
    except HTTPException:
        return None