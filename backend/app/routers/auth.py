import re
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, Request

from app.database import (
    users_collection,
    sessions_collection,
    otps_collection,
    hash_password,
    verify_password,
    hash_otp,
    verify_otp_hash
)
from app.schemas.auth import (
    SendOtpRequest,
    SendOtpResponse,
    RequestEmailOtpRequest,
    VerifyOtpRequest,
    VerifyEmailOtpRequest,
    VerifyOtpResponse,
    ResendEmailOtpRequest,
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    UserProfile,
    UpdateProfileRequest,
    AuthResponse,
    ServiceHealthResponse
)
from app.services.email_service import EmailService, EmailDeliveryError, _mask_email

logger = logging.getLogger("praman.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
MAX_ATTEMPTS = 5
RATE_LIMIT_MINUTES = 15
MAX_REQUESTS_PER_WINDOW = 3

def issue_login_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    sessions_collection.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "revoked": False,
    })
    return token

def require_session(request: Request):
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    session = sessions_collection.find_one({"token_hash": hashlib.sha256(token.encode()).hexdigest()})
    if not session or session.get("revoked"):
        raise HTTPException(status_code=401, detail="Your session has ended. Please log in again.")
    try:
        expires = datetime.fromisoformat(session["expires_at"])
        if expires <= datetime.now(timezone.utc):
            raise ValueError("expired")
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    user = users_collection.find_one({"id": session["user_id"]})
    if not user:
        try:
            from bson import ObjectId
            user = users_collection.find_one({"_id": ObjectId(session["user_id"])})
        except Exception:
            user = None
    if not user:
        user = users_collection.find_one({"_id": session["user_id"]})
    if not user or user.get("status") == "deactivated":
        raise HTTPException(status_code=401, detail="Please log in with an active account.")
    return user

def require_admin(user=Depends(require_session)):
    if normalize_role(user.get('role')) != 'Administrator':
        raise HTTPException(403, 'Administrator access is required.')
    return user

def normalize_role(role_str: Optional[str]) -> str:
    if not role_str:
        return "Procurement Officer"
    r = role_str.strip().lower()
    if r in ["admin", "administrator", "system administrator"]:
        return "Administrator"
    if r in ["officer", "procurement officer"]:
        return "Procurement Officer"
    if r in ["reviewer", "technical reviewer", "technical evaluator"]:
        return "Technical Evaluator"
    return role_str.strip()

def check_email_rate_limit(email: str):
    """Ensure no more than MAX_REQUESTS_PER_WINDOW OTP requests in the last RATE_LIMIT_MINUTES."""
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=RATE_LIMIT_MINUTES)
    recent_count = otps_collection.count_documents({
        "identifier": email,
        "otp_type": "email",
        "created_at": {"$gte": cutoff_time}
    })
    if recent_count >= MAX_REQUESTS_PER_WINDOW:
        logger.warning(f"Rate limit exceeded for {email}")
        raise HTTPException(
            status_code=429,
            detail=f"Too many OTP requests. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_MINUTES} minutes allowed. Please try again later."
        )

async def _process_send_email_otp(email_str: str) -> SendOtpResponse:
    """Core secure logic to rate-limit, generate, hash, persist, and dispatch Email OTP."""
    cleaned_email = email_str.strip().lower()
    if not EMAIL_REGEX.match(cleaned_email):
        raise HTTPException(status_code=400, detail="Please enter a valid work email address.")
        
    masked_dest = _mask_email(cleaned_email)

    # 1. Enforce Rate Limiting
    check_email_rate_limit(cleaned_email)

    # 2. Invalidate previous unverified OTPs for this email
    otps_collection.update_many(
        {"identifier": cleaned_email, "otp_type": "email", "is_verified": 0},
        {"$set": {"is_verified": -1, "status": "superseded"}}
    )

    # 3. Generate 6-digit cryptographically secure OTP and hash it
    raw_otp = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash, salt = hash_otp(raw_otp)
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(minutes=10)

    # 4. Insert hashed record into MongoDB (Plaintext OTP is NEVER stored!)
    otps_collection.insert_one({
        "identifier": cleaned_email,
        "otp_type": "email",
        "otp_hash": otp_hash,
        "salt": salt,
        "attempt_count": 0,
        "max_attempts": MAX_ATTEMPTS,
        "expires_at": expires_at,
        "is_verified": 0,
        "status": "pending",
        "created_at": now_utc
    })

    # 5. Dispatch via Gmail SMTP
    try:
        await EmailService.send_otp_email(cleaned_email, raw_otp)
    except EmailDeliveryError as ede:
        # Revert OTP creation on delivery failure
        otps_collection.delete_one({"identifier": cleaned_email, "created_at": now_utc})
        logger.error(f"Failed to send email OTP to {masked_dest}: {ede}")
        raise HTTPException(status_code=500, detail=f"Email delivery failed: {str(ede)}")

    logger.info(f"Email OTP dispatched successfully to {masked_dest}")

    return SendOtpResponse(
        success=True,
        message=f"6-digit verification code sent successfully to your Email Address ({masked_dest}). Valid for 10 minutes.",
        identifier=cleaned_email,
        otp_type="email",
        expires_in_seconds=600
    )

def _process_verify_email_otp(email_str: str, otp_code: str) -> VerifyOtpResponse:
    """Core secure logic to verify entered OTP against stored cryptographic hash."""
    cleaned_email = email_str.strip().lower()
    otp_code = otp_code.strip()
    
    if not otp_code or not re.match(r"^\d{6}$", otp_code):
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit numeric OTP.")

    # Find the most recent unverified OTP record
    record = otps_collection.find_one(
        {
            "identifier": cleaned_email,
            "otp_type": "email",
            "is_verified": 0
        },
        sort=[("created_at", -1)]
    )

    if not record:
        raise HTTPException(
            status_code=400,
            detail="No pending verification code found or code already used. Please request a new OTP."
        )

    # Check Expiration
    now_utc = datetime.now(timezone.utc)
    expires_at = record.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and now_utc > expires_at:
        otps_collection.update_one({"_id": record["_id"]}, {"$set": {"is_verified": -1, "status": "expired"}})
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new OTP.")

    # Check Attempt Limits
    current_attempts = record.get("attempt_count", 0)
    if current_attempts >= MAX_ATTEMPTS:
        otps_collection.update_one({"_id": record["_id"]}, {"$set": {"is_verified": -1, "status": "max_attempts_exceeded"}})
        raise HTTPException(
            status_code=400,
            detail="Maximum verification attempts exceeded. This OTP has been invalidated. Please request a new code."
        )

    # Verify Cryptographic Hash
    is_valid = False
    stored_hash = record.get("otp_hash")
    salt = record.get("salt")
    
    if stored_hash and salt:
        is_valid = verify_otp_hash(otp_code, stored_hash, salt)
    elif record.get("otp_code"):
        is_valid = secrets.compare_digest(record.get("otp_code"), otp_code)

    if not is_valid:
        new_attempts = current_attempts + 1
        remaining = MAX_ATTEMPTS - new_attempts
        
        if remaining <= 0:
            otps_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {"attempt_count": new_attempts, "is_verified": -1, "status": "max_attempts_exceeded"}}
            )
            raise HTTPException(
                status_code=400,
                detail="Incorrect OTP. Maximum attempts exceeded. This OTP has been invalidated. Please request a new code."
            )
        else:
            otps_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {"attempt_count": new_attempts}}
            )
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
            )

    # Successfully Verified!
    otps_collection.update_one(
        {"_id": record["_id"]},
        {"$set": {"is_verified": 1, "status": "verified", "verified_at": now_utc}}
    )

    logger.info(f"Email verified successfully for {cleaned_email}")
    return VerifyOtpResponse(
        success=True,
        message="Email verified successfully.",
        is_verified=True
    )

def is_email_verified(email: str, direct_code: Optional[str] = None) -> bool:
    """Verify that the email has been confirmed via OTP within the last 30 minutes."""
    cleaned_email = email.strip().lower()

    if direct_code and len(direct_code.strip()) == 6:
        try:
            _process_verify_email_otp(cleaned_email, direct_code)
            return True
        except HTTPException:
            pass

    # Check MongoDB for verified record within 30 minutes
    validity_window = datetime.now(timezone.utc) - timedelta(minutes=30)
    record = otps_collection.find_one(
        {
            "identifier": cleaned_email,
            "otp_type": "email",
            "is_verified": 1,
            "$or": [
                {"verified_at": {"$gte": validity_window}},
                {"created_at": {"$gte": validity_window}}
            ]
        },
        sort=[("verified_at", -1)]
    )
    return record is not None

# ==============================================================================
# EMAIL OTP API ENDPOINTS
# ==============================================================================

@router.post("/request-email-otp", response_model=SendOtpResponse)
async def request_email_otp(req: RequestEmailOtpRequest):
    return await _process_send_email_otp(req.email)

@router.post("/verify-email-otp", response_model=VerifyOtpResponse)
def verify_email_otp(req: VerifyEmailOtpRequest):
    return _process_verify_email_otp(req.email, req.otp_code)

@router.post("/resend-email-otp", response_model=SendOtpResponse)
async def resend_email_otp(req: ResendEmailOtpRequest):
    return await _process_send_email_otp(req.email)

@router.post("/send-otp", response_model=SendOtpResponse)
async def send_otp(req: SendOtpRequest):
    return await _process_send_email_otp(req.identifier)

@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(req: VerifyOtpRequest):
    return _process_verify_email_otp(req.identifier, req.otp_code)

# ==============================================================================
# REGISTRATION, LOGIN, USER LIFECYCLE
# ==============================================================================

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    from app.routers.admin import USER_LOCK
    with USER_LOCK:
        return register_officer(req)

def register_officer(req: RegisterRequest):
    if normalize_role(req.role) != "Procurement Officer":
        raise HTTPException(403, "Administrator access must be granted by an existing administrator.")
    full_name = req.full_name.strip()
    email = req.email.strip().lower()
    department = req.department.strip()
    role = normalize_role(req.role)
    password = req.password
    mobile = (req.mobile_number or "").strip() or None
    
    if not full_name:
        raise HTTPException(status_code=400, detail="Full Name is required.")
    if not email or not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="A valid official work Email Address is required.")
    if not department:
        raise HTTPException(status_code=400, detail="Department / Organization is required.")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    
    # Strictly require Email OTP verification
    email_ok = is_email_verified(email, req.email_otp)
    if not email_ok:
        raise HTTPException(
            status_code=400,
            detail="Email verification required. Please verify the OTP sent to your work email before creating an account."
        )
    
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        raise HTTPException(409, "This email is already registered. Log in or reset your password.")
    pwd_hash, salt = hash_password(password)
    now_utc = datetime.now(timezone.utc)
    cadre = "Class I Executive"
    jurisdiction = "All India / Central"
    access = "Full Admin" if role == "Administrator" else "Officer Access"


    user_id = f"usr-{secrets.token_hex(6)}"
    gem_id = f"GEM-{user_id[-6:].upper()}"
    user_doc = {
        "id": user_id,
        "full_name": full_name,
        "email": email,
        "mobile_number": mobile,
        "department": department,
        "organization": department,
        "role": role,
        "cadre": cadre,
        "gem_officer_id": gem_id,
        "jurisdiction_state": jurisdiction,
        "portal_access": access,
        "password_hash": pwd_hash,
        "salt": salt,
        "auth_provider": "local",
        "status": "active",
        "is_email_verified": 1,
        "created_at": now_utc,
        "updated_at": now_utc,
        "last_login_at": now_utc
    }
    users_collection.insert_one(user_doc)
    logger.info(f"New user registered and activated via Email OTP: {full_name} ({_mask_email(email)})")

    user_profile = UserProfile(
        id=user_id,
        name=full_name,
        email=email,
        mobile_number=mobile or None,
        role=role,
        organization=department,
        department=department,
        cadre=cadre,
        gem_officer_id=gem_id,
        jurisdiction_state=jurisdiction,
        portal_access=access,
        status="active",
        is_email_verified=True
    )
    
    token = issue_login_session(user_id)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user_profile
    )

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, request: Request):
    return authenticate(req, request, admin_portal=False)

