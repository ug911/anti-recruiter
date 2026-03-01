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
import base64
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
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Job_Openings", params=params)

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
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Job_Openings/{job_id}")
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
    resp = _zoho_request("POST", f"{ZOHO_API_BASE}/Job_Openings", json=payload)
    if resp.status_code not in (200, 201):
        return json.dumps({"error": f"Create failed {resp.status_code}: {resp.text}"})

    data = resp.json().get("data", [])
    if data and data[0].get("status") == "success":
        record_id = data[0]["details"]["id"]
        return json.dumps({"success": True, "job_id": record_id, "message": f"Job '{title}' created with ID {record_id}"})
    return json.dumps({"error": "Unexpected Zoho response", "raw": resp.json()})


@mcp.tool()
def create_candidate(
    first_name: str,
    last_name: str,
    email: str,
    phone: str = "",
    mobile: str = "",
    title: str = "",
    skills: str = "",
    experience: str = "",
) -> str:
    """
    Create a new candidate in Zoho Recruit.

    Args:
        first_name:  Candidate's first name.
        last_name:   Candidate's last name.
        email:       Candidate's email address.
        phone:       Office or home phone.
        mobile:      Mobile phone number.
        title:       Current job title.
        skills:      Comma-separated skills (e.g. "Python, SQL, AWS").
        experience:  Years of experience (as a string or number).
    """
    payload = {
        "data": [{
            "First_Name":        first_name,
            "Last_Name":         last_name,
            "Email":             email,
            "Phone":             phone,
            "Mobile":            mobile,
            "Current_Job_Title": title,
            "Skill_Set":         skills,
            "Experience_in_Years": experience,
            "Candidate_Status":   "New",
        }]
    }
    resp = _zoho_request("POST", f"{ZOHO_API_BASE}/Candidates", json=payload)
    if resp.status_code not in (200, 201):
        return json.dumps({"error": f"Create failed {resp.status_code}: {resp.text}"})

    data = resp.json().get("data", [])
    if data and data[0].get("status") == "success":
        record_id = data[0]["details"]["id"]
        return json.dumps({"success": True, "candidate_id": record_id, "message": f"Candidate {first_name} {last_name} created with ID {record_id}"})
    return json.dumps({"error": "Unexpected Zoho response", "raw": resp.json()})


@mcp.tool()
def search_candidates(query: str, type: str = "word") -> str:
    """
    Search for candidates in Zoho Recruit.

    Args:
        query: The search term (e.g. "Python", "candidate@email.com").
        type:  The search type: "word" (full text), "email" (exact), "phone" (exact), or "criteria".
               For "criteria", use format: (Email:equals:test@test.com).
    """
    params = {}
    if type == "criteria":
        params["criteria"] = query
    else:
        params[type] = query

    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Candidates/search", params=params)
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Search failed {resp.status_code}: {resp.text}"})

    candidates = []
    for item in resp.json().get("data", []):
        candidates.append({
            "id":           item.get("id"),
            "first_name":   item.get("First_Name"),
            "last_name":    item.get("Last_Name"),
            "email":        item.get("Email"),
            "stage":        item.get("Candidate_Stage"),
            "title":        item.get("Current_Job_Title"),
            "skills":       item.get("Skill_Set"),
        })
    return json.dumps(candidates, indent=2)


@mcp.tool()
def search_jobs(query: str, type: str = "word") -> str:
    """
    Search for job openings in Zoho Recruit.

    Args:
        query: The search term (e.g. "Developer", "Bangalore").
        type:  The search type: "word" (full text) or "criteria".
    """
    params = {}
    if type == "criteria":
        params["criteria"] = query
    else:
        params[type] = query

    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Job_Openings/search", params=params)
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Search failed {resp.status_code}: {resp.text}"})

    jobs = []
    for item in resp.json().get("data", []):
        jobs.append({
            "id":          item.get("id"),
            "title":       item.get("Posting_Title"),
            "location":    item.get("City"),
            "status":      item.get("Job_Opening_Status"),
            "industry":    item.get("Industry"),
        })
    return json.dumps(jobs, indent=2)


@mcp.tool()
def associate_candidate(job_id: str, candidate_id: str, comments: str = "") -> str:
    """
    Associate (link) a candidate to a specific job opening's pipeline.

    Args:
        job_id:       The Zoho record ID of the job opening.
        candidate_id: The Zoho record ID of the candidate.
        comments:     Optional internal comments for the association.
    """
    payload = {
        "data": [{
            "jobids": [job_id],
            "ids": [candidate_id],
            "comments": comments
        }]
    }
    resp = _zoho_request("PUT", f"{ZOHO_API_BASE}/Candidates/actions/associate", json=payload)
    if resp.status_code not in (200, 201, 202):
        return json.dumps({"error": f"Association failed {resp.status_code}: {resp.text}"})

    return json.dumps(resp.json(), indent=2)


