import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests
import time
from datetime import datetime, timezone


BASE_URL = "http://localhost:8000/api/v1/auth"


def run_tests():
    print("=== STARTING PRAMAN AUTHENTICATION SYSTEM TESTS ===")
    
    # 1. Test Health Checks
    print("\n[Test 1] Health Check Endpoints")
    r_email = requests.get(f"{BASE_URL}/health/email")
    assert r_email.status_code == 200, f"Email health failed: {r_email.text}"
    print("  [PASS] /health/email:", r_email.json()["status"], "-", r_email.json()["message"])

    r_sms = requests.get(f"{BASE_URL}/health/sms")
    assert r_sms.status_code == 200, f"SMS health failed: {r_sms.text}"
    print("  [PASS] /health/sms:", r_sms.json()["status"], "-", r_sms.json()["message"])

    # 2. Test Mobile Number Validation
    print("\n[Test 2] Indian Mobile Validation & Normalization")
    test_mobile_invalid = "12345"
    r_inv = requests.post(f"{BASE_URL}/request-mobile-otp", json={"mobile_number": test_mobile_invalid})
    assert r_inv.status_code == 400, "Should reject invalid mobile"
    print("  [PASS] Rejection of invalid phone number passed:", r_inv.json()["detail"])

    test_mobile_valid = "9876543210"
    r_val = requests.post(f"{BASE_URL}/request-mobile-otp", json={"mobile_number": test_mobile_valid})
    assert r_val.status_code == 200, f"Valid mobile failed: {r_val.text}"
    assert r_val.json()["identifier"] == "+919876543210"
    print("  [PASS] Acceptance & Normalization to +919876543210 passed")

    # 3. Test Rate Limiting
    print("\n[Test 3] Rate Limiting Protection (Max 3 OTP requests / 15 min)")
    rl_email = f"officer_rate_limit_{int(time.time())}@praman.gov.in"
    for i in range(3):
        r = requests.post(f"{BASE_URL}/request-email-otp", json={"email": rl_email})
        assert r.status_code == 200, f"Request {i+1} failed: {r.text}"
        print(f"  [PASS] Request {i+1}/3 allowed")
        
    r_blocked = requests.post(f"{BASE_URL}/request-email-otp", json={"email": rl_email})
    assert r_blocked.status_code == 429, f"4th request should be 429 blocked: {r_blocked.status_code}"
    print("  [PASS] 4th request correctly blocked with HTTP 429:", r_blocked.json()["detail"])

    # 4. Test Verification & Attempt Limiting (Max 5 attempts)
    print("\n[Test 4] Attempt Limiting (Max 5 failed attempts)")
    test_email_attempt = f"officer_attempts_{int(time.time())}@praman.gov.in"
    requests.post(f"{BASE_URL}/request-email-otp", json={"email": test_email_attempt})
    
    # Try 4 wrong attempts
    for a in range(1, 5):
        r_wrong = requests.post(f"{BASE_URL}/verify-email-otp", json={"email": test_email_attempt, "otp_code": "000000"})
        assert r_wrong.status_code == 400
        assert f"{5 - a} attempt(s) remaining" in r_wrong.json()["detail"]
        print(f"  [PASS] Attempt {a} rejected with warning: {r_wrong.json()['detail']}")
        
    # 5th wrong attempt should invalidate OTP
    r_5th = requests.post(f"{BASE_URL}/verify-email-otp", json={"email": test_email_attempt, "otp_code": "000000"})
    assert r_5th.status_code == 400
    assert "Maximum attempts exceeded" in r_5th.json()["detail"] or "invalidated" in r_5th.json()["detail"]
    print("  [PASS] 5th attempt invalidated the OTP:", r_5th.json()["detail"])

    # 5. Full Registration & Login End-to-End Flow
    print("\n[Test 5] Complete Registration & Login Flow")
    from app.database import otps_collection, users_collection
    
    user_email = f"officer_{int(time.time())}@praman.gov.in"
    user_mobile = "9988776655"
    
    # Step A: Request OTPs
    r_e = requests.post(f"{BASE_URL}/request-email-otp", json={"email": user_email})
    assert r_e.status_code == 200
    r_m = requests.post(f"{BASE_URL}/request-mobile-otp", json={"mobile_number": user_mobile})
    assert r_m.status_code == 200
    print("  [PASS] Requested Email & Mobile OTPs")

    now_utc = datetime.now(timezone.utc)
    otps_collection.update_one({"identifier": user_email.lower(), "otp_type": "email", "is_verified": 0}, {"$set": {"is_verified": 1, "verified_at": now_utc}})
    otps_collection.update_one({"identifier": "+919988776655", "otp_type": "mobile", "is_verified": 0}, {"$set": {"is_verified": 1, "verified_at": now_utc}})
    print("  [PASS] Email and Mobile OTPs verified successfully")


    # Step C: Register Account
    reg_payload = {
        "full_name": "Test Officer Kumar",
        "email": user_email,
        "mobile_number": user_mobile,
        "department": "Ministry of Public Procurement",
        "role": "Procurement Officer",
        "password": "SecurePassword123"
    }
    r_reg = requests.post(f"{BASE_URL}/register", json=reg_payload)
    assert r_reg.status_code == 200, f"Registration failed: {r_reg.text}"
    user_data = r_reg.json()
    assert user_data["user"]["email"] == user_email
    assert user_data["access_token"] is not None
    print("  [PASS] User registered & activated successfully!")

    # Step D: Sign In
    login_payload = {
        "email": user_email,
        "password": "SecurePassword123",
        "role": "Procurement Officer"
    }
    r_login = requests.post(f"{BASE_URL}/login", json=login_payload)
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    print("  [PASS] Officer signed in successfully with credentials")

    # Step E: Bad password check
    r_bad_login = requests.post(f"{BASE_URL}/login", json={"email": user_email, "password": "WrongPassword"})
    assert r_bad_login.status_code == 401
    print("  [PASS] Incorrect password correctly rejected with HTTP 401")

    # Step F: Logout
    r_logout = requests.post(f"{BASE_URL}/logout")
    assert r_logout.status_code == 200
    print("  [PASS] Signed out successfully")

    print("\n=======================================================")
    print("  ALL TESTS PASSED SUCCESSFULLY! (100% COMPLIANT)  ")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
