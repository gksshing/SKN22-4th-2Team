"""
Auth 라우터: 회원가입 / 로그인 / 내 정보 조회
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import User
from src.api.schemas.auth_schema import SignupRequest, LoginRequest, TokenResponse, UserResponse
from src.api.services.security import get_password_hash, verify_password, create_access_token, decode_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="회원가입")
async def signup(
    request: SignupRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """이메일/비밀번호로 회원가입"""
    try:
        # 이메일 중복 확인
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 사용 중인 이메일입니다.",
            )

        # 비밀번호 해싱 후 저장
        hashed_pw = get_password_hash(request.password)
        user = User(
            email=request.email,
            hashed_password=hashed_pw,
            name=request.name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"새 사용자 가입: {user.email} (id={user.id})")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회원가입 처리 중 오류: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")


@router.post("/login", response_model=TokenResponse, summary="로그인")
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """이메일/비밀번호 검증 후 JWT Access Token 발급"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="비활성화된 계정입니다.",
            )

        token = create_access_token(data={"sub": str(user.id), "email": user.email})
        logger.info(f"로그인 성공: {user.email} (id={user.id})")
        return TokenResponse(access_token=token)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] 로그인 처리 중 예외 발생: {str(e)} (Email: {request.email})", exc_info=True)
        raise HTTPException(status_code=500, detail=f"로그인 처리 중 오류가 발생했습니다: {str(e)}")


@router.get("/me", response_model=UserResponse, summary="내 정보 조회")
async def get_me(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserResponse:
    """JWT 토큰 검증 후 현재 로그인 사용자 정보 반환"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 없습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않거나 만료된 토큰입니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰 페이로드 오류")

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/me 처리 중 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="사용자 정보 조회 중 오류가 발생했습니다.")
