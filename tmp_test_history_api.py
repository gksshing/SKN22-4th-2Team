import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.api.v1.router import router

app = FastAPI()
app.include_router(router, prefix="/api/v1")

def test_history_api():
    print("Testing GET /api/v1/history API Endpoint...")
    client = TestClient(app)
    
    # 1. Test with a specific user_id
    user_id = "ai-user-001"
    response = client.get(f"/api/v1/history?user_id={user_id}&limit=5")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    data = response.json()
    assert "user_id" in data
    assert "history" in data
    assert data["user_id"] == user_id
    
    print(f"Success! Retrieved {len(data['history'])} records for user: {user_id}")
    if data['history']:
        print(f"Sample Top Record Risk Level: {data['history'][0].get('risk_level', 'unknown')}")
        
    # 2. Test without user_id (should fallback to anonymous)
    response_anon = client.get("/api/v1/history")
    assert response_anon.status_code == 200
    
    data_anon = response_anon.json()
    assert data_anon["user_id"] == "anonymous"
    print(f"Success! Retrieved {len(data_anon['history'])} records for anonymous user.")
    
    print("All History API tests passed successfully!")

if __name__ == "__main__":
    test_history_api()
