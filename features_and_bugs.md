# Features & Bugs Tracker (Updated 2026-03-25)

This document tracks the ongoing development, architectural improvements, and bug fixes for the Anti-Recruiter project.

## 🚀 Planned Features & Improvements

### 1. Frontend Cleanup
- **Goal**: Remove frontend bloat and strictly maintain the extension code.
- **Status**: [ ] Pending

### 2. Backend API Refactoring
- **Goal**: Properly "marry" Backend APIs (Zoho + MCP + Agent Backend) in a more structured and modular way.
- **Status**: [ ] Pending

### 3. Persistent Memory & Session Management
- **Goal**: Add robust persistence and session management to the extension using the existing Tech-Japan backend.
- **Implementation Note**: Likely requires a new database table or extending the existing message schema.
- **Status**: [ ] Partially Implemented (Basic message saving exists in `db.py`)

### 4. Client-Based Isolation (Multi-tenancy)
- **Goal**: Marry Auth and Zoho Client ID to ensure isolation. A client should only be able to fetch their own data.
- **Status**: [ ] Pending

### 5. Agent Persona Refinement
- **Goal**: Solidify the "Talendy" branding. Ensure the agent has a consistent tone, expertise level, and handles specific edge cases (e.g. unknown queries) with a unique brand voice.
- **Status**: [ ] Partially Implemented (Basic persona exists in `agent.py`)

### 6. Agent Guardrails & Safety
- **Goal**: Implement robust guardrails to prevent hallucination, enforce data privacy (no sensitive info leakage), and restrict the agent from performing unauthorized or high-risk bulk actions without confirmation.
- **Status**: [ ] Pending

## 🛠️ MCP Toolset Audit (Status: 2026-03-25)

### Currently Implemented Tools (23)
- **Jobs**: `list_jobs`, `get_job`, `create_job`, `search_jobs`, `archive_job`
- **Candidates**: `create_candidate`, `search_candidates`, `get_candidate`, `list_all_candidates`, `import_resume`
- **Pipeline**: `associate_candidate`, `get_candidates` (by job), `update_candidate_status`
- **Clients & Contacts**: `list_clients`, `get_client`, `list_contacts`
- **Engagement**: `add_note`, `list_notes`, `list_interviews`, `get_interview`
- **Documents**: `list_attachments`, `list_attachment_categories`, `upload_attachment`

### 🔜 Potential New Tools (Based on Zoho API v2)
- **Submissions**:
  - `create_submission`: Formally submit a candidate to a client/hiring manager.
  - `list_submissions`: Track candidate-job submissions in real-time.
  - `update_submission_status`: Change submission status (e.g., 'Internal Review', 'Submitted to Client').
- **Assessments**:
  - `list_assessments`: Retrieve candidate pre-screening and technical test results.
- **Reviews & Feedback**:
  - `list_reviews`: Fetch interview feedback and candidate reviews from hiring managers.
- **Record Management**:
  - `add_tag`: Label records (e.g., 'High-Priority', 'Niche-Skill') for better filtering.
  - `list_tags`: Fetch records based on specific tags.
- **Administrative**:
  - `get_org_details`: Retrieve company context for better agent personalization.
  - `list_users`: Find and coordinate with other recruiters or managers in the org.

## 🐛 Bug Fixes
- None currently reported.

## 📝 Change Log

### [2026-03-25]
- **Planned Features**: Added Agent Persona and Guardrails to the roadmap.
- **MCP Audit**: Added full list of 23 existing tools and identified 10+ potential new tools from Zoho API v2.
- **Initialized Tracker**: Created `features_and_bugs.md` to track technical debt and future features.
- **Git Branching**: Created and pushed new branches with `_na` suffix for both `hub` and `anti-recruiter`.
- **Development Skill**: Created `.gemini/skills/dev_setup/SKILL.md` with full instructions for running the environment.

### [2026-03-24]
- **Hub Infrastructure**: Restored and started `docker-compose.yml` with MySQL (3307), Redis, Elasticsearch, and Localstack.
- **Localstack Fix**: Added `LOCALSTACK_ACKNOWLEDGE_ACCOUNT_REQUIREMENT=1` to resolve license prompt.
- **Agent Backend**: Configured DB connection to use port 3307 and verified health/history endpoints.
- **Database Migration**: Created `agent_chat_messages` table in the shared database.
- **Hub Frontend**: Successfully launched the Next.js 12 frontend in a Node 18 Docker container to resolve local Node v25 incompatibility.
