import os
import secrets
import hashlib
from typing import Optional
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "praman")

print("MongoDB URI found:", bool(MONGODB_URI))

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DATABASE]

users_collection = db["users"]
otps_collection = db["otp_verifications"]

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    check_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(check_hash, hashed)

def hash_otp(otp_code: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Cryptographically hash a 6-digit OTP using PBKDF2-HMAC-SHA256."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        otp_code.strip().encode('utf-8'),
        salt.encode('utf-8'),
        50000
    ).hex()
    return hashed, salt

def verify_otp_hash(otp_code: str, stored_hash: str, salt: str) -> bool:
    """Verify an entered OTP against the stored cryptographic hash."""
    check_hash, _ = hash_otp(otp_code, salt)
    return secrets.compare_digest(check_hash, stored_hash)

def init_db_indexes():
    try:
        client.admin.command("ping")
        print("MongoDB connected successfully!")
        
        # Ensure indexes on users collection
        users_collection.create_index([("email", ASCENDING)], unique=True, sparse=True)
        users_collection.create_index([("mobile_number", ASCENDING)], unique=True, sparse=True)
        users_collection.create_index([("full_name", ASCENDING)])
        
        # Ensure indexes on otps collection
        otps_collection.create_index([("identifier", ASCENDING), ("otp_type", ASCENDING), ("is_verified", ASCENDING)])
        otps_collection.create_index([("identifier", ASCENDING), ("created_at", ASCENDING)])
        otps_collection.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    except Exception as e:
        print("MongoDB connection / index setup notice:", e)

init_db_indexes()