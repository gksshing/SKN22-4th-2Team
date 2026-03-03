import os
from sqlalchemy import create_engine, text

# Get DB URL from env or use default
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    print("ERORR: DATABASE_URL not set.")
    exit(1)

if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

try:
    engine = create_engine(database_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT email, hashed_password FROM \"user\""))
        users = result.fetchall()
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"Email: {u[0]} | Hash Start: {u[1][:10]}...")
except Exception as e:
    print(f"Error checking DB: {e}")
