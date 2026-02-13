from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from app.services.zoho_auth import ZohoAuthService

router = APIRouter(prefix="/auth/zoho", tags=["auth"])

@router.get("/login")
def zoho_login():
    """Redirects user to Zoho OAuth page"""
    auth_url = ZohoAuthService.get_auth_url()
    return RedirectResponse(auth_url)

@router.get("/callback")
def zoho_callback(code: str):
    """Handles the callback from Zoho with the authorization code"""
    try:
        tokens = ZohoAuthService.exchange_code_for_token(code)
        # Redirect back to Frontend Dashboard after successful login
        return RedirectResponse("http://localhost:5173/?zoho_connected=true")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