@router.post("/admin/login", response_model=AuthResponse)
def admin_login(req: LoginRequest, request: Request):
    return authenticate(req, request, admin_portal=True)

def authenticate(req: LoginRequest, request: Request, admin_portal=False, create_session=True):
    identifier = (req.full_name or req.email or "").strip()
    password = req.password
    
    if not identifier:
        raise HTTPException(status_code=400, detail="Full Name or Email is required.")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required.")
    
    from app.services.admin_store import login_attempt
    address = request.client.host if request.client else 'unknown'
    if not login_attempt(identifier, address):
        raise HTTPException(429, 'Too many login attempts. Please try again in 15 minutes.')
    query_conditions = [
        {"email": identifier.lower()},
        {"full_name": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}}
    ]
    if identifier.startswith("+") or identifier.replace("-", "").isdigit():
        query_conditions.append({"mobile_number": identifier})
        
    user_doc = users_collection.find_one({"$or": query_conditions})
    
    if not user_doc:
        raise HTTPException(
            status_code=401,
            detail="No account found matching these credentials. Please check your details or create an account."
        )
    
    if user_doc.get("status") == "deactivated":
        raise HTTPException(status_code=403, detail="Your officer account has been deactivated by an Administrator.")
    
    user_db_role = normalize_role(user_doc.get("role"))
    
    user_id = user_doc.get("id")
    if not user_id:
        user_id = f"usr-{str(user_doc.get('_id'))[-8:]}"
        users_collection.update_one({"_id": user_doc["_id"]}, {"$set": {"id": user_id}})
        user_doc["id"] = user_id

    if not user_doc.get("password_hash") or not user_doc.get("salt") or not verify_password(password, user_doc["password_hash"], user_doc["salt"]):
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify and try again.")

    if (user_db_role == 'Administrator') != admin_portal:
        raise HTTPException(403, 'These credentials cannot access this portal.')
    
    now_utc = datetime.now(timezone.utc)
    users_collection.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login_at": now_utc}})
    
    user_profile = UserProfile(
        id=user_doc.get("id", str(user_doc.get("_id"))),
        name=user_doc.get("full_name", user_doc.get("name", "Officer")),
        email=user_doc["email"],
        mobile_number=user_doc.get("mobile_number"),
        role=user_db_role,
        organization=user_doc.get("organization", user_doc.get("department", "Central Procurement Division")),
        department=user_doc.get("department", "Central Procurement Division"),
        cadre=user_doc.get("cadre", "Class I Executive"),
        gem_officer_id=user_doc.get("gem_officer_id") or f"GEM-{str(user_doc.get('id', 'IND'))[-6:].upper()}",
        jurisdiction_state=user_doc.get("jurisdiction_state", "All India / Central"),
        portal_access=user_doc.get("portal_access", "Full Admin" if user_db_role == "Administrator" else "Officer Access"),
        preferred_language=user_doc.get("preferred_language", "English"),
        status=user_doc.get("status", "active"),
        is_email_verified=bool(user_doc.get("is_email_verified", 1))
    )
    
    login_attempt(identifier, address, success=True)
    token = issue_login_session(user_profile.id) if create_session else ''
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user_profile
    )

class AdminRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=254)
    department: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=12, max_length=256)
    email_otp: str = Field(min_length=6, max_length=6)
    approving_email: str = Field(max_length=254)
    approving_password: str = Field(min_length=1, max_length=256)

