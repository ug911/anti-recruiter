"""
Zoho Recruit MCP Server

Exposes Zoho Recruit API operations as MCP tools so any MCP-compatible
AI agent (including Claude via Anthropic SDK) can call them.

Run standalone (stdio transport — the agent backend spawns this):
    python zoho_mcp_server.py
"""

import sys
import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Load env from this file's directory first, then fall back up to repo root
# ---------------------------------------------------------------------------
_here = Path(__file__).parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / "backend" / ".env")  # fallback to agent/backend/.env

ZOHO_CLIENT_ID      = os.getenv("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET  = os.getenv("ZOHO_CLIENT_SECRET")
ZOHO_REFRESH_TOKEN  = os.getenv("ZOHO_REFRESH_TOKEN")
# Region-aware endpoints: set ZOHO_REGION=com | eu | in | au | jp (default: in)
_REGION             = os.getenv("ZOHO_REGION", "in")
ZOHO_TOKEN_URL      = f"https://accounts.zoho.{_REGION}/oauth/v2/token"
ZOHO_API_BASE       = f"https://recruit.zoho.{_REGION}/recruit/v2"

if not all([ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN]):
    print(
        "ERROR: Missing Zoho credentials. "
        "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in "
        f"{_here / '.env'} or {_here.parent / 'backend' / '.env'}",
        file=sys.stderr,
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Simple token cache (in-process, sufficient for the MCP subprocess lifetime)
# ---------------------------------------------------------------------------
_token_cache: dict = {"access_token": None}


def _get_access_token(force_refresh: bool = False) -> str:
    if force_refresh:
        _token_cache["access_token"] = None

    if _token_cache["access_token"]:
        return _token_cache["access_token"]

    data = {
        "grant_type":    "refresh_token",
        "client_id":     ZOHO_CLIENT_ID,
        "client_secret": ZOHO_CLIENT_SECRET,
        "refresh_token": ZOHO_REFRESH_TOKEN,
    }
    resp = requests.post(ZOHO_TOKEN_URL, data=data, timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to refresh Zoho token: {resp.text}")
    token = resp.json().get("access_token")
    _token_cache["access_token"] = token
    return token


def _headers(force_refresh: bool = False) -> dict:
    return {
        "Authorization": f"Zoho-oauthtoken {_get_access_token(force_refresh)}",
        "Content-Type":  "application/json",
    }


def _zoho_request(method: str, url: str, **kwargs):
    """Make a Zoho API request, retry once with refreshed token on 401."""
    resp = requests.request(method, url, headers=_headers(), **kwargs, timeout=20)
    if resp.status_code == 401:
        resp = requests.request(method, url, headers=_headers(force_refresh=True), **kwargs, timeout=20)
    return resp


# ---------------------------------------------------------------------------
# FastMCP server
# ---------------------------------------------------------------------------
mcp = FastMCP("ZohoRecruit")


@mcp.tool()
def list_jobs() -> str:
    """
    List all job openings from Zoho Recruit.
    Returns a JSON array of job objects (id, title, location, status, salary, industry, job_type, target_date, description).
    """
    params = {
        "fields": "id,Posting_Title,City,Job_Opening_Status,Salary,Industry,Job_Type,Target_Date,Job_Description,Client_Name"
    }
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/JobOpenings", params=params)

    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Zoho API error {resp.status_code}: {resp.text}"})

    jobs = []
    for item in resp.json().get("data", []):
        client = item.get("Client_Name")
        jobs.append({
            "id":          item.get("id"),
            "title":       item.get("Posting_Title"),
            "location":    item.get("City"),
            "status":      item.get("Job_Opening_Status"),
            "salary":      item.get("Salary"),
            "industry":    item.get("Industry"),
            "job_type":    item.get("Job_Type"),
            "target_date": item.get("Target_Date"),
            "description": item.get("Job_Description") or "No description",
            "client_name": client.get("name") if isinstance(client, dict) else client,
        })
    return json.dumps(jobs, indent=2)


@mcp.tool()
def get_job(job_id: str) -> str:
    """
    Get full details of a specific job opening by its Zoho record ID.

    Args:
        job_id: The Zoho record ID of the job opening.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/JobOpenings/{job_id}")
    if resp.status_code != 200:
        return json.dumps({"error": f"Zoho API error {resp.status_code}: {resp.text}"})
    data = resp.json().get("data")
    if not data:
        return json.dumps({"error": "Job not found"})
    return json.dumps(data[0], indent=2)


@mcp.tool()
def create_job(
    title: str,
    location: str,
    description: str,
    industry: str = "",
    job_type: str = "Full time",
    salary_range: str = "",
    target_date: str = "",
) -> str:
    """
    Create a new job opening in Zoho Recruit.

    Args:
        title:        Job title / posting title.
        location:     City or location of the role.
        description:  Full job description text.
        industry:     Industry sector (e.g. Technology, Finance).
        job_type:     Employment type (Full time, Part time, Contract, etc.).
        salary_range: Salary range string (e.g. "80000-100000").
        target_date:  Application deadline in YYYY-MM-DD format.

    Returns the new job's Zoho record ID on success.
    """
    payload = {
        "data": [{
            "Posting_Title":       title,
            "Job_Opening_Name":    title,
            "Client_Name":         "My Company",
            "City":                location,
            "Job_Description":     description,
            "Industry":            industry,
            "Job_Type":            job_type,
            "Salary":              salary_range,
            "Target_Date":         target_date,
            "Job_Opening_Status":  "In-progress",
        }]
    }
    resp = _zoho_request("POST", f"{ZOHO_API_BASE}/JobOpenings", json=payload)
    if resp.status_code not in (200, 201):
        return json.dumps({"error": f"Create failed {resp.status_code}: {resp.text}"})

    data = resp.json().get("data", [])
    if data and data[0].get("status") == "success":
        record_id = data[0]["details"]["id"]
        return json.dumps({"success": True, "job_id": record_id, "message": f"Job '{title}' created with ID {record_id}"})
    return json.dumps({"error": "Unexpected Zoho response", "raw": resp.json()})


@mcp.tool()
def archive_job(job_id: str) -> str:
    """
    Archive (cancel) a job opening in Zoho Recruit.

    Args:
        job_id: The Zoho record ID of the job to archive.
    """
    payload = {"data": [{"Job_Opening_Status": "Cancelled"}]}
    resp = _zoho_request("PUT", f"{ZOHO_API_BASE}/JobOpenings/{job_id}", json=payload)
    if resp.status_code != 200:
        return json.dumps({"error": f"Archive failed {resp.status_code}: {resp.text}"})
    data = resp.json().get("data", [])
    if data and data[0].get("status") == "success":
        return json.dumps({"success": True, "message": f"Job {job_id} archived successfully"})
    return json.dumps({"error": "Unexpected response", "raw": resp.json()})


@mcp.tool()
def get_candidates(job_id: str) -> str:
    """
    List candidates formally associated (linked in the pipeline) with a specific job opening.
    Returns a JSON array of candidate objects, or an empty array if none are associated yet.
    NOTE: Candidates must be explicitly linked to the job opening in Zoho Recruit's pipeline.
    Use list_all_candidates() to see all candidates in the account.

    Args:
        job_id: The Zoho record ID of the job opening.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Job_Openings/{job_id}/associate")

    if resp.status_code == 204:
        return json.dumps({
            "info": "No candidates are currently associated with this job opening in Zoho Recruit's pipeline.",
            "candidates": [],
            "tip": "Use list_all_candidates() to see all candidates in the account."
        })
    if resp.status_code != 200:
        return json.dumps({"error": f"Zoho API error {resp.status_code}: {resp.text}"})

    candidates = []
    for item in resp.json().get("data", []):
        candidates.append({
            "id":           item.get("id"),
            "first_name":   item.get("First_Name"),
            "last_name":    item.get("Last_Name"),
            "email":        item.get("Email"),
            "phone":        item.get("Phone") or item.get("Mobile"),
            "status":       item.get("Application_Status") or item.get("Candidate_Stage") or "Applied",
            "applied_date": item.get("Created_Time", "").split("T")[0],
        })
    return json.dumps(candidates, indent=2)


@mcp.tool()
def get_candidate(candidate_id: str) -> str:
    """
    Get detailed information about a specific candidate.

    Args:
        candidate_id: The Zoho record ID of the candidate.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Candidates/{candidate_id}")
    if resp.status_code != 200:
        return json.dumps({"error": f"Zoho API error {resp.status_code}: {resp.text}"})
    data = resp.json().get("data")
    if not data:
        return json.dumps({"error": "Candidate not found"})
    return json.dumps(data[0], indent=2)


@mcp.tool()
def list_all_candidates(page: int = 1) -> str:
    """
    List all candidates in the Zoho Recruit account (not filtered by job).
    Use this when you need to browse all candidates regardless of which job they applied to.
    Use get_candidates(job_id) to see candidates formally associated with a specific job.

    Args:
        page: Page number for pagination (default 1, 50 candidates per page).

    Returns a JSON array of candidate summaries.
    """
    params = {
        "fields": "First_Name,Last_Name,Email,Mobile,Candidate_Stage,Current_Job_Title,Skill_Set,Experience_in_Years",
        "per_page": 50,
        "page": page,
    }
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Candidates", params=params)
    if resp.status_code == 204:
        return json.dumps({"info": "No candidates found in the account.", "candidates": []})
    if resp.status_code != 200:
        return json.dumps({"error": f"Zoho API error {resp.status_code}: {resp.text}"})

    candidates = []
    for item in resp.json().get("data", []):
        candidates.append({
            "id":           item.get("id"),
            "first_name":   item.get("First_Name"),
            "last_name":    item.get("Last_Name"),
            "email":        item.get("Email"),
            "phone":        item.get("Mobile"),
            "stage":        item.get("Candidate_Stage"),
            "title":        item.get("Current_Job_Title"),
            "skills":       item.get("Skill_Set"),
            "experience_years": item.get("Experience_in_Years"),
        })
    info = resp.json().get("info", {})
    return json.dumps({
        "candidates": candidates,
        "total": info.get("count", len(candidates)),
        "page": info.get("page", page),
        "more": info.get("more_records", False),
    }, indent=2)


@mcp.tool()
def update_candidate_status(job_id: str, candidate_id: str, status: str) -> str:
    """
    Update the pipeline stage / application status for a candidate associated with a job.

    Args:
        job_id:       The Zoho record ID of the job opening.
        candidate_id: The Zoho record ID of the candidate.
        status:       New status string (e.g. "Interview Scheduled", "Hired", "Rejected").
    """
    # Update candidate record
    payload = {"data": [{"Application_Status": status, "Candidate_Stage": status}]}
    resp1 = _zoho_request("PUT", f"{ZOHO_API_BASE}/Candidates/{candidate_id}", json=payload)

    # Update association record
    payload_a = {"data": [{"id": candidate_id, "Status": status}]}
    resp2 = _zoho_request("PUT", f"{ZOHO_API_BASE}/Job_Openings/{job_id}/associate", json=payload_a)

    if resp2.status_code == 200:
        return json.dumps({"success": True, "message": f"Candidate {candidate_id} status updated to '{status}'"})
    return json.dumps({
        "error": "Status update may have partially failed",
        "candidate_update": resp1.status_code,
        "association_update": resp2.status_code,
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # stdio transport — meant to be spawned as a subprocess by the agent
    mcp.run(transport="stdio")
