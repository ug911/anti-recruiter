# How Talendy Works — A Complete Guide
**Talendy | Detailed System Documentation | March 2026**

---

## Table of Contents

1. What Is Talendy?
2. Who Is It For?
3. The Big Picture — How Everything Connects
4. The Four Parts of Talendy
5. How a Typical Interaction Works (Step by Step)
6. What Talendy Can Do Today
7. How Client Data Stays Private (Multi-Tenancy)
8. What's Coming Next
9. How Talendy Assistant Fits Into the Talendy Ecosystem
10. Glossary of Terms

---

## 1. What Is Talendy?

Talendy is an **AI-powered hiring assistant** that lives inside the user's web browser. It appears as a small chat widget on any webpage — whether the user is browsing LinkedIn, reviewing a candidate's portfolio, or simply reading emails. The user can type natural language requests like *"Show me all open jobs in Singapore"* or *"Create a new Software Engineer role in Dubai"*, and Talendy takes care of the rest.

Under the hood, Talendy connects to a full-featured recruitment management system. But the user never sees or interacts with that system directly. From the client's perspective, Talendy **is** the product — a smart assistant that understands hiring and can take action instantly.

Think of it like this: Talendy is to recruitment what a virtual banking assistant is to banking. The user talks to the assistant, and the assistant handles all the complex operations behind the scenes.

---

## 2. Who Is It For?

Talendy is primarily built for **GCC (Global Capability Center) clients** — companies and enterprises who use Talendy's recruitment services. There are two main types of users:

**Recruiters and Hiring Managers** — These are the day-to-day users. They use the Chrome Extension to:
- Post new job openings
- Search for and review candidates
- Move candidates through the hiring pipeline
- Schedule interviews and add notes
- Upload and manage resumes

**Managers and Executives** — These users primarily use the Hub Portal (a web dashboard) to:
- View a summary of all active job openings
- Track candidate pipelines across the organization
- Review analytics and hiring metrics
- Monitor the status of submissions to clients

---

## 3. The Big Picture — How Everything Connects

Talendy is made up of four main parts that work together like a chain:

**Part 1: The Chrome Extension** → This is what the user sees. It's a chat window that appears in the browser corner. The user types a message here.

**Part 2: The Agent Backend** → This is the "brain." It receives the user's message, thinks about what to do, and decides which actions to take. It uses an advanced AI model (Claude, by Anthropic) to understand what the user wants.

**Part 3: The Tool Server** → This is the "hands." When the brain decides it needs to take an action (like listing jobs or creating a candidate), it sends the instruction here. The tool server knows how to talk to the recruitment system and execute the action.

**Part 4: The Recruitment System** → This is where all the actual data lives — jobs, candidates, interviews, clients, notes, attachments. It's a professional-grade Applicant Tracking System (Zoho Recruit), but the user never sees it or knows it exists. To them, everything is "Talendy."

Additionally, there's a **Hub Portal** — a traditional web dashboard that shows real-time data to managers who prefer a visual overview rather than a chat interface.

---

## 4. The Four Parts of Talendy (In Detail)

### 4.1 The Chrome Extension (What the User Sees)

The Chrome Extension is a lightweight add-on that installs in the user's Google Chrome browser. Once installed, it adds a small Talendy icon to every webpage the user visits.

When the user clicks this icon, a chat window opens. Here's what makes it special:

- **It reads the page context.** If the user is on a LinkedIn job posting, Talendy can see the job title, description, and company name. It can then offer to create that exact job in the system with one click.
- **It remembers conversations.** The extension keeps a history of past interactions so the user can pick up where they left off.
- **It works everywhere.** Unlike traditional recruitment software that requires the user to log into a specific website, Talendy works on any webpage — LinkedIn, Indeed, company career pages, even Gmail.

The extension communicates with the backend by sending the user's message along with any relevant information from the current webpage.

### 4.2 The Agent Backend (The Brain)

The Agent Backend is the central intelligence of the system. When it receives a message from the extension, it goes through the following process:

1. **Understanding the request.** The AI reads the user's message and figures out what they want. For example, if the user says *"Find me Python developers in Dubai"*, the AI understands this means: search for candidates with "Python" in their skills and "Dubai" as their location.

