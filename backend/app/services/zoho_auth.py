import os
import requests
from urllib.parse import urlencode

# TODO: These should be loaded from environment variables
ZOHO_CLIENT_ID = os.getenv("ZOHO_CLIENT_ID", "YOUR_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET", "YOUR_CLIENT_SECRET")
# Ensure this matches your registered redirect URI in Zoho Console
ZOHO_REDIRECT_URI = os.getenv("ZOHO_REDIRECT_URI", "http://localhost:8000/auth/zoho/callback") 
ZOHO_AUTH_URL = "https://accounts.zoho.in/oauth/v2/auth"
ZOHO_TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token"

# Simple in-memory storage for MVP. In prod, use DB.
_token_storage = {}

class ZohoAuthService:
    @staticmethod
    def get_auth_url():
        params = {
            "scope": "ZohoRecruit.modules.ALL,ZohoRecruit.settings.ALL", # Adjust scopes as needed
            "client_id": ZOHO_CLIENT_ID,
            "response_type": "code",
            "access_type": "offline",
            "redirect_uri": ZOHO_REDIRECT_URI,
        }
        return f"{ZOHO_AUTH_URL}?{urlencode(params)}"

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
            # Store tokens (Access + Refresh)
            _token_storage["access_token"] = tokens.get("access_token")
            _token_storage["refresh_token"] = tokens.get("refresh_token")
            # Also store expiry time in real app
            return tokens
        else:
            raise Exception(f"Failed to exchange token: {response.text}")

    @staticmethod
    def get_access_token():
        return _token_storage.get("access_token")
