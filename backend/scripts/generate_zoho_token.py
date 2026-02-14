import os
import requests
from dotenv import load_dotenv

def generate_refresh_token():
    # Load environment variables from .env
    load_dotenv()
    
    client_id = os.getenv("ZOHO_CLIENT_ID")
    client_secret = os.getenv("ZOHO_CLIENT_SECRET")
    redirect_uri = os.getenv("ZOHO_REDIRECT_URI", "http://localhost:8000/auth/zoho/callback")

    if not client_id or not client_secret:
        print("Error: ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET not found in .env file.")
        return

    print("--- Zoho Refresh Token Generator ---")
    print("1. Go to Zoho API Console (https://api-console.zoho.in/)")
    print("2. Select your 'Self-Client' (or create one).")
    print("3. In the 'Generate Code' tab, enter the following scopes:")
    print("   ZohoRecruit.modules.ALL,ZohoRecruit.settings.ALL")
    print("4. Set Time Duration to '10 minutes' and enter any 'Scope' description.")
    print("5. Click GENERATE and copy the Grant Token (code).")
    print("6. Client ID and Client Secret are already in the .env file.")
    print("-" * 40)
    
    grant_code = input("Enter the Zoho Grant Token (code) you just generated: ").strip()

    if not grant_code:
        print("Error: No grant code provided.")
        return

    token_url = "https://accounts.zoho.com/oauth/v2/token"
    
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": grant_code
    }

    print("\nExchanging code for tokens...")
    response = requests.post(token_url, data=data)
    
    if response.status_code == 200:
        tokens = response.json()
        if "refresh_token" in tokens:
            print("\nSUCCESS!")
            print(f"Your Refresh Token: {tokens['refresh_token']}")
            print("\nCopy this token and add it to your .env file as:")
            print(f"ZOHO_REFRESH_TOKEN={tokens['refresh_token']}")
        else:
            print("\nError: Refresh token missing in response.")
            print(f"Response: {tokens}")
    else:
        print(f"\nFailed to exchange token. Status Code: {response.status_code}")
        print(f"Error: {response.text}")

if __name__ == "__main__":
    generate_refresh_token()