2. **Deciding on actions.** The AI determines which tools it needs to use. In this case, it would decide to use the "search candidates" tool with the right search terms.

3. **Executing the actions.** It sends the instructions to the Tool Server, waits for the results, and then reads them.

4. **Formulating a response.** The AI takes the raw data from the recruitment system and turns it into a clean, readable summary for the user. Instead of showing a raw database record, it presents something like: *"I found 5 Python developers in Dubai. Here are the top 3..."*

5. **Continuing the conversation.** If additional actions are needed (for example, the user then says *"Associate the first one with the Cloud Engineer role"*), the AI maintains context and executes the follow-up without needing the user to repeat themselves.

This entire process — from receiving the user's message to sending back a formatted response — typically takes 3 to 8 seconds, depending on the complexity of the request.

The AI is also governed by a **persona** — it always speaks as "Talendy," never reveals the underlying systems, and maintains a professional yet approachable tone. It is specifically trained to avoid mentioning technical backend details or third-party system names to the user.

### 4.3 The Tool Server (The Hands)

The Tool Server is the bridge between the AI brain and the recruitment system. It exposes a set of **tools** — specific actions that the AI can invoke. Each tool does one thing well.

For example:
- The "list_jobs" tool retrieves all job openings.
- The "create_candidate" tool creates a new candidate record.
- The "upload_attachment" tool uploads a resume or document.

The Tool Server handles all the complexity of talking to the recruitment system — authentication, data formatting, error handling, retries. The AI just says what it wants done, and the Tool Server takes care of how.

Currently, there are **23 tools** available (detailed in Section 6).

### 4.4 The Hub Portal (The Dashboard)

The Hub Portal is a traditional web application — a website that users can log into with a username and password. It serves as the **visual dashboard** for Talendy.

While the Chrome Extension is optimized for quick, conversational interactions (ask a question, get an answer, take an action), the Hub Portal is optimized for **overview and analytics** — seeing the full picture at a glance.

The Hub Portal shows:
- All active job openings in a table format
- Candidate pipelines with drag-and-drop stages
- Interview schedules and calendars
- Client-specific views (for multi-tenant operations)
- Historical data and reporting

The Hub Portal reads from the same database that the Chrome Extension writes to. This means that if a recruiter creates a job through the chat extension, it appears instantly on the Hub Portal for a manager reviewing the dashboard.

---

## 5. How a Typical Interaction Works (Step by Step)

Let's walk through a real example. A recruiter named Sara is on LinkedIn and sees a great job description for a "Senior Data Engineer" role that her client needs to fill.

**Step 1 — Sara clicks the Talendy icon** on the LinkedIn page. The chat window opens.

**Step 2 — Talendy reads the LinkedIn page** and proactively offers: *"I can see you're viewing a Senior Data Engineer role. Want me to create this job in Talendy?"*

**Step 3 — Sara types: "Yes, create it for Acme Corp, location Dubai, deadline April 30."**

**Step 4 — The AI brain processes the request.** It understands Sara wants to create a job with the title from the LinkedIn page, assigned to client "Acme Corp," located in "Dubai," with a target date of "2026-04-30."

**Step 5 — The brain invokes the "create_job" tool** through the Tool Server, passing all the details.

**Step 6 — The Tool Server sends the request** to the recruitment system, which creates the job record and returns a confirmation with the new job's ID.

**Step 7 — The AI formats this into a friendly response:** *"Done! I've created the Senior Data Engineer position for Acme Corp in Dubai with a deadline of April 30th. Would you like me to search for matching candidates?"*

**Step 8 — Sara says: "Yes, find candidates with Spark and AWS experience."**

**Step 9 — The AI invokes the "search_candidates" tool** with search terms "Spark" and "AWS."

**Step 10 — Results come back**, and the AI presents them as a clean list: names, current titles, key skills, and years of experience.

**Step 11 — Sara says: "Associate the first two with this job."**

**Step 12 — The AI invokes the "associate_candidate" tool** twice, linking both candidates to the newly created job opening.

**Step 13 — Talendy confirms:** *"Both candidates have been added to the Senior Data Engineer pipeline. You can view them in the Hub Portal or ask me for updates anytime."*

