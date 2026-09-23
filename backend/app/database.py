import os
import secrets
import hashlib
import json
import re
import copy
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "praman")

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

class MockCursor:
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items

    def sort(self, key_or_list, direction=None):
        if not self._items:
            return self
        if isinstance(key_or_list, list):
            for key, direct in reversed(key_or_list):
                reverse = (direct == -1 or direct == "desc")
                self._items.sort(key=lambda x: str(x.get(key, "")), reverse=reverse)
        elif isinstance(key_or_list, str):
            reverse = (direction == -1 or direction == "desc")
            self._items.sort(key=lambda x: str(x.get(key_or_list, "")), reverse=reverse)
        return self

    def __iter__(self):
        return iter(self._items)

    def __len__(self):
        return len(self._items)

    def to_list(self):
        return list(self._items)

class FallbackCollection:
    """High-performance in-memory + JSON persisted MongoDB-compatible collection fallback."""
    def __init__(self, name: str, filepath: str):
        self.name = name
        self.filepath = filepath
        self._docs: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, 'r', encoding='utf-8') as f:
                    self._docs = json.load(f)
            except Exception:
                self._docs = []
        else:
            self._docs = []

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump(self._docs, f, default=str, indent=2)
        except Exception as e:
            print(f"FallbackCollection save notice for {self.name}: {e}")

    def _match_condition(self, doc: Dict[str, Any], key: str, val: Any) -> bool:
        doc_val = doc.get(key)
        if isinstance(val, dict):
            # Operators
            if "$gte" in val:
                t_val = val["$gte"]
                if doc_val is None: return False
                return str(doc_val) >= str(t_val)
            if "$lte" in val:
                t_val = val["$lte"]
                if doc_val is None: return False
                return str(doc_val) <= str(t_val)
            if "$regex" in val:
                pattern = val["$regex"]
                flags = re.IGNORECASE if val.get("$options") == "i" else 0
                return bool(re.search(pattern, str(doc_val or ""), flags))
            if "$ne" in val:
                return doc_val != val["$ne"]
            if "$in" in val:
                return doc_val in val["$in"]
        elif isinstance(val, str) and isinstance(doc_val, str):
            return doc_val.lower() == val.lower()
        return doc_val == val

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        if not query:
            return True
        for key, val in query.items():
            if key == "$or" and isinstance(val, list):
                if not any(self._matches(doc, sub) for sub in val):
                    return False
            elif key == "$and" and isinstance(val, list):
                if not all(self._matches(doc, sub) for sub in val):
                    return False
            else:
                if not self._match_condition(doc, key, val):
                    return False
        return True

    def find_one(self, query: Dict[str, Any] = None, sort=None) -> Optional[Dict[str, Any]]:
        matches = [d for d in self._docs if self._matches(d, query or {})]
        if not matches:
            return None
        if sort:
            cursor = MockCursor(matches)
            cursor.sort(sort)
            return copy.deepcopy(cursor._items[0])
        return copy.deepcopy(matches[0])

    def find(self, query: Dict[str, Any] = None, sort=None) -> MockCursor:
        matches = [copy.deepcopy(d) for d in self._docs if self._matches(d, query or {})]
        cursor = MockCursor(matches)
        if sort:
            cursor.sort(sort)
        return cursor

    def insert_one(self, doc: Dict[str, Any]) -> Any:
        item = copy.deepcopy(doc)
        if "_id" not in item:
            item["_id"] = f"doc-{secrets.token_hex(8)}"
        self._docs.append(item)
        self._save()
        class Result:
            inserted_id = item["_id"]
        return Result()

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> Any:
        modified_count = 0
        for doc in self._docs:
            if self._matches(doc, query):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        doc[k] = v
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        doc[k] = doc.get(k, 0) + v
                modified_count = 1
                break
        if modified_count > 0:
            self._save()
        class Result:
            pass
        r = Result()
        r.modified_count = modified_count
        return r

    def update_many(self, query: Dict[str, Any], update: Dict[str, Any]) -> Any:
        modified_count = 0
        for doc in self._docs:
            if self._matches(doc, query):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        doc[k] = v
                modified_count += 1
        if modified_count > 0:
            self._save()
        class Result:
            pass
        r = Result()
        r.modified_count = modified_count
        return r

    def delete_one(self, query: Dict[str, Any]) -> Any:
        idx = -1
        for i, doc in enumerate(self._docs):
            if self._matches(doc, query):
                idx = i
                break
        if idx >= 0:
            self._docs.pop(idx)
            self._save()
        class Result:
            deleted_count = 1 if idx >= 0 else 0
        return Result()

    def count_documents(self, query: Dict[str, Any] = None) -> int:
        return sum(1 for d in self._docs if self._matches(d, query or {}))

    def create_index(self, *args, **kwargs):
        pass

# Initialize database connections with graceful fallback
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

is_mongo_online = False
users_collection = None
otps_collection = None
client = None

try:
    from pymongo import MongoClient, ASCENDING
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1200)
    client.admin.command("ping")
    db = client[MONGODB_DATABASE]
    users_collection = db["users"]
    otps_collection = db["otp_verifications"]
    sessions_collection = db["auth_sessions"]
    
    # Ensure indexes
    users_collection.create_index([("email", ASCENDING)], unique=True, sparse=True)
    users_collection.create_index([("full_name", ASCENDING)])
    otps_collection.create_index([("identifier", ASCENDING), ("otp_type", ASCENDING)])
    is_mongo_online = True
    print("MongoDB connected successfully!")
except Exception as e:
    is_mongo_online = False
    print(f"MongoDB not running on {MONGODB_URI} ({e}). Seamlessly activating resilient local datastore.")
    users_collection = FallbackCollection("users", os.path.join(DATA_DIR, "users_store.json"))
    otps_collection = FallbackCollection("otps", os.path.join(DATA_DIR, "otps_store.json"))
    sessions_collection = FallbackCollection("sessions", os.path.join(DATA_DIR, "sessions_store.json"))

# Seed default admin account if not existing
def seed_default_admin():
    admin_email = "admin@praman.gov.in"
    existing = users_collection.find_one({"email": admin_email})
    if not existing:
        pwd_hash, salt = hash_password("admin123")
        now_utc = datetime.now(timezone.utc).isoformat()
        users_collection.insert_one({
            "id": "usr-admin-001",
            "full_name": "PRAMAN Administrator",
            "email": admin_email,
            "mobile_number": "+91 9876543210",
            "department": "Central Procurement Division",
            "role": "Administrator",
            "password_hash": pwd_hash,
            "salt": salt,
            "auth_provider": "local",
            "status": "active",
            "is_email_verified": 1,
            "created_at": now_utc,
            "updated_at": now_utc,
            "last_login_at": now_utc
        })
        print(f"Seeded default administrative user: {admin_email}")

try:
    seed_default_admin()
except Exception as err:
    print("Notice during admin seed:", err)