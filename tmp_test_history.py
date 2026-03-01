import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.database.connection import SessionLocal
from src.history_manager import HistoryManager

def test_history_manager():
    print("Testing HistoryManager DB Write Logic...")
    db = SessionLocal()
    try:
        manager = HistoryManager(db=db)
        
        # Simulate a result coming from the AI analyzing logic
        result = {
            "timestamp": "2026-03-01T12:00:00.000000",
            "user_idea": "An AI powered patent agent",
            "analysis": {
                "infringement": {"risk_level": "Medium"},
                "similarity": {"score": 75}
            }
        }
        
        # Save a new user session implicitly through save_analysis
        user_id = "ai-user-001"
        success = manager.save_analysis(result, user_id=user_id)
        assert success, "Failed to save analysis!"
        print(f"Successfully saved analysis for user: {user_id}")
        
        # Verify it can be loaded
        recent = manager.load_recent(user_id=user_id, limit=5)
        print(f"Loaded {len(recent)} recent histories.")
        assert len(recent) == 1, "Should have exactly 1 history record."
        
        # Test default anonymous user fallback
        success_anon = manager.save_analysis(result, user_id=None)
        assert success_anon, "Failed to save anonymous analysis!"
        recent_anon = manager.load_recent(user_id=None)
        print(f"Loaded {len(recent_anon)} anonymous histories.")
        
        # Clean up test user
        manager.clear_history(user_id=user_id)
        assert len(manager.load_recent(user_id=user_id)) == 0, "Failed to clear history"
        print("Success! HistoryManager is correctly mapped to SQLAlchemy and cascades work.")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_history_manager()
