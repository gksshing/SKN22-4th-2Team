"""
History Manager - SQLAlchemy based persistent storage for analysis history.
"""
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.database.models import UserSession, SearchHistory

logger = logging.getLogger(__name__)

class HistoryManager:
    def __init__(self, db: Session):
        self.db = db
        
    def save_analysis(self, result: Dict, user_id: str):
        """Save analysis result to DB with session mapping."""
        try:
            # 1. Provide a default fallback if user_id is missing or anonymous
            session_id = user_id if user_id and user_id != "anonymous" else "anonymous_session"

            # 2. Check if UserSession exists, create if missing to prevent FK error
            user_session = self.db.query(UserSession).filter(UserSession.session_id == session_id).first()
            if not user_session:
                user_session = UserSession(session_id=session_id)
                self.db.add(user_session)
                self.db.commit()
                self.db.refresh(user_session)

            # 3. Extract metrics and save SearchHistory
            analysis = result.get('analysis', {})
            risk = analysis.get('infringement', {}).get('risk_level', 'unknown')
            score = analysis.get('similarity', {}).get('score', 0)
            
            # Ensure timestamp is a datetime object
            timestamp_str = result.get('timestamp', datetime.utcnow().isoformat())
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
            except ValueError:
                timestamp = datetime.utcnow()
                
            history_record = SearchHistory(
                session_id=session_id,
                user_idea=result.get('user_idea', ''),
                result_json=json.dumps(result, ensure_ascii=False),
                risk_level=risk,
                score=score,
                timestamp=timestamp
            )
            
            self.db.add(history_record)
            self.db.commit()
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error saving history: {e}", exc_info=True)
            return False
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error saving history: {e}", exc_info=True)
            return False
            
    def load_recent(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Load recent analysis history for specific user session."""
        try:
            session_id = user_id if user_id and user_id != "anonymous" else "anonymous_session"
            recent_histories = (
                self.db.query(SearchHistory)
                .filter(SearchHistory.session_id == session_id)
                .order_by(SearchHistory.id.desc())
                .limit(limit)
                .all()
            )
            history = [json.loads(record.result_json) for record in recent_histories]
            return history
        except Exception as e:
            logger.error(f"Failed to load recent history: {e}", exc_info=True)
            return []

    def find_cached_result(self, user_idea: str, user_id: str) -> Optional[Dict]:
        """Find the most recent identical query in history to act as a cache."""
        try:
            session_id = user_id if user_id and user_id != "anonymous" else "anonymous_session"
            cached = (
                self.db.query(SearchHistory)
                .filter(SearchHistory.session_id == session_id, SearchHistory.user_idea == user_idea)
                .order_by(SearchHistory.id.desc())
                .first()
            )
            
            if cached:
                return json.loads(cached.result_json)
            return None
        except Exception as e:
            logger.error(f"Failed to check cache history: {e}", exc_info=True)
            return None

    def clear_history(self, user_id: str):
        """Delete history for specific user session."""
        try:
            session_id = user_id if user_id and user_id != "anonymous" else "anonymous_session"
            user_session = self.db.query(UserSession).filter(UserSession.session_id == session_id).first()
            if user_session:
                self.db.delete(user_session)
                self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Failed to clear history for {user_id}: {e}", exc_info=True)
