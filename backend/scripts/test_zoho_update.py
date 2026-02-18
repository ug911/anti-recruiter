import os
import requests
from dotenv import load_dotenv
import sys

# Add backend to path to use ZohoAuthService
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.zoho_auth import ZohoAuthService

load_dotenv(os.path.join('backend', '.env'))

def test_status_update():
    token = ZohoAuthService.get_access_token()
    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "Content-Type": "application/json"
    }

    # Use the IDs from the user request
    job_id = "846914000000554001"
    candidate_id = "846914000000558001"
    status = "Screening"
    
    ZOHO_API_BASE = "https://recruit.zoho.in/recruit/v2"

    print(f"\n--- Fetching Associated Candidates ---")
    url_get = f"{ZOHO_API_BASE}/Job_Openings/{job_id}/associate"
    res_get = requests.get(url_get, headers=headers)
    print(f"Fetch Response: {res_get.status_code}")
    if res_get.status_code == 200:
        data = res_get.json()
        if data.get("data"):
            first = data["data"][0]
            print(f"First record ID: {first.get('id')}")
            print(f"Available keys: {list(first.keys())}")
            print(f"Application_Status: {first.get('Application_Status')}")
            print(f"Candidate_Stage: {first.get('Candidate_Stage')}")
            print(f"Status: {first.get('Status')}")

    print(f"\n--- Testing Candidate Update (PUT) ---")
    url = f"{ZOHO_API_BASE}/Candidates/{candidate_id}"
    payload = {
        "data": [
            {
                "id": candidate_id,
                "Application_Status": status,
                "Candidate_Stage": status
            }
        ]
    }
    res = requests.put(url, headers=headers, json=payload)
    print(f"Candidate Update: {res.status_code}")
    print(res.text)

    print(f"\n--- Testing Association Update (POST) ---")
    # Trying POST as associate endpoint often uses POST for mapping
    url_assoc = f"{ZOHO_API_BASE}/Job_Openings/{job_id}/associate"
    payload_assoc = {
        "data": [
            {
                "id": candidate_id,
                "Status": status
            }
        ]
    }
    res_assoc = requests.post(url_assoc, headers=headers, json=payload_assoc)
    print(f"Association Update (POST): {res_assoc.status_code}")
    print(res_assoc.text)

if __name__ == "__main__":
    test_status_update()
