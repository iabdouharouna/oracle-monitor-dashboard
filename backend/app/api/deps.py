from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config import settings
from app.database import oracle_pool, get_db
from app.redis import redis_client
from app.core.security import oauth2_scheme, decode_token, TokenData
from app.core.models import User, UserRole

async def get_oracle_pool():
    yield oracle_pool

async def get_redis():
    yield redis_client

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        username = payload.get("sub")
        role = payload.get("role")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        return TokenData(username=username, role=role)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

async def get_current_dba(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role != UserRole.DBA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DBA role required",
        )
    return current_user

class PaginationParams:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        size: int = Query(50, ge=1, le=500, description="Page size"),
    ):
        self.page = page
        self.size = size
        self.offset = (page - 1) * size