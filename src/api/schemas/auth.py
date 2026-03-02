from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# =============================================================================
# User Schemas
# =============================================================================

class UserBase(BaseModel):
    """Base schema for user data."""
    email: EmailStr

class UserCreate(UserBase):
    """Schema for user registration."""
    password: str

class UserLogin(UserBase):
    """Schema for user login."""
    password: str
    session_id: Optional[str] = None

class UserResponse(UserBase):
    """Schema for user response (safe data)."""
    id: int
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

# =============================================================================
# Token Schemas
# =============================================================================

class Token(BaseModel):
    """Schema for JWT tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """Schema for data stored in the token."""
    email: Optional[str] = None