@router.post('/admin/register', status_code=201)
def register_admin(req: AdminRegisterRequest, request: Request):
    from app.routers.admin import USER_LOCK
    from app.services.admin_store import audit
    email = req.email.strip().lower()
    if not EMAIL_REGEX.fullmatch(email) or not req.full_name.strip() or not req.department.strip():
        raise HTTPException(422, 'Enter a valid name, email and department.')
    with USER_LOCK:
        approver = authenticate(LoginRequest(email=req.approving_email, password=req.approving_password),
                                request, admin_portal=True, create_session=False).user
        if users_collection.find_one({'email': email}):
            raise HTTPException(409, 'This email is already registered.')
        _process_verify_email_otp(email, req.email_otp)
        hashed, salt = hash_password(req.password)
        user_id = 'usr-' + secrets.token_hex(12)
        users_collection.insert_one({'id': user_id, 'full_name': req.full_name.strip(), 'email': email,
            'department': req.department.strip(), 'organization': req.department.strip(),
            'role': 'Administrator', 'portal_access': 'Full Admin', 'status': 'active',
            'password_hash': hashed, 'salt': salt, 'is_email_verified': 1, 'auth_provider': 'local',
            'created_at': datetime.now(timezone.utc).isoformat()})
        audit(approver.id, 'administrator.create', user_id)
    return {'success': True, 'message': 'Administrator account created. Log in with your new credentials.'}

class PasswordResetRequest(BaseModel):
    email: str = Field(max_length=254)
    otp_code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=12, max_length=256)

@router.post('/reset-password')
def reset_password(req: PasswordResetRequest):
    from pathlib import Path
    from filelock import FileLock
    from app.services.admin_store import audit
    email=req.email.strip().lower()
    lock_path=Path(__file__).resolve().parents[2]/'data'/('reset-'+hashlib.sha256(email.encode()).hexdigest()+'.lock')
    with FileLock(str(lock_path),timeout=10):
        _process_verify_email_otp(email,req.otp_code)
        user=users_collection.find_one({'email':email})
        if not user: raise HTTPException(400,'No registered account could be reset with these details.')
        hashed,salt=hash_password(req.new_password)
        users_collection.update_one({'id':user['id']},{'$set':{'password_hash':hashed,'salt':salt,'is_email_verified':1,'updated_at':datetime.now(timezone.utc).isoformat()}})
        sessions_collection.update_many({'user_id':user['id']},{'$set':{'revoked':True}})
        audit(user['id'],'password.reset',user['id'])
    return {'success':True,'message':'Password reset. Sign in with your new password.'}

@router.post("/logout")
def logout(request: Request):
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() == "bearer" and token:
        sessions_collection.update_one(
            {"token_hash": hashlib.sha256(token.encode()).hexdigest()},
            {"$set": {"revoked": True}}
        )
    return {"success": True, "message": "Signed out successfully."}

