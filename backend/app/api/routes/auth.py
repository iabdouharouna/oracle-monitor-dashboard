from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, create_tokens, oauth2_scheme, decode_token, TokenData
)
from app.core.models import Token, LoginRequest, User, UserCreate
from app.api.deps import get_current_user
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()

# In-memory user store for MVP (replace with database in production)
USERS_DB = {
    "admin": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": get_password_hash("admin123"),
        "role": "DBA",
        "is_active": True,
    },
    "viewer": {
        "id": 2,
        "username": "viewer",
        "email": "viewer@example.com",
        "hashed_password": get_password_hash("viewer123"),
        "role": "VIEWER",
        "is_active": True,
    },
}


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    tokens = create_tokens(user["username"], user["role"])
    logger.info("User logged in", username=user["username"], role=user["role"])
    return tokens


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        
        username = payload.get("sub")
        role = payload.get("role")
        if not username or username not in USERS_DB:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        
        user = USERS_DB[username]
        if not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user",
            )
        
        tokens = create_tokens(username, role)
        return tokens
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    user = USERS_DB.get(current_user.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return User(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        is_active=user["is_active"],
        created_at="2024-01-01T00:00:00Z",
    )


@router.post("/logout")
async def logout():
    # In a real app, you'd blacklist the token in Redis
    return {"message": "Successfully logged out"}