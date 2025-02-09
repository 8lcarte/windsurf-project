from typing import Dict, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings

class SocialAccount(BaseModel):
    """Base model for social account data."""
    provider: str
    account_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    access_token: str
    expires_at: Optional[int] = None
    refresh_token: Optional[str] = None

class GoogleOAuth2:
    """Google OAuth2 handler."""
    AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
    USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    @classmethod
    def get_authorize_url(cls, state: str) -> str:
        """Get Google OAuth2 authorization URL."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "response_type": "code",
            "scope": "openid email profile",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "state": state,
            "access_type": "offline",  # To get refresh token
            "prompt": "consent",  # To always get refresh token
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{cls.AUTHORIZE_ENDPOINT}?{query}"
    
    @classmethod
    async def get_token(cls, code: str) -> Dict[str, str]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                cls.TOKEN_ENDPOINT,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get Google access token"
                )
            
            return response.json()
    
    @classmethod
    async def get_user_info(cls, access_token: str) -> Dict[str, str]:
        """Get user info from Google."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                cls.USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get Google user info"
                )
            
            return response.json()

class GitHubOAuth2:
    """GitHub OAuth2 handler."""
    AUTHORIZE_ENDPOINT = "https://github.com/login/oauth/authorize"
    TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token"
    USERINFO_ENDPOINT = "https://api.github.com/user"
    EMAIL_ENDPOINT = "https://api.github.com/user/emails"
    
    @classmethod
    def get_authorize_url(cls, state: str) -> str:
        """Get GitHub OAuth2 authorization URL."""
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "scope": "read:user user:email",
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{cls.AUTHORIZE_ENDPOINT}?{query}"
    
    @classmethod
    async def get_token(cls, code: str) -> Dict[str, str]:
        """Exchange authorization code for token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                cls.TOKEN_ENDPOINT,
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get GitHub access token"
                )
            
            return response.json()
    
    @classmethod
    async def get_user_info(cls, access_token: str) -> Tuple[Dict[str, str], str]:
        """Get user info and primary email from GitHub."""
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"token {access_token}",
                "Accept": "application/json",
            }
            
            # Get user profile
            user_response = await client.get(cls.USERINFO_ENDPOINT, headers=headers)
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get GitHub user info"
                )
            user_info = user_response.json()
            
            # Get user emails
            email_response = await client.get(cls.EMAIL_ENDPOINT, headers=headers)
            if email_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get GitHub email"
                )
            
            # Find primary email
            emails = email_response.json()
            primary_email = next(
                (email["email"] for email in emails if email["primary"]),
                None
            )
            
            if not primary_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No primary email found"
                )
            
            return user_info, primary_email

async def get_social_account(provider: str, code: str) -> SocialAccount:
    """Get social account info from provider."""
    if provider == "google":
        # Get Google tokens
        tokens = await GoogleOAuth2.get_token(code)
        user_info = await GoogleOAuth2.get_user_info(tokens["access_token"])
        
        return SocialAccount(
            provider="google",
            account_id=user_info["id"],
            email=user_info["email"],
            name=user_info.get("name"),
            picture=user_info.get("picture"),
            access_token=tokens["access_token"],
            expires_at=tokens.get("expires_in"),
            refresh_token=tokens.get("refresh_token"),
        )
    
    elif provider == "github":
        # Get GitHub token
        token_info = await GitHubOAuth2.get_token(code)
        user_info, email = await GitHubOAuth2.get_user_info(token_info["access_token"])
        
        return SocialAccount(
            provider="github",
            account_id=str(user_info["id"]),
            email=email,
            name=user_info.get("name"),
            picture=user_info.get("avatar_url"),
            access_token=token_info["access_token"],
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}"
        )