@router.post('/google', response_model=AuthResponse)
def google_auth(req: GoogleAuthRequest):
    from app.config import settings
    email = ""
    name = "Officer"
    role = normalize_role(req.role) if req.role else "Procurement Officer"

    if not req.credential:
        raise HTTPException(status_code=401, detail="A verified Google credential is required.")
    if role != 'Procurement Officer':
        raise HTTPException(403, 'Only officer accounts can use public sign-up.')

    if settings.google_client_id:
        try:
            from google.oauth2 import id_token
            from google.auth.transport.requests import Request as GoogleRequest
            identity = id_token.verify_oauth2_token(req.credential, GoogleRequest(), settings.google_client_id)
            email = identity.get('email', '').lower()
            name = identity.get('name', req.name or email)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Google credential.")
    else:
        raise HTTPException(503, 'Google authentication is not configured.')

    if not email:
        raise HTTPException(status_code=400, detail="Google authentication failed: Email missing.")

    user_doc = users_collection.find_one({"email": email})
    now_utc = datetime.now(timezone.utc)

    if user_doc:
        if normalize_role(user_doc.get('role')) == 'Administrator':
            raise HTTPException(403, 'These credentials cannot access this portal.')
        if user_doc.get("status") == "deactivated":
            raise HTTPException(status_code=403, detail="Your account has been deactivated.")
        user_id = user_doc.get("id", str(user_doc.get("_id")))
        user_role = normalize_role(user_doc.get("role"))
        dept = user_doc.get("department", "Central Procurement Division")
        org = user_doc.get("organization", dept)
        cadre = user_doc.get("cadre", "Class I Executive")
        gem_id = user_doc.get("gem_officer_id") or f"GEM-{str(user_id)[-6:].upper()}"
        jurisdiction = user_doc.get("jurisdiction_state", "All India / Central")
        access = user_doc.get("portal_access", "Full Admin" if user_role == "Administrator" else "Officer Access")
        users_collection.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login_at": now_utc}})
    else:
        user_id = f"usr-g-{secrets.token_hex(6)}"
        user_role = role
        dept = "Central Procurement Division"
        org = dept
        cadre = "Class I Executive"
        gem_id = f"GEM-{user_id[-6:].upper()}"
        jurisdiction = "All India / Central"
        access = "Full Admin" if user_role == "Administrator" else "Officer Access"
        new_doc = {
            "id": user_id,
            "full_name": name,
            "email": email,
            "mobile_number": "",
            "department": dept,
            "organization": org,
            "role": user_role,
            "cadre": cadre,
            "gem_officer_id": gem_id,
            "jurisdiction_state": jurisdiction,
            "portal_access": access,
            "auth_provider": "google",
            "status": "active",
            "is_email_verified": 1,
            "created_at": now_utc,
            "updated_at": now_utc,
            "last_login_at": now_utc
        }
        users_collection.insert_one(new_doc)

    user_profile = UserProfile(
        id=user_id,
        name=name,
        email=email,
        mobile_number=user_doc.get("mobile_number") if user_doc else None,
        role=user_role,
        organization=org if not user_doc else user_doc.get("organization", "Central Procurement Division"),
        department=dept if not user_doc else user_doc.get("department", "Central Procurement Division"),
        cadre=cadre if not user_doc else user_doc.get("cadre", "Class I Executive"),
        gem_officer_id=gem_id,
        jurisdiction_state=jurisdiction if not user_doc else user_doc.get("jurisdiction_state", "All India / Central"),
        portal_access=access,
        status="active",
        is_email_verified=True
    )

    token = issue_login_session(user_id)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user_profile
    )

@router.get("/me", response_model=UserProfile)
def get_current_user(doc=Depends(require_session)):
    role = normalize_role(doc.get("role"))
    return UserProfile(
        id=doc.get("id", str(doc.get("_id"))),
        name=doc.get("full_name", doc.get("name", "Officer")),
        email=doc["email"],
        mobile_number=doc.get("mobile_number"),
        role=role,
        organization=doc.get("organization", doc.get("department", "Central Procurement Division")),
        department=doc.get("department", "Central Procurement Division"),
        cadre=doc.get("cadre", "Class I Executive"),
        gem_officer_id=doc.get("gem_officer_id") or f"GEM-{str(doc.get('id', 'IND'))[-6:].upper()}",
        jurisdiction_state=doc.get("jurisdiction_state", "All India / Central"),
        portal_access=doc.get("portal_access", "Full Admin" if role == "Administrator" else "Officer Access"),
        preferred_language=doc.get("preferred_language", "English"),
        status=doc.get("status", "active"),
        is_email_verified=bool(doc.get("is_email_verified", 1))
    )

