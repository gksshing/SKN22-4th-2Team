"""
Auth 관련 Pydantic 스키마 정의
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SignupRequest(BaseModel):
    """회원가입 요청 스키마"""
    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., min_length=6, description="비밀번호 (최소 6자)")
    name: Optional[str] = Field(None, description="이름 (선택)")


class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., description="비밀번호")


class TokenResponse(BaseModel):
    """JWT 토큰 응답 스키마"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """로그인 사용자 정보 응답 스키마"""
    id: int
    email: str
    name: Optional[str] = None

    class Config:
        from_attributes = True
