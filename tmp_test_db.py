import sys
from pathlib import Path

# Fix python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.database.connection import SessionLocal
from src.database.models import UserSession, SearchHistory

def test_db():
    print("Testing DB connection and Foreign Key cascades...")
    db = SessionLocal()
    try:
        # Create user session
        session_id = "test-session-123"
        user_session = UserSession(session_id=session_id, ip_address="127.0.0.1")
        db.add(user_session)
        db.commit()
        db.refresh(user_session)
        
        # Create SearchHistory linked to UserSession
        search_history = SearchHistory(
            session_id=session_id,
            user_idea="Test AI patent",
            result_json='{"status": "ok"}',
            risk_level="High",
            score=85
        )
        db.add(search_history)
        db.commit()
        
        # Verify
        stored_session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        print(f"Found UserSession: {stored_session.session_id} with {len(stored_session.searches)} searches.")
        
        # Test Cascade Delete
        db.delete(stored_session)
        db.commit()
        
        # Verify deletion cascades to SearchHistory
        searches_count = db.query(SearchHistory).filter(SearchHistory.session_id == session_id).count()
        print(f"Remaining searches after user_session deletion: {searches_count}")
        assert searches_count == 0, "Cascade delete failed!"
        print("Success! All DB schema queries, constraints, and cascades are working.")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_db()