This entire interaction took about 45 seconds.

---

## 6. What Talendy Can Do Today

Talendy currently supports **23 distinct actions** across six categories:

### Job Management (5 actions)
- **List all jobs** — See every open position in the system.
- **View job details** — Get the full description, requirements, salary, and status of a specific job.
- **Create a new job** — Set up a new job opening with title, location, description, and deadline.
- **Search for jobs** — Find jobs by keyword, location, or any other criteria.
- **Archive a job** — Close out a job opening that is no longer active.

### Candidate Management (5 actions)
- **Create a candidate** — Add a new person to the talent pool with their name, email, skills, and experience.
- **Search for candidates** — Find candidates by skill, email, or any search term.
- **View candidate details** — Get the full profile of a specific candidate.
- **List all candidates** — Browse the entire talent pool (with pagination for large lists).
- **Import a resume** — Upload a resume file and automatically parse it to create a candidate record.

### Hiring Pipeline (3 actions)
- **Associate a candidate with a job** — Link a candidate to a job opening's hiring pipeline.
- **View candidates for a job** — See all candidates currently in a specific job's pipeline.
- **Update candidate status** — Move a candidate through pipeline stages (e.g., "Screening" → "Interview Scheduled" → "Offer Extended" → "Hired").

### Client and Contact Management (3 actions)
- **List clients** — View all client organizations in the system.
- **View client details** — Get full information about a specific client.
- **List contacts** — See contact people associated with client organizations.

### Engagement and Communication (4 actions)
- **Add a note** — Attach an internal note to any candidate or job record.
- **List notes** — View all notes on a specific record.
- **List interviews** — See all scheduled interviews across the organization.
- **View interview details** — Get full information about a specific interview (including interviewers, timing, and location).

### Document Management (3 actions)
- **List attachments** — See all files (resumes, cover letters, etc.) attached to a record.
- **View attachment categories** — See the available categories for organizing documents.
- **Upload an attachment** — Upload a file and attach it to a candidate or job record.

---

## 7. How Client Data Stays Private (Multi-Tenancy)

When multiple GCC clients use Talendy, it's critical that each client can only see their own data. Client A should never see Client B's candidates, jobs, or notes. This is called **multi-tenancy** — multiple tenants (clients) sharing the same system while remaining completely isolated from each other.

Here is how this will work:

### The Mapping System

When a client user logs into Talendy (through the Hub Portal), the system knows who they are and which organization they belong to. This information is stored in a **mapping table** that connects two things:

1. **The user's login identity** — who they are in the Talendy system.
2. **The client record in the recruitment system** — which client organization they belong to.

For example:
- Sara logs in → The system knows she belongs to "Acme Corp" → Her client ID is "ACME-001."
- Ahmed logs in → The system knows he belongs to "Gulf Industries" → His client ID is "GULF-002."

### Automatic Data Filtering

Once the system knows a user's client ID, every single action they take is automatically filtered:

- When Sara asks "Show me all jobs," Talendy only returns jobs that belong to Acme Corp.
- When Ahmed asks "List all candidates," he only sees candidates associated with Gulf Industries.
- When Sara creates a new job, it's automatically tagged to Acme Corp.

This filtering happens at the deepest level — inside every tool call. The user doesn't need to specify their client. The system does it automatically, every time, for every action.

### What Happens If Something Goes Wrong?

The system is designed with a **fail-secure** approach. If, for any reason, the client mapping cannot be determined (e.g., a user is not properly linked to a client), the system will **deny access entirely** rather than showing data from another client. This ensures that data leakage is impossible, even in edge cases.

---

## 8. What's Coming Next

### Submissions Tracking
The ability to formally submit a candidate to a client or hiring manager, track the submission status (e.g., "Internal Review," "Submitted to Client," "Client Approved"), and get real-time updates.

### Assessment Integration
View results from pre-screening tests and technical assessments directly within the chat. No need to log into a separate assessment platform.

### Interview Feedback Collection
Fetch and display interview feedback from hiring managers, allowing recruiters to quickly see how each candidate performed without chasing down reviewers for updates.

