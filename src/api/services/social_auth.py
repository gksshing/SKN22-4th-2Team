import httpx
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from src.config import config

logger = logging.getLogger(__name__)

# config 객체를 통해 환경 변수를 관리합니다 (Architect Review 반영)
GOOGLE_CLIENT_ID = config.social_auth.google_client_id
GOOGLE_CLIENT_SECRET = config.social_auth.google_client_secret
GOOGLE_REDIRECT_URI = config.social_auth.google_redirect_uri

NAVER_CLIENT_ID = config.social_auth.naver_client_id
NAVER_CLIENT_SECRET = config.social_auth.naver_client_secret
NAVER_REDIRECT_URI = config.social_auth.naver_redirect_uri

KAKAO_CLIENT_ID = config.social_auth.kakao_client_id
KAKAO_CLIENT_SECRET = config.social_auth.kakao_client_secret
KAKAO_REDIRECT_URI = config.social_auth.kakao_redirect_uri

class SocialAuthService:
    @staticmethod
    async def get_google_user(code: str) -> Dict[str, Any]:
        """구글 인증 코드를 사용하여 유저 정보를 가져옵니다."""
        async with httpx.AsyncClient() as client:
            # 1. 토큰 교환
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
            res = await client.post(token_url, data=data)
            if res.status_code != 200:
                logger.error(f"Google token exchange failed: {res.text}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="구글 인증에 실패했습니다.")
            
            access_token = res.json().get("access_token")
            
            # 2. 유저 정보 요청
            user_info_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return user_info_res.json()

    @staticmethod
    async def get_naver_user(code: str, state: str) -> Dict[str, Any]:
        """네이버 인증 코드를 사용하여 유저 정보를 가져옵니다."""
        async with httpx.AsyncClient() as client:
            # 1. 토큰 교환
            token_url = "https://nid.naver.com/oauth2.0/token"
            params = {
                "grant_type": "authorization_code",
                "client_id": NAVER_CLIENT_ID,
                "client_secret": NAVER_CLIENT_SECRET,
                "code": code,
                "state": state,
            }
            res = await client.get(token_url, params=params)
            if res.status_code != 200:
                logger.error(f"Naver token exchange failed: {res.text}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="네이버 인증에 실패했습니다.")
            
            access_token = res.json().get("access_token")
            
            # 2. 유저 정보 요청
            user_info_res = await client.get(
                "https://openapi.naver.com/v1/nid/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return user_info_res.json().get("response")

    @staticmethod
    async def get_kakao_user(code: str) -> Dict[str, Any]:
        """카카오 인증 코드를 사용하여 유저 정보를 가져옵니다."""
        async with httpx.AsyncClient() as client:
            # 1. 토큰 교환
            token_url = "https://kauth.kakao.com/oauth/token"
            data = {
                "grant_type": "authorization_code",
                "client_id": KAKAO_CLIENT_ID,
                "client_secret": KAKAO_CLIENT_SECRET,
                "redirect_uri": KAKAO_REDIRECT_URI,
                "code": code,
            }
            res = await client.post(token_url, data=data)
            if res.status_code != 200:
                logger.error(f"Kakao token exchange failed: {res.text}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="카카오 인증에 실패했습니다.")
            
            access_token = res.json().get("access_token")
            
            # 2. 유저 정보 요청
            user_info_res = await client.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return user_info_res.json()
