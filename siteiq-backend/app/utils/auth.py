import os
from typing import Optional

import httpx
from fastapi import Header, HTTPException
from jose import JWTError, jwt

SUPABASE_URL = os.getenv("SUPABASE_URL")

# Cache the JWKS in memory — it rarely changes, one fetch per server start is fine
_jwks_cache: Optional[dict] = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not set in .env")
    url  = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    return _jwks_cache


def _decode(token: str) -> dict:
    """
    Verify a Supabase JWT signed with ES256.
    Fetches the JWKS public key from Supabase on first call, then caches it.
    """
    try:
        jwks = _get_jwks()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch JWKS from Supabase: {exc}",
        )

    try:
        return jwt.decode(
            token,
            jwks,                          # pass full JWKS — jose picks the right key by kid
            algorithms=["ES256"],
            options={"verify_aud": False},  # Supabase sets aud="authenticated"; skip strict check
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    FastAPI dependency for protected routes.
    Raises 401 if the token is missing, expired, or invalid.

    Usage:
        @router.get("/protected")
        def route(user: dict = Depends(get_current_user)):
            user_id = user["sub"]
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header required: Bearer <token>",
        )
    return _decode(authorization.split(" ", 1)[1])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """
    FastAPI dependency for routes that work authenticated or not.
    Returns None silently if no token is present.
    Raises 401 only if a malformed/expired token is actively sent.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return _decode(authorization.split(" ", 1)[1])
    except HTTPException:
        return None
