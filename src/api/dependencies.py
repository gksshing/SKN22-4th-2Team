import logging
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.patent_agent import PatentAgent
from src.history_manager import HistoryManager
from src.database.connection import get_db
from src.api.services.security import decode_token

logger = logging.getLogger(__name__)

# 싱글턴 인스턴스 재사용
_patent_agent = None

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

def get_current_user(request: Request) -> str:
    """Extracts user identity from the access_token cookie."""
    token = request.cookies.get("access_token")
    if not token:
        logger.warning("Access token missing in cookies.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 누락되었습니다. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        logger.warning(f"Invalid or expired token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 사용자 정보가 없습니다."
        )
    
    return email

def get_history_manager(db: Session = Depends(get_db)) -> HistoryManager:
    """Provides a HistoryManager instance with the active DB session."""
    return HistoryManager(db=db)