### Smart Tagging
Label candidates and jobs with custom tags (e.g., "High Priority," "Niche Skill," "Urgent Hire") for faster filtering and better organization.

### Organization Awareness
Talendy will understand the organization structure — who the recruiters are, who the managers are, who handles which client — and use this information to provide more personalized responses.

### Safety and Guardrails
Before performing any high-risk action (like bulk archiving jobs or deleting records), Talendy will ask for explicit user confirmation. It will also automatically detect and mask sensitive personal information (like passport numbers or bank details) to prevent accidental data exposure.

---

## 9. How Talendy Assistant Fits Into the Talendy Ecosystem

Talendy is not a standalone product — it's a key component of the broader Talendy platform. Here's how the pieces fit together:

### The Client's View

GCC clients interact with two Talendy-branded surfaces:

1. **The Chrome Extension** — For daily hiring operations. Recruiters and hiring managers use this throughout their workday to take quick actions, search for candidates, create jobs, and manage pipelines. It meets them where they already work (inside their browser) rather than forcing them to switch to a separate application.

2. **The Hub Portal** — For oversight and reporting. Managers and executives use this web dashboard to see the full picture — how many jobs are open, where candidates are in the pipeline, what's on schedule, and how hiring is trending over time. This data refreshes in real-time, so the dashboard always reflects the latest state.

### The Invisible Backend

Behind both of these client-facing surfaces, a professional-grade Applicant Tracking System (ATS) handles all the data storage and recruitment logic. This system is never exposed to the client. They don't log into it, they don't see its interface, and they don't know its name.

This architecture provides two major advantages:

1. **Simplified client experience.** The client never has to learn a complex enterprise ATS. They just talk to Talendy or look at the Hub Portal.

2. **Enterprise-grade reliability.** The underlying ATS is a mature, battle-tested platform used by thousands of companies worldwide. Talendy gets the benefit of its robust data handling, compliance features, and scalability — without passing that complexity to the user.

### Real-Time Data Synchronization

Any action taken through the Chrome Extension is immediately reflected on the Hub Portal, and vice versa. If a recruiter creates a job through the chat at 9:00 AM, a manager opening the Hub Portal at 9:01 AM will see that job listed. There is no delay, no batch processing, no "sync overnight."

This real-time synchronization is critical for GCC clients who operate across multiple time zones and need all team members to work from the same source of truth.

### Summary of the Ecosystem

| What the Client Sees | What It Does | Who Uses It |
|---|---|---|
| Chrome Extension (Chat) | Day-to-day hiring actions via conversation | Recruiters, Hiring Managers |
| Hub Portal (Dashboard) | Overview, analytics, pipeline tracking | Managers, Executives, Clients |

| What Runs Behind the Scenes | What It Does | Client Visibility |
|---|---|---|
| AI Agent (The Brain) | Understands requests and decides actions | Hidden |
| Tool Server (The Hands) | Executes recruitment actions | Hidden |
| Recruitment System (The Data) | Stores all jobs, candidates, and history | Hidden |
| Hub Database | Manages login, sessions, and synced data | Hidden |

---

## 10. Glossary of Terms

| Term | What It Means |
|---|---|
| **Agent** | The AI assistant — the conversational brain that understands what the user wants and takes action |
| **ATS** | Applicant Tracking System — software used to manage the recruitment process |
| **Chrome Extension** | A small add-on for the Google Chrome browser that adds new features to every webpage |
| **GCC** | Global Capability Center — offshore technology and operations centers set up by multinational companies |
| **Hub Portal** | The web-based dashboard where managers can see an overview of all hiring activity |
| **Multi-Tenancy** | The ability for multiple client organizations to use the same system while keeping their data completely separate |
| **MCP (Tool Server)** | The component that translates the AI's decisions into actual actions in the recruitment system |
| **Pipeline** | The sequence of stages a candidate goes through during the hiring process (e.g., Applied → Screened → Interviewed → Offered → Hired) |
| **Submission** | The act of formally presenting a candidate to a client or hiring manager for review |
| **Persona** | The AI assistant's personality and communication style — Talendy always speaks in a friendly, professional, branded voice |

---

*Prepared by Nitai Agarwal — Consultant, Talendy*