@router.put("/profile", response_model=UserProfile)
@router.patch("/profile", response_model=UserProfile)
def update_profile(req: UpdateProfileRequest, user_doc=Depends(require_session)):
    updates = {}
    if req.name is not None and req.name.strip():
        updates["full_name"] = req.name.strip()
    if req.email is not None and req.email.strip() and EMAIL_REGEX.match(req.email.strip().lower()):
        updates["email"] = req.email.strip().lower()
    if req.mobile_number is not None:
        updates["mobile_number"] = req.mobile_number.strip()
    if req.role is not None and req.role.strip():
        updates["role"] = normalize_role(req.role)
    if req.organization is not None:
        updates["organization"] = req.organization.strip()
    if req.department is not None:
        updates["department"] = req.department.strip()
    if req.cadre is not None:
        updates["cadre"] = req.cadre.strip()
    if req.gem_officer_id is not None:
        updates["gem_officer_id"] = req.gem_officer_id.strip()
    if req.jurisdiction_state is not None:
        updates["jurisdiction_state"] = req.jurisdiction_state.strip()
    if req.portal_access is not None:
        updates["portal_access"] = req.portal_access.strip()
    if req.preferred_language is not None:
        updates["preferred_language"] = req.preferred_language.strip()

    updates["updated_at"] = datetime.now(timezone.utc)
    
    users_collection.update_one({"_id": user_doc["_id"]}, {"$set": updates})
    
    refreshed = users_collection.find_one({"_id": user_doc["_id"]}) or user_doc
    for k, v in updates.items():
        refreshed[k] = v
        
    role = normalize_role(refreshed.get("role"))
    logger.info(f"Officer profile updated in database for: {refreshed.get('full_name')} ({refreshed.get('email')})")
    
    return UserProfile(
        id=refreshed.get("id", str(refreshed.get("_id"))),
        name=refreshed.get("full_name", refreshed.get("name", "Officer")),
        email=refreshed["email"],
        mobile_number=refreshed.get("mobile_number"),
        role=role,
        organization=refreshed.get("organization", refreshed.get("department", "Central Procurement Division")),
        department=refreshed.get("department", "Central Procurement Division"),
        cadre=refreshed.get("cadre", "Class I Executive"),
        gem_officer_id=refreshed.get("gem_officer_id") or f"GEM-{str(refreshed.get('id', 'IND'))[-6:].upper()}",
        jurisdiction_state=refreshed.get("jurisdiction_state", "All India / Central"),
        portal_access=refreshed.get("portal_access", "Full Admin" if role == "Administrator" else "Officer Access"),
        preferred_language=refreshed.get("preferred_language", "English"),
        status=refreshed.get("status", "active"),
        is_email_verified=bool(refreshed.get("is_email_verified", 1))
    )

@router.get("/users")
def list_users(actor=Depends(require_admin)):
    cursor = users_collection.find({}, sort=[("created_at", -1)])
    docs = list(cursor)
    
    return [
        {
            "id": d.get("id", str(d.get("_id"))),
            "name": d["full_name"],
            "email": d["email"],
            "mobile_number": d.get("mobile_number"),
            "organization": d.get("department", "Central Procurement Directorate"),
            "role": normalize_role(d.get("role")),
            "status": d.get("status", "active"),
            "auth_provider": d.get("auth_provider", "local"),
            "registeredAt": d.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(d.get("created_at"), datetime) else str(d.get("created_at"))
        }
        for d in docs
    ]

@router.post("/toggle-status/{user_id}")
def toggle_user_status(user_id: str, actor=Depends(require_admin)):
    from app.routers.admin import update_user, UserUpdate
    doc = users_collection.find_one({'id': user_id})
    if not doc:
        raise HTTPException(404, 'User not found.')
    return update_user(user_id, UserUpdate(status='active' if doc.get('status') == 'deactivated' else 'deactivated'), actor)

@router.get("/health/email", response_model=ServiceHealthResponse)
def health_email(actor=Depends(require_admin)):
    """Verify SMTP connection and authentication status without exposing credentials."""
    result = EmailService.verify_smtp_configuration()
    return ServiceHealthResponse(
        configured=result.get("configured", False),
        status=result.get("status", "unknown"),
        message=result.get("message") or result.get("error", "SMTP check completed"),
        details={
            "host": result.get("host"),
            "port": result.get("port"),
            "from_email": result.get("from_email")
        }
    )
