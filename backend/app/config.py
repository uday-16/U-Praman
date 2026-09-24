import os
from dotenv import load_dotenv
from pydantic import BaseModel

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()

class Settings(BaseModel):
    app_name: str = "StandardsAI Backend - SIH26108"
    api_prefix: str = "/api/v1"
    environment: str = os.getenv("ENVIRONMENT", "development")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]
    secret_key: str = os.getenv("SECRET_KEY", "sih26108_secret_key_standards_ai_procurement")
    jwt_secret: str = os.getenv("JWT_SECRET", "sih26108_jwt_secret_key_standards_ai")
    
    # Gmail SMTP Configuration
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "praman.standards@gmail.com")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "praman.standards@gmail.com")
    smtp_from_name: str = os.getenv("SMTP_FROM_NAME", "PRAMAN Standards")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    # Gemini AI Configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    gemini_fallback_model: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash")
    gemini_tts_model: str = os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")

    # SMS & OTP Service Configuration
    sms_provider: str = os.getenv("SMS_PROVIDER", "")
    sms_api_key: str = os.getenv("SMS_API_KEY", "")
    sms_sender_id: str = os.getenv("SMS_SENDER_ID", "")
    sms_template_id: str = os.getenv("SMS_TEMPLATE_ID", "")
    auth_otp_dev_mode: bool = os.getenv("AUTH_OTP_DEV_MODE", "true").lower() in ("true", "1", "yes")

settings = Settings()


