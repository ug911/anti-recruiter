# Zoho Recruit Agentic Assistant

A Claude-powered AI agent that talks to Zoho Recruit via an MCP server. Chat with your recruitment data in plain English.

```
agent/
├── backend/          # FastAPI server + Claude agentic loop
│   ├── main.py
│   ├── agent.py
│   ├── requirements.txt
│   └── .env.example
├── mcp_server/       # Zoho Recruit MCP tools
│   ├── zoho_mcp_server.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/         # Chat UI (served by FastAPI)
    └── index.html
```

---

## 1 · Prerequisites

- Python 3.11+
- A [Zoho Recruit](https://recruit.zoho.in) account
- An [Anthropic API key](https://console.anthropic.com)

---

## 2 · Setup

### 2.1 Create a virtual environment

```bash
cd agent
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
```

### 2.2 Install dependencies

```bash
pip install -r backend/requirements.txt
pip install -r mcp_server/requirements.txt
```

---

## 3 · Environment Variables

### 3.1 Backend — `agent/backend/.env`

Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

```env
ANTHROPIC_API_KEY=sk-ant-...       # Your Anthropic API key

ZOHO_CLIENT_ID=1000.xxx...         # From Zoho API Console
ZOHO_CLIENT_SECRET=abc123...       # From Zoho API Console
ZOHO_REFRESH_TOKEN=1000.xxx...     # Generated below

# Optional
CLAUDE_MODEL=claude-haiku-4-5-20251001
MAX_TOKENS=4096
ZOHO_REGION=in                     # com | eu | in | au | jp  (default: in)
```

### 3.2 MCP Server — `agent/mcp_server/.env`

```bash
cp mcp_server/.env.example mcp_server/.env
```

Fill in the same `ZOHO_*` values as above. The backend `.env` is used as a fallback, so you only need to duplicate the Zoho credentials if you plan to run the MCP server standalone.

---

## 4 · Getting Zoho OAuth Credentials

### Step 1 — Create or find your app

1. Go to **[api-console.zoho.in](https://api-console.zoho.in)** (use your region's domain)
2. Under **Self Client**, note your **Client ID** and **Client Secret**

### Step 2 — Generate a grant code

In the **Self Client** tab → **Generate Code**:

- **Scope:** `ZohoRecruit.modules.ALL,ZohoRecruit.settings.ALL`
- **Time Duration:** 10 minutes
- Click **Create** → copy the code

### Step 3 — Exchange for a refresh token

```bash
curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=PASTE_GRANT_CODE_HERE" \
  -d "redirect_uri=https://www.zoho.com"
```

Copy the `refresh_token` from the response and put it in your `.env` files.

> **Tip:** Refresh tokens don't expire unless revoked. If you get `INVALID_TOKEN`, generate a new one using Steps 2-3.

### Region note

| Your Zoho account | Use domain |
|-------------------|------------|
| India     | `accounts.zoho.in` / `recruit.zoho.in`   |
| US/Global | `accounts.zoho.com` / `recruit.zoho.com` |
| EU        | `accounts.zoho.eu` / `recruit.zoho.eu`   |

Set `ZOHO_REGION` in `.env` to match (`in`, `com`, `eu`, `au`, or `jp`).

---

## 5 · Running the Server

```bash
cd backend
source ../venv/bin/activate
python main.py
```

Server starts at **http://localhost:8000**

- **Chat UI:** http://localhost:8000
- **API docs:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

The MCP server is spawned automatically as a subprocess — you don't run it separately.

---

## 6 · Available Agent Tools

| Tool | Description |
|------|-------------|
| `list_jobs` | List all job openings |
| `get_job(job_id)` | Get details of a specific job |
| `create_job(...)` | Create a new job opening |
| `archive_job(job_id)` | Mark a job as Cancelled |
| `list_all_candidates()` | List all candidates in the account |
| `get_candidates(job_id)` | List candidates linked to a job in the pipeline |
| `get_candidate(candidate_id)` | Get full details of a candidate |
| `update_candidate_status(...)` | Move a candidate to a new pipeline stage |

### Example prompts

```
What jobs do we have open?
Show me all candidates and their stages
Create a new Backend Engineer role in Bangalore
Move candidate 213694... to Interview Scheduled
Archive the test job
```

---

## 7 · API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Chat UI |
| `GET`  | `/health` | Health check |
| `POST` | `/chat` | Synchronous chat (full response) |
| `POST` | `/chat/stream` | SSE streaming chat |

### Streaming request format

```json
POST /chat/stream
{
  "messages": [
    {"role": "user", "content": "List all open jobs"}
  ],
  "session_id": "optional-session-id"
}
```

SSE events emitted:

```
data: {"type": "text",        "content": "..."}
data: {"type": "tool_call",   "name": "list_jobs", "input": {}}
data: {"type": "tool_result", "name": "list_jobs", "content": "..."}
data: {"type": "done",        "message": "..."}
data: {"type": "error",       "message": "..."}
```

---

## 8 · Troubleshooting

| Error | Fix |
|-------|-----|
| `INVALID_TOKEN` | Refresh token expired — regenerate via Steps 2-3 above |
| `invalid_client` | Wrong Zoho region — check `ZOHO_REGION` in `.env` |
| `model not found` | Set `CLAUDE_MODEL` in `.env` to a valid model ID |
| `Could not reach backend` | Open http://localhost:8000 instead of the file directly |
| `get_candidates` returns empty | Candidates may not be formally linked to the job in Zoho's pipeline — use `list_all_candidates` instead |
