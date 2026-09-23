import os
import re
import asyncio
import logging
import requests
from typing import Optional
from app.config import settings

logger = logging.getLogger("praman.sms")

class SMSDeliveryError(Exception):
    """Raised when SMS delivery fails or provider is unconfigured."""
    pass

def normalize_indian_mobile(phone: str) -> str:
    """
    Validate and normalize Indian mobile phone numbers to +91XXXXXXXXXX format.
    Accepts:
      - 9876543210
      - +919876543210
      - 919876543210
      - 09876543210
    Valid Indian mobile numbers start with digits 6, 7, 8, or 9 and have 10 digits.
    """
    if not phone:
        raise ValueError("Mobile number is required.")
        
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    
    # Strip leading zero if present
    if cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
        
    # Strip +91 or 91 prefix
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
        
    # Validate 10-digit Indian mobile format
    if not re.match(r"^[6-9]\d{9}$", cleaned):
        raise ValueError(
            "Invalid Indian mobile number. Must be a valid 10-digit number starting with 6, 7, 8, or 9."
        )
        
    return f"+91{cleaned}"

def _mask_mobile(phone: str) -> str:
    """Mask mobile number for safe logging (e.g. +91 ******3210)."""
    try:
        norm = normalize_indian_mobile(phone)
        return f"+91 ******{norm[-4:]}"
    except Exception:
        return "+91 ******"

class SMSService:
    @staticmethod
    def _send_via_msg91(phone_number: str, otp_code: str) -> bool:
        """Dispatch OTP via MSG91 official Send OTP API."""
        api_key = settings.sms_api_key
        template_id = settings.sms_template_id
        
        # MSG91 expects mobile without + prefix, e.g. 919876543210
        raw_number = phone_number.replace("+", "")
        
        url = "https://control.msg91.com/api/v5/otp"
        headers = {
            "authkey": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "template_id": template_id,
            "mobile": raw_number,
            "otp": otp_code
        }
        
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        
        if resp.status_code == 200 and data.get("type") != "error":
            logger.info(f"MSG91 OTP sent successfully to {_mask_mobile(phone_number)}")
            return True
        else:
            err_msg = data.get("message", f"MSG91 HTTP {resp.status_code}")
            logger.error(f"MSG91 error: {err_msg}")
            raise SMSDeliveryError(f"SMS gateway error: {err_msg}")

    @staticmethod
    def _send_via_twilio(phone_number: str, otp_code: str) -> bool:
        """Dispatch OTP via Twilio Programmable SMS."""
        account_sid = settings.sms_api_key  # Twilio Account SID
        auth_token = settings.sms_sender_id  # Twilio Auth Token
        from_number = settings.sms_template_id  # Twilio Sender Phone Number
        
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        body = f"Your PRAMAN verification code is: {otp_code}. Valid for 10 minutes. Do not share this code."
        
        resp = requests.post(
            url,
            data={"To": phone_number, "From": from_number, "Body": body},
            auth=(account_sid, auth_token),
            timeout=10
        )
        
        if resp.status_code in (200, 201):
            logger.info(f"Twilio OTP sent successfully to {_mask_mobile(phone_number)}")
            return True
        else:
            logger.error(f"Twilio error HTTP {resp.status_code}: {resp.text}")
            raise SMSDeliveryError(f"Twilio SMS delivery failed: HTTP {resp.status_code}")

    @classmethod
    async def send_otp(cls, phone_number: str, otp_code: str) -> bool:
        """Send OTP to normalized Indian phone number."""
        norm_phone = normalize_indian_mobile(phone_number)
        provider = (settings.sms_provider or "").strip().lower()
        
        # Check if SMS provider is configured
        if not provider or not settings.sms_api_key:
            if settings.auth_otp_dev_mode:
                # In development mode, safely log masked notice and simulated dispatch
                print(f"\n=======================================================")
                print(f"[AUTH DEV MODE] Real SMS provider is not yet configured in .env")
                print(f"[AUTH DEV MODE] Mobile OTP for {_mask_mobile(norm_phone)}: {otp_code}")
                print(f"=======================================================\n")
                logger.warning(f"[DEV MODE] Mobile OTP generated for {_mask_mobile(norm_phone)}")
                return True
            else:
                raise SMSDeliveryError(
                    "SMS service is not configured. Please configure SMS_PROVIDER and SMS_API_KEY in backend/.env"
                )
        
        # Dispatch according to configured provider
        def _dispatch():
            if provider == "msg91":
                return cls._send_via_msg91(norm_phone, otp_code)
            elif provider == "twilio":
                return cls._send_via_twilio(norm_phone, otp_code)
            else:
                raise SMSDeliveryError(f"Unsupported SMS provider: '{provider}'. Supported: msg91, twilio.")
                
        return await asyncio.to_thread(_dispatch)

    @classmethod
    def verify_sms_configuration(cls) -> dict:
        """Verify SMS configuration status without disclosing secret keys."""
        provider = (settings.sms_provider or "").strip().lower()
        if not provider or not settings.sms_api_key:
            return {
                "configured": False,
                "status": "unconfigured",
                "provider": provider or "none",
                "dev_mode_active": settings.auth_otp_dev_mode,
                "message": "SMS provider or API key is not configured in backend/.env"
            }
        
        return {
            "configured": True,
            "status": "ready",
            "provider": provider,
            "sender_id": settings.sms_sender_id or "default",
            "template_id_configured": bool(settings.sms_template_id),
            "dev_mode_active": settings.auth_otp_dev_mode,
            "message": f"SMS service configured with provider '{provider}'."
        }
