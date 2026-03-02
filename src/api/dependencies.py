import logging
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from src.patent_agent import PatentAgent
from src.history_manager import HistoryManager
from src.database.connection import get_db
from src.database.models import User
from src.api.services.security import decode_token

logger = logging.getLogger(__name__)

# 싱글턴 인스턴스 재사용
_patent_agent = None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_patent_agent() -> PatentAgent:
    global _patent_agent
    if _patent_agent is None:
        logger.info("Initializing PatentAgent instance...")
        try:
            _patent_agent = PatentAgent()
            logger.info("PatentAgent initialized successfully.")
        except Exception as e:
            logger.error(
                f"PatentAgent 초기화 실패: {type(e).__name__}: {e}",
                exc_info=True,
            )
            raise
    return _patent_agent

def get_history_manager(db: Session = Depends(get_db)) -> HistoryManager:
    """Provides a HistoryManager instance with the active DB session."""
    return HistoryManager(db=db)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Bearer 토큰을 검증하고 현재 로그인 사용자를 반환합니다. 인증 필수 엔드포인트에서 사용."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Bearer 토큰이 있으면 사용자 반환, 없으면 None 반환합니다. 비로그인 허용 엔드포인트에서 사용."""
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload is None:
            return None
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None

