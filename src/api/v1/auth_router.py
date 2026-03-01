import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from src.database.connection import get_db
from src.database.models import User
from src.api.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from src.api.services.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from src.api.dependencies import get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 이메일입니다."
        )
    
    # Create new user
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        logger.error(f"User registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원가입 처리 중 오류가 발생했습니다."
        )
    
    return new_user

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, response: Response, user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and issue JWTs via Set-Cookie (HttpOnly, Secure)."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비활성화된 계정입니다."
        )

    # Generate tokens
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # 1. Access Token Cookie 설정 (HttpOnly, Secure, SameSite=Lax)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # HTTPS 환경에서만 전송됨
        samesite="lax",
        max_age=3600  # 1시간
    )
    
    # 2. Refresh Token Cookie 설정
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400 * 7  # 7일
    )
    
    return {
        "status": "success",
        "message": "로그인에 성공하였습니다.",
        "user": {"email": user.email}
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current logged in user information."""
    user = db.query(User).filter(User.email == current_user).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    return user

@router.post("/logout")
def logout(response: Response):
    """Logout by clearing cookies."""
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"status": "success", "message": "로그아웃 되었습니다."}
