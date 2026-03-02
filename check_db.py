import sqlite3
from pathlib import Path

db_path = Path("c:/Workspaces/SKN22-4th-2Team/src/data/history.db")
if not db_path.exists():
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:", [t[0] for t in tables])
    conn.close()
