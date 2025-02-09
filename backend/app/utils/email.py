import logging
from pathlib import Path
from typing import Any, Dict, Optional

import emails
from emails.template import JinjaTemplate
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

def send_email(
    email_to: str,
    subject_template: str = "",
    html_template: str = "",
    environment: Dict[str, Any] = {},
) -> None:
    """Send an email."""
    assert settings.EMAILS_FROM_EMAIL, "No sender email configured"
    
    # Create message
    message = emails.Message(
        subject=JinjaTemplate(subject_template),
        html=JinjaTemplate(html_template),
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    
    # Send message
    smtp_options = {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "tls": settings.SMTP_TLS,
    }
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
        
    response = message.send(
        to=email_to,
        render=environment,
        smtp=smtp_options,
    )
    
    logging.info(f"Send email result: {response}")

def send_verification_email(email_to: str, verification_code: str) -> None:
    """Send verification email to user."""
    subject = "Verify your email"
    html_template = """
        <p>Welcome to {project_name}!</p>
        <p>Your verification code is: <strong>{verification_code}</strong></p>
        <p>This code will expire in {expire_minutes} minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
    """
    
    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=html_template,
        environment={
            "project_name": settings.PROJECT_NAME,
            "verification_code": verification_code,
            "expire_minutes": settings.VERIFICATION_CODE_EXPIRE_MINUTES,
        },
    )

def send_reset_password_email(email_to: str, reset_token: str) -> None:
    """Send password reset email to user."""
    subject = "Password Reset Request"
    html_template = """
        <p>You have requested to reset your password for {project_name}.</p>
        <p>To reset your password, use the following token: <strong>{reset_token}</strong></p>
        <p>This token will expire in {expire_minutes} minutes.</p>
        <p>If you didn't request this, please ignore this email and make sure your account is secure.</p>
    """
    
    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=html_template,
        environment={
            "project_name": settings.PROJECT_NAME,
            "reset_token": reset_token,
            "expire_minutes": settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
        },
    )

def send_password_change_notification(email_to: str) -> None:
    """Send notification when password is changed."""
    subject = "Password Changed"
    html_template = """
        <p>Your password for {project_name} has been changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
    """
    
    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=html_template,
        environment={
            "project_name": settings.PROJECT_NAME,
        },
    )
