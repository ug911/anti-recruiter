import os
import requests
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

# TODO: These should be loaded from environment variables
ZOHO_CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
ZOHO_REDIRECT_URI = os.getenv("ZOHO_REDIRECT_URI") 
ZOHO_REFRESH_TOKEN = os.getenv("ZOHO_REFRESH_TOKEN")

ZOHO_AUTH_URL = "https://accounts.zoho.com/oauth/v2/auth"
ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token"

# Simple in-memory storage for MVP. In prod, use DB.
_token_storage = {
    "access_token": None,
    "refresh_token": ZOHO_REFRESH_TOKEN
}

class ZohoAuthService:
    @staticmethod
    def get_auth_url():
        params = {
            "scope": "ZohoRecruit.modules.ALL,ZohoRecruit.settings.ALL",
            "client_id": ZOHO_CLIENT_ID,
            "response_type": "code",
            "access_type": "offline",
            "redirect_uri": ZOHO_REDIRECT_URI,
            "prompt": "consent" # Ensure refresh token is provided
        }
        return f"{ZOHO_AUTH_URL}?{urlencode(params)}"

    @staticmethod
    def refresh_access_token():
        """Refreshes the access token using the system refresh token"""
        refresh_token = os.getenv("ZOHO_REFRESH_TOKEN") or _token_storage.get("refresh_token")
        if not refresh_token:
            raise Exception("ZOHO_REFRESH_TOKEN not found in environment or storage.")

        data = {
            "grant_type": "refresh_token",
            "client_id": ZOHO_CLIENT_ID,
            "client_secret": ZOHO_CLIENT_SECRET,
            "refresh_token": refresh_token,
        }
        response = requests.post(ZOHO_TOKEN_URL, data=data)
        if response.status_code == 200:
            tokens = response.json()
            _token_storage["access_token"] = tokens.get("access_token")
            # Zoho might provide a new refresh token, though rare for refresh_token grant
            if tokens.get("refresh_token"):
                _token_storage["refresh_token"] = tokens.get("refresh_token")
            return tokens.get("access_token")
        else:
            raise Exception(f"Failed to refresh Zoho token: {response.text}")

    @staticmethod
    def exchange_code_for_token(code: str):
        data = {
            "grant_type": "authorization_code",
            "client_id": ZOHO_CLIENT_ID,
            "client_secret": ZOHO_CLIENT_SECRET,
            "redirect_uri": ZOHO_REDIRECT_URI,
            "code": code,
        }
        response = requests.post(ZOHO_TOKEN_URL, data=data)
        if response.status_code == 200:
            tokens = response.json()
            _token_storage["access_token"] = tokens.get("access_token")
            _token_storage["refresh_token"] = tokens.get("refresh_token")
            return tokens
        else:
            raise Exception(f"Failed to exchange token: {response.text}")

    @staticmethod
    def get_access_token():
        """Returns valid access token, refreshing if necessary"""
        token = _token_storage.get("access_token")
        if not token:
            # Try to refresh using the refresh token
            return ZohoAuthService.refresh_access_token()
        return token
