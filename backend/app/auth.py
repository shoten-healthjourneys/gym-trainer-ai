import logging
import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.config import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer()

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0.0
_JWKS_TTL_SECONDS = 3600  # 1 hour

# Dev mode constants
_DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
_DEV_TOKEN = "dev-token"


def _dev_user() -> dict:
    return {
        "user_id": _DEV_USER_ID,
        "email": "dev@gymtrainer.local",
        "display_name": "Dev User",
    }


async def get_ciam_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    tenant = settings.CIAM_TENANT_NAME
    url = (
        f"https://{tenant}.ciamlogin.com/"
        f"{tenant}.onmicrosoft.com/discovery/v2.0/keys"
    )

    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()

    _jwks_cache = resp.json()
    _jwks_cache_time = now
    return _jwks_cache


async def validate_token(token: str) -> dict:
    jwks = await get_ciam_jwks()

    tenant = settings.CIAM_TENANT_NAME
    issuer = (
        f"https://{tenant}.ciamlogin.com/"
        f"{tenant}.onmicrosoft.com/v2.0"
    )

    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.CIAM_CLIENT_ID,
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
    if settings.DEV_MODE and credentials.credentials == _DEV_TOKEN:
        logger.warning("DEV_MODE auth bypass — do not use in production")
        return _dev_user()

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