@mcp.tool()
def archive_job(job_id: str) -> str:
    """
    Archive (cancel) a job opening in Zoho Recruit.

    Args:
        job_id: The Zoho record ID of the job to archive.
    """
    payload = {"data": [{"Job_Opening_Status": "Cancelled"}]}
    resp = _zoho_request("PUT", f"{ZOHO_API_BASE}/Job_Openings/{job_id}", json=payload)
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
    Update the hiring pipeline stage / application status for a candidate associated with a job.

    Args:
        job_id:       The Zoho record ID of the job opening.
        candidate_id: The Zoho record ID of the candidate.
        status:       New status string (e.g. "Interview Scheduled", "Hired", "Rejected").
    """
    # Use the dedicated Candidate status endpoint for context-aware pipeline updates
    payload = {
        "data": [{
            "ids": [candidate_id],
            "jobids": [job_id],
            "Candidate_Status": status
        }]
    }
    resp = _zoho_request("PUT", f"{ZOHO_API_BASE}/Candidates/status", json=payload)

    if resp.status_code in (200, 201, 202):
        return json.dumps({"success": True, "message": f"Candidate {candidate_id} status updated to '{status}' for Job {job_id}"})
    
    return json.dumps({
        "error": f"Status update failed {resp.status_code}: {resp.text}"
    })


@mcp.tool()
def add_note(module: str, record_id: str, content: str) -> str:
    """
    Add an internal note to a record in Zoho Recruit.

    Args:
        module:    The API name of the module (e.g. "Candidates", "Job_Openings").
        record_id: The Zoho record ID to attach the note to.
        content:   The text content of the note.
    """
    payload = {
        "data": [{
            "Parent_Id": record_id,
            "se_module": module,
            "Note_Content": content
        }]
    }
    resp = _zoho_request("POST", f"{ZOHO_API_BASE}/Notes", json=payload)
    if resp.status_code not in (200, 201):
        return json.dumps({"error": f"Failed to add note {resp.status_code}: {resp.text}"})

    return json.dumps({"success": True, "message": "Note added successfully"})


@mcp.tool()
def list_notes(module: str, record_id: str) -> str:
    """
    List all internal notes associated with a specific record.

    Args:
        module:    The API name of the module (e.g. "Candidates", "Job_Openings").
        record_id: The Zoho record ID.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/{module}/{record_id}/Notes")
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to list notes {resp.status_code}: {resp.text}"})

    notes = []
    for item in resp.json().get("data", []):
        notes.append({
            "id":           item.get("id"),
            "content":      item.get("Note_Content"),
            "owner":        item.get("Owner", {}).get("name"),
            "created_time": item.get("Created_Time"),
        })
    return json.dumps(notes, indent=2)


@mcp.tool()
def list_interviews(page: int = 1) -> str:
    """
    List scheduled interviews in Zoho Recruit.
    """
    params = {"page": page, "per_page": 50}
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Interviews", params=params)
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to list interviews {resp.status_code}: {resp.text}"})

    interviews = []
    for item in resp.json().get("data", []):
        interviews.append({
            "id":             item.get("id"),
            "name":           item.get("Interview_Name"),
            "candidate":      item.get("Candidate_Name", {}).get("name"),
            "job":            item.get("Job_Opening_Name", {}).get("name"),
            "interviewers":   [i.get("name") for i in item.get("Interviewers", [])],
            "from_time":      item.get("From"),
            "to_time":        item.get("To"),
            "location":       item.get("Location"),
        })
    return json.dumps(interviews, indent=2)


@mcp.tool()
def get_interview(interview_id: str) -> str:
    """
    Get full details of a specific interview.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Interviews/{interview_id}")
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to get interview {resp.status_code}: {resp.text}"})
    data = resp.json().get("data")
    return json.dumps(data[0] if data else {}, indent=2)


@mcp.tool()
def list_clients(page: int = 1) -> str:
    """
    List client organizations in Zoho Recruit.
    """
    params = {"page": page, "per_page": 50}
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Clients", params=params)
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to list clients {resp.status_code}: {resp.text}"})

    clients = []
    for item in resp.json().get("data", []):
        clients.append({
            "id":           item.get("id"),
            "name":         item.get("Client_Name"),
            "industry":     item.get("Industry"),
            "website":      item.get("Website"),
            "status":       item.get("Client_Status"),
        })
    return json.dumps(clients, indent=2)


@mcp.tool()
def get_client(client_id: str) -> str:
    """
    Get full details of a specific client organization.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Clients/{client_id}")
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to get client {resp.status_code}: {resp.text}"})
    data = resp.json().get("data")
    return json.dumps(data[0] if data else {}, indent=2)


