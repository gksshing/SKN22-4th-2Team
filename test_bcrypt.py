from passlib.context import CryptContext
import bcrypt
import sys

print(f"Python version: {sys.version}")
print(f"Bcrypt version: {bcrypt.__version__}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "password123"
hashed = pwd_context.hash(password)
print(f"Hashed: {hashed}")

verified = pwd_context.verify(password, hashed)
print(f"Verified: {verified}")

if not verified:
    print("ERROR: Verification failed!")
else:
    print("SUCCESS: Verification works.")
