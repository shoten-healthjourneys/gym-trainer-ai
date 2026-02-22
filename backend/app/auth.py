import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.config import settings

_bearer = HTTPBearer()

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0.0
_JWKS_TTL_SECONDS = 3600  # 1 hour


async def get_b2c_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    tenant = settings.B2C_TENANT_NAME
    policy = settings.B2C_POLICY_NAME
    url = (
        f"https://{tenant}.b2clogin.com/"
        f"{tenant}.onmicrosoft.com/{policy}/discovery/v2.0/keys"
    )

    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()

    _jwks_cache = resp.json()
    _jwks_cache_time = now
    return _jwks_cache


async def validate_token(token: str) -> dict:
    jwks = await get_b2c_jwks()

    tenant = settings.B2C_TENANT_NAME
    policy = settings.B2C_POLICY_NAME
    issuer = (
        f"https://{tenant}.b2clogin.com/"
        f"{tenant}.onmicrosoft.com/{policy}/v2.0/"
    )

    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.B2C_CLIENT_ID,
            issuer=issuer,
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc

    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    payload = await validate_token(credentials.credentials)
    user_id = payload.get("sub") or payload.get("oid")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier",
        )

    return {
        "user_id": user_id,
        "email": payload.get("emails", [None])[0] or payload.get("email", ""),
        "display_name": payload.get("name", ""),
    }