@mcp.tool()
def list_contacts(page: int = 1) -> str:
    """
    List client contacts in Zoho Recruit.
    """
    params = {"page": page, "per_page": 50}
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/Contacts", params=params)
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to list contacts {resp.status_code}: {resp.text}"})

    contacts = []
    for item in resp.json().get("data", []):
        contacts.append({
            "id":         item.get("id"),
            "full_name":  item.get("Full_Name"),
            "email":      item.get("Email"),
            "phone":      item.get("Phone") or item.get("Mobile"),
            "client":     item.get("Client_Name", {}).get("name"),
        })
    return json.dumps(contacts, indent=2)


@mcp.tool()
def list_attachments(module: str, record_id: str) -> str:
    """
    List all files (resumes, etc.) attached to a specific record.

    Args:
        module:    The API name of the module (e.g. "Candidates", "Job_Openings").
        record_id: The Zoho record ID.
    """
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/{module}/{record_id}/Attachments")
    if resp.status_code == 204:
        return json.dumps([])
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to list attachments {resp.status_code}: {resp.text}"})

    attachments = []
    for item in resp.json().get("data", []):
        attachments.append({
            "id":        item.get("id"),
            "file_name": item.get("File_Name"),
            "size":      item.get("Size"),
            "owner":     item.get("Owner", {}).get("name"),
            "type":      item.get("$type"), # 'attachment' or 'link'
        })
    return json.dumps(attachments, indent=2)


@mcp.tool()
def list_attachment_categories(module: str = "") -> str:
    """
    Get the list of predefined attachment categories in Zoho Recruit.
    Use this to find valid category labels/IDs before uploading a file.

    Args:
        module: Optional. Filter categories by module (e.g., "Candidates").
    """
    params = {}
    if module:
        params["module"] = module
    
    resp = _zoho_request("GET", f"{ZOHO_API_BASE}/settings/attachment_categories", params=params)
    if resp.status_code != 200:
        return json.dumps({"error": f"Failed to get categories {resp.status_code}: {resp.text}"})
    
    return json.dumps(resp.json().get("attachment_categories", []), indent=2)


@mcp.tool()
def upload_attachment(
    module: str,
    record_id: str,
    file_path: str,
    category_id: str,
    category_label: str
) -> str:
    """
    Upload a local file and attach it to a record in Zoho Recruit.

    Args:
        module:         The API name of the module (e.g. "Candidates", "Job_Openings").
        record_id:      The Zoho record ID to attach the file to.
        file_path:      The absolute path to the local file to upload.
        category_id:    The ID of the attachment category (get via list_attachment_categories).
        category_label: The label/name of the category.
    """
    if not os.path.exists(file_path):
        return json.dumps({"error": f"File not found: {file_path}"})

    params = {
        "attachments_category_id": category_id,
        "attachments_category": category_label
    }

    with open(file_path, "rb") as f:
        files = {"file": f}
        # Note: _zoho_request uses headers=_headers() which has Content-Type: application/json.
        # For multipart, we must let requests set the boundary.
        access_token = _get_access_token()
        headers = {
            "Authorization": f"Zoho-oauthtoken {access_token}"
            # No Content-Type here; requests will add it for multipart
        }
        url = f"{ZOHO_API_BASE}/{module}/{record_id}/Attachments"
        resp = requests.post(url, headers=headers, params=params, files=files, timeout=30)

    if resp.status_code not in (200, 201):
        return json.dumps({"error": f"Upload failed {resp.status_code}: {resp.text}"})

    return json.dumps(resp.json(), indent=2)


@mcp.tool()
def import_resume(file_path: str) -> str:
    """
    Upload a resume file and parse it to create or update a candidate in Zoho Recruit.
    This uses Zoho's built-in resume parser.

    Args:
        file_path: The absolute path to the candidate's resume (PDF, DOCX, etc.).
    """
    if not os.path.exists(file_path):
        return json.dumps({"error": f"File not found: {file_path}"})

    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        content = f.read()
        encoded = base64.b64encode(content).decode("utf-8")

    payload = {
        "data": [
            {
                "filename": filename,
                "document": encoded
            }
        ]
    }

    # The v2 endpoint for Candidates import_document uses 'filename' and 'document' keys.
    resp = _zoho_request("POST", f"{ZOHO_API_BASE}/Candidates/actions/import_document", json=payload)
    
    if resp.status_code not in (200, 201, 202):
        return json.dumps({"error": f"Import failed {resp.status_code}: {resp.text}"})

    return json.dumps(resp.json(), indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # stdio transport — meant to be spawned as a subprocess by the agent
    mcp.run(transport="stdio")
