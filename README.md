# Anti-Recruiter 🚀

**Anti-Recruiter** is a powerful automation tool designed to streamline the recruitment process by integrating directly with Zoho Recruit. It provides a modern interface to manage job postings, candidates, and portal configurations, helping recruitment teams automate repetitive tasks and focus on hiring.

---

## 🏗️ Project Structure

The repository is organized into two main parts:

- **`backend/`**: A Python application built with **FastAPI** and **SQLModel**.
  - `app/main.py`: The entry point for the API.
  - `app/routers/`: API endpoints for jobs and authentication.
  - `app/services/`: Core business logic, including Zoho Recruit integration (`zoho_jobs.py`) and portal management.
  - `app/models/`: Database models and Pydantic schemas.
- **`frontend/`**: A modern web dashboard built with **React**, **TypeScript**, and **Vite**.
  - `src/pages/`: Primary views including Dashboard, Job Details, and the Job Creation wizard.
  - `src/components/`: Reusable UI components.
  - `src/api/`: Frontend services for interacting with the backend API.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **Integration**: Zoho Recruit API
- **Automation**: Playwright (for portal management)

### Frontend
- **Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Framer Motion (animations)

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites
- Python 3.9+
- Node.js 18+ & npm

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## 💡 How to Use

1. **Login**: Use the admin credentials to access the dashboard.
2. **Dashboard**: View an overview of active job postings synchronized from Zoho.
3. **Internal Job Creation**: Use the "Create Job" wizard to define roles and automatically push them to Zoho Recruit and relevant portals.
4. **Candidate Tracking**: View candidates associated with specific job postings directly within the dashboard.
5. **Portal Management**: Configure and manage recruitment portals via the integrated services.

---

## 🔑 Environment Variables

*(Note: Create a `.env` file in the `backend/` directory if needed for these keys)*

- `ZOHO_CLIENT_ID`: Your Zoho Recruit client ID.
- `ZOHO_CLIENT_SECRET`: Your Zoho Recruit client secret.
- `DATABASE_URL`: Connection string for the database (defaults to `sqlite:///database.db`).
