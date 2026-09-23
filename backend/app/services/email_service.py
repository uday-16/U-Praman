import os
import asyncio
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger("praman.email")

class EmailDeliveryError(Exception):
    """Raised when email delivery fails."""
    pass

def _mask_email(email: str) -> str:
    """Mask email for safe logging (e.g. u***@gmail.com)."""
    try:
        user, domain = email.split("@", 1)
        if len(user) <= 2:
            masked_user = user[0] + "*"
        else:
            masked_user = user[0] + "*" * (len(user) - 2) + user[-1]
        return f"{masked_user}@{domain}"
    except Exception:
        return "****@****"

def _build_praman_email_html(otp_code: str, recipient_email: str) -> str:
    """Generate official PRAMAN branded HTML email for OTP verification."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your PRAMAN account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;" cellspacing="0" cellpadding="0">
          
          <!-- Subtle Tricolor Top Accent Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #FF8A3D 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #2F7D5C 66.6%);"></td>
          </tr>
          
          <!-- Header: PRAMAN Institutional Navy Banner -->
          <tr>
            <td style="background-color: #0A2540; padding: 30px 35px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; padding: 4px 10px; background-color: rgba(255,255,255,0.12); border-radius: 4px; font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid rgba(255,255,255,0.2);">
                      Official Procurement Gateway
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin-top: 12px; letter-spacing: 0.02em;">
                      PRAMAN <span style="font-size: 18px; font-weight: 500; opacity: 0.85;">प्रमाण</span>
                    </div>
                    <div style="font-size: 13px; color: #94A3B8; margin-top: 4px; font-weight: 500;">
                      Standards Intelligence & Procurement Decision Support
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 35px 35px 25px 35px;">
              <h2 style="margin: 0 0 16px 0; font-size: 19px; font-weight: 700; color: #0F172A;">
                Verify your email address
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for registering on <strong>PRAMAN</strong>. To verify your work email address (<strong>{recipient_email}</strong>) and activate your procurement officer account, please enter the one-time verification code below:
              </p>

              <!-- OTP Highlight Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background-color: #F1F5F9; border: 2px dashed #0A2540; border-radius: 8px; padding: 22px 15px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                      Your Verification Code
                    </div>
                    <div style="font-size: 34px; font-weight: 800; letter-spacing: 0.28em; color: #0A2540; font-family: 'Courier New', Courier, monospace;">
                      {otp_code}
                    </div>
                    <div style="font-size: 12px; color: #D97706; font-weight: 600; margin-top: 8px;">
                      ⏱ This code expires in 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 13px; color: #92400E; line-height: 1.5;">
                  <strong>Security Notice:</strong> Never share this OTP with anyone. PRAMAN administrative staff will never ask for your verification code or password.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748B;">
                If you did not request this verification, please disregard this email or report to your system administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 35px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748B;">
                Government Procurement Standards Platform • PRAMAN
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Bureau of Indian Standards (BIS) &amp; Public Procurement Intelligence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def _send_smtp_sync(recipient: str, subject: str, html_body: str, plain_body: str) -> bool:
    """Synchronous worker function to connect to SMTP and dispatch the message."""
    if not settings.smtp_username or not settings.smtp_password:
        raise EmailDeliveryError(
            "SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD in backend/.env"
        )
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = recipient
    
    # Attach plain text and HTML versions
    msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, [recipient], msg.as_string())
            
        logger.info(f"Email OTP dispatched successfully to {_mask_email(recipient)}")
        return True
    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(f"SMTP Authentication Error: {auth_err}")
        raise EmailDeliveryError("SMTP authentication failed. Please verify your Gmail App Password.")
    except Exception as e:
        logger.error(f"SMTP Delivery Error: {type(e).__name__}: {e}")
        raise EmailDeliveryError(f"Email delivery failed: {str(e)}")

class EmailService:
    @staticmethod
    async def send_otp_email(recipient_email: str, otp_code: str) -> bool:
        """Asynchronously send a branded PRAMAN OTP verification email."""
        recipient = recipient_email.strip().lower()
        subject = "Verify your PRAMAN account"
        
        plain_body = (
            f"PRAMAN - Standards Intelligence & Procurement Assistant\n\n"
            f"Verify your email address\n\n"
            f"Your PRAMAN verification code is: {otp_code}\n\n"
            f"This code expires in 10 minutes.\n\n"
            f"If you did not request this verification, you can safely ignore this email."
        )
        
        html_body = _build_praman_email_html(otp_code, recipient)
        
        # Run synchronous smtplib in a worker thread to keep the FastAPI event loop unblocked
        return await asyncio.to_thread(_send_smtp_sync, recipient, subject, html_body, plain_body)

    @staticmethod
    def verify_smtp_configuration() -> dict:
        """Verify SMTP host, port, TLS, and login credentials without sending an email."""
        if not settings.smtp_username or not settings.smtp_password:
            return {
                "configured": False,
                "status": "missing_credentials",
                "message": "SMTP_USERNAME or SMTP_PASSWORD is not set in backend/.env"
            }
        
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                
            return {
                "configured": True,
                "status": "healthy",
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "from_email": settings.smtp_from_email,
                "message": "SMTP connection and credentials verified successfully."
            }
        except Exception as e:
            return {
                "configured": False,
                "status": "connection_error",
                "error": str(e)
            }
