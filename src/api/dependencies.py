import logging
from fastapi import Request, Depends
from sqlalchemy.orm import Session
from src.patent_agent import PatentAgent
from src.history_manager import HistoryManager
from src.database.connection import get_db

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

def get_history_manager(db: Session = Depends(get_db)) -> HistoryManager:
    """Provides a HistoryManager instance with the active DB session."""
    return HistoryManager(db=db)

