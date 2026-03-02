import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from src.database.connection import get_db
from src.database.models import User, UserSession
from src.api.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from src.api.services.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from src.api.dependencies import get_current_user
from src.api.services.social_auth import SocialAuthService
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
    
    # 3. 브라우저 세션과 사용자 계정 연동 (Priority 2)
    if user_in.session_id:
        try:
            existing_session = db.query(UserSession).filter(UserSession.session_id == user_in.session_id).first()
            if existing_session:
                existing_session.user_id = user.id
            else:
                new_session = UserSession(session_id=user_in.session_id, user_id=user.id)
                db.add(new_session)
            db.commit()
            logger.info(f"Linked session {user_in.session_id} to user {user.email}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to link session to user: {e}")
            # 인증 자체는 성공했으므로 에러를 던지지는 않음 (히스토리 연동만 실패)

    return {
        "status": "success",
        "message": "로그인에 성공하였습니다.",
        "user": {
            "id": user.id,
            "email": user.email
        }
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

from fastapi.concurrency import run_in_threadpool

# --- Social Login Callbacks ---

def handle_social_login(user_info: dict, provider: str, db: Session, response: Response):
    """소셜 유저 정보를 바탕으로 로그인/회원가입 처리를 수행합니다.
    이 함수는 동기식 DB 연산을 수행하므로 run_in_threadpool을 통해 호출되어야 합니다.
    """
    email = user_info.get("email")
    social_id = str(user_info.get("id") or user_info.get("sub"))
    
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="소셜 계정에서 이메일 정보를 가져올 수 없습니다.")

    # 1. 기존 유저 확인 (이메일 기준)
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        # 기존 유저가 있으나 소셜 정보가 없는 경우 업데이트 (계정 연결)
        if not user.social_id:
            user.social_provider = provider
            user.social_id = social_id
            db.commit()
    else:
        # 신규 유저 생성
        user = User(
            email=email,
            social_provider=provider,
            social_id=social_id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. 토큰 생성 및 쿠키 설정
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="lax", max_age=3600)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="lax", max_age=86400 * 7)
    
    return {
        "status": "success",
        "message": f"{provider} 로그인에 성공하였습니다.",
        "user": {"id": user.id, "email": user.email}
    }

@router.get("/callback/google")
async def google_callback(code: str, response: Response, db: Session = Depends(get_db)):
    user_info = await SocialAuthService.get_google_user(code)
    return await run_in_threadpool(handle_social_login, user_info, "google", db, response)

@router.get("/callback/naver")
async def naver_callback(code: str, state: str, response: Response, db: Session = Depends(get_db)):
    user_info = await SocialAuthService.get_naver_user(code, state)
    return await run_in_threadpool(handle_social_login, user_info, "naver", db, response)

@router.get("/callback/kakao")
async def kakao_callback(code: str, response: Response, db: Session = Depends(get_db)):
    user_info = await SocialAuthService.get_kakao_user(code)
    return await run_in_threadpool(handle_social_login, user_info, "kakao", db, response)
