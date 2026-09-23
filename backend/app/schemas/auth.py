from pydantic import BaseModel
from typing import Optional, List

class SendOtpRequest(BaseModel):
    identifier: str
    otp_type: Optional[str] = "email"

class SendOtpResponse(BaseModel):
    success: bool
    message: str
    identifier: str
    otp_type: str = "email"
    expires_in_seconds: int = 600

class RequestEmailOtpRequest(BaseModel):
    email: str

class VerifyEmailOtpRequest(BaseModel):
    email: str
    otp_code: str

class VerifyOtpRequest(BaseModel):
    identifier: str
    otp_type: Optional[str] = "email"
    otp_code: str

class VerifyOtpResponse(BaseModel):
    success: bool
    message: str
    is_verified: bool

class ResendEmailOtpRequest(BaseModel):
    email: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    department: str
    role: str
    password: str
    email_otp: Optional[str] = None
    mobile_number: Optional[str] = None

class LoginRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: str

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: str
    name: str
    role: Optional[str] = "Procurement Officer"
    picture: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    mobile_number: Optional[str] = None
    role: str
    organization: Optional[str] = None
    department: Optional[str] = "Central Procurement Division"
    preferred_language: Optional[str] = "English"
    notifications_enabled: bool = True
    status: str = "active"
    is_email_verified: bool = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class ServiceHealthResponse(BaseModel):
    configured: bool
    status: str
    message: str
    details: Optional[dict] = None
