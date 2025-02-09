import pyotp
import qrcode
import io
import base64
from typing import Tuple
from datetime import datetime, timedelta

from app.core.config import settings
from app.models.user import User

def generate_totp_secret() -> str:
    """Generate a new TOTP secret."""
    return pyotp.random_base32()

def get_totp_uri(secret: str, email: str) -> str:
    """Get the TOTP URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=email,
        issuer_name=settings.PROJECT_NAME
    )

def generate_qr_code(secret: str, email: str) -> str:
    """Generate QR code as base64 string."""
    uri = get_totp_uri(secret, email)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_str = base64.b64encode(img_buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

def verify_totp(secret: str, token: str) -> bool:
    """Verify a TOTP token."""
    if not secret or not token:
        return False
    
    totp = pyotp.TOTP(secret)
    return totp.verify(token)

def generate_backup_codes(count: int = 8) -> list[str]:
    """Generate backup codes for 2FA recovery."""
    return [pyotp.random_base32()[:16] for _ in range(count)]

def hash_backup_codes(codes: list[str]) -> list[str]:
    """Hash backup codes for storage."""
    from app.core.security import get_password_hash
    return [get_password_hash(code) for code in codes]

def verify_backup_code(code: str, hashed_codes: list[str]) -> bool:
    """Verify a backup code."""
    from app.core.security import verify_password
    return any(verify_password(code, hashed) for hashed in hashed_codes)

async def setup_2fa(user: User) -> Tuple[str, str, list[str]]:
    """
    Set up 2FA for a user.
    Returns (secret, qr_code, backup_codes).
    """
    secret = generate_totp_secret()
    qr_code = generate_qr_code(secret, user.email)
    backup_codes = generate_backup_codes()
    
    return secret, qr_code, backup_codes

async def verify_2fa(user: User, token: str) -> bool:
    """
    Verify 2FA token or backup code.
    Returns True if verification succeeds.
    """
    if not user.two_factor_enabled or not user.two_factor_secret:
        return True
    
    # Try TOTP first
    if verify_totp(user.two_factor_secret, token):
        return True
    
    # Try backup code
    if user.backup_codes and verify_backup_code(token, user.backup_codes):
        # Remove used backup code
        user.backup_codes = [
            code for code in user.backup_codes
            if not verify_password(token, code)
        ]
        return True
    
    return False
