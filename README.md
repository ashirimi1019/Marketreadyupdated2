# MarketReady

MarketReady is an AI-driven, proof-first career readiness platform for students. It combines live labor market signals (GitHub, Adzuna, O*NET), AI-powered planning, and a robust evidence framework to answer the question: "**Am I actually hireable?**"

---

## 🚀 Project Overview

- **Purpose:** Help students and job-seekers assess and maximize hireability based on real-world demand.
- **Approach:** Combines (1) self-reported and verifiable proofs; (2) live AI/market signals; and (3) a transparent scoring mechanism called "**Market-Ready Index (MRI)**".
- **User Base:** Computer science students, entry-level engineers, career coaches/advisors.

---

## 🏗️ Architecture

```
/app/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # All API endpoints, including core, AI, market, proofs, simulator, etc.
│   │   ├── core/config.py     # Environment config, secrets, feature flags
│   │   ├── core/database.py   # SQLAlchemy + engine setup
│   │   ├── models/entities.py # Database models (ChecklistItem, Proof, UserPathway, etc)
│   │   ├── services/          # Business logic (AI, market, storage, scoring, etc.)
│   │   ├── alembic/versions/  # DB migrations
│   │   └── main.py            # FastAPI app + router registration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js app routes (pages)
│   │   ├── components/        # Shared React components
│   │   └── lib/               # API utils, session, error handling
│   ├── package.json
│   └── ... (build/tools)
├── devops/
│   ├── docker-compose.yml
│   ├── apprunner.yaml         # AWS App Runner backend
│   ├── apprunner-frontend.yaml
│   └── render.yaml            # Render.com deploy config
├── memory/
│   └── PRD.md                 # Product/feature history
└── docs/                      # Deployment docs for AWS, Netlify, Render, etc.

```

---

## 🧑‍💻 Tech Stack and Core Services

### Backend

- **Language:** Python 3.11+ (main backend logic)
- **Framework:** FastAPI (typed, ultra-fast REST API, async native)
- **Key Libraries:** SQLAlchemy ORM (DB), Pydantic (validation), Alembic (migrations), httpx (HTTP/async requests), boto3 (S3/storage), pytest (tests)
- **Containerization:** Docker (Python 3.12-slim is the base image)
- **Environment Management:** .env files, secrets injected via App Runner/Render or directly
- **Authentication:** JWT-based (X-Auth-Token header)
- **AI Integration:** OpenAI API (LLM provider), Groq (optional), AI skill verification, resume scoring
- **External APIs:** 
  - Adzuna (labor market pulse, job postings)
  - CareerOneStop & O*NET (federal skills/role mapping)
  - GitHub API (public profile & repo audit, skill signals)

### Frontend

- **Language:** TypeScript (100% typed)
- **Framework:** Next.js 14 (App Router mode for better SSR/Suspense)
- **UI:** React 19, Tailwind CSS v4 (with shadcn/ui)
- **Session Management:** JWT token in localStorage, API utilities
- **Key Features:**
  - MRI scoring UI (federal, demand, proof)
  - Role readiness checklist & proficiency matrix
  - Resume and GitHub auditor
  - AI-powered feedback and plan generation

### Database

- **Type:** PostgreSQL (strictly, no MongoDB—see note!)
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Sample setup:** Amazon RDS or Neon.tech free tier (quickstart for dev)

### DevOps/CI

- **Container orchestration:** 
  - Docker Compose (for local dev: Postgres, backend, frontend)
  - Dockerfiles for both backend and frontend (see `/backend/Dockerfile` and frontend build)
- **Automated Deploy:** AWS App Runner (primary), Render.com (via `render.yaml`)
- **Storage:** S3 compatible bucket (for proof uploads).
- **Backup/ops scripts:** PowerShell (`db_backup.ps1`, `deploy_check.ps1`)

---

## 🛠️ How It Works: Major Services & Endpoints

### 1. MRI (Market-Ready Index) Engine

- Combines:
  - **Federal standards (O*NET checklists per role)**
  - **Live market demand (skills scored by frequency in real job postings)**
  - **Evidence density (quantity & verification of submitted proofs, GitHub signals, certs)**
- MRI output: overall score, gap analysis, and recommendations.
- API: `/api/score/mri` with detailed breakdown (see backend/app/api/routes/mri.py).

### 2. Proof/Credential System

- Users submit proofs for each checklist item (repo, cert, deployment, lab report, etc.)
- File uploads backed by S3 or local disk (see `/user/proofs/upload`, `/user/proofs`)
- AI-driven verification for certificates (AI-verified proofs get bonus in MRI).

### 3. AI Services

- **Resume & profile scoring** (LLM-based, with specific banding: Highly Hireable, Competitive, Needs Improvement, Underqualified).
- **AI Guidance:** Students can ask for personalized step plans, generate 90-day growth plans, get emotional reset advice, etc.
- **AI Interview Simulator:** Practice with mock interviews, get feedback, and record sessions.

### 4. Market Intelligence

- **Job market scan:** Live queries to Adzuna & O*NET to count current role demand.
- **Engineering Signal:** GitHub profile & repo audit to measure project count, recency, stars, language diversity, and README quality.
- **Skill trend/alerts:** Notifies if market demand shifts for your tracked roles.

### 5. Future-Shock Simulator

- Simulates skill resilience/obsolescence as AI "acceleration" increases.
- Adjusts scores and gives pivot recommendations based on market trajectory.

---

## ⚙️ Tech Stack Deep Dive

- **Python (backend domain logic, all APIs, AI computation)**
- **TypeScript (frontend & Next.js app)**
- **Tailwind CSS (modern styling, theming, responsive UI)**
- **Docker (containers for backend/frontend/DB, required for consistent deploy)**
- **PowerShell (Windows-friendly scripting for backups and deploy validation)**
- **PostgreSQL (all structured user/proof data)**
- **OpenAI and Groq (pluggable LLM providers)**
- **boto3 / S3 (file and proof storage backend)**
- **AWS App Runner / Render / Netlify (one-click cloud deploy configs)**

---

## 🔐 Secrets & Environment Variables

Critical environment variables you MUST set (usually via cloud console):

- `DATABASE_URL` (PostgreSQL, e.g. `postgresql+psycopg2://user:pass@host/db`)
- `AUTH_SECRET`, `ADMIN_TOKEN` (random secure strings)
- `CORS_ORIGINS` (your frontend and backend domains, comma-separated)
- `AI_ENABLED` (set to `true` to enable AI features)
- `LLM_PROVIDER`, `OPENAI_API_KEY` (if using AI)
- `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_REGION` (for file uploads)
- External API keys for Adzuna, O*NET, CareerOneStop, etc.

See `/backend/app/core/config.py` for complete reference.

---

## 🚦 Deployment & Cloud Integration

### Local/Dev (Docker Compose)

- Clone repo
- Set up `.env` files in backend, frontend, and at root
- Run `docker-compose up --build`
- Visit frontend at http://localhost:3000/

### AWS App Runner (Recommended)

- Build and push Docker images, or connect repo for auto-deploy on push (see `DEPLOY_AWS_APPRUNNER.md`)
- Backend and frontend are deployed as independent App Runner services (see `apprunner.yaml`, `apprunner-frontend.yaml`)
- Use AWS RDS for Postgres (see `/market-pathways/docker-compose.yml` for dev DB reference)
- All critical env vars configured via App Runner console

### Render.com

- Used for teams without AWS
- `render.yaml` fully specifies service stack (backend, frontend, Postgres)

### Netlify (optional frontend)

- Netlify can build and deploy the frontend alone if you prefer static hosting

### PowerShell Scripts (Windows DevOps)

- `scripts/db_backup.ps1`: Export current database for backup
- `scripts/deploy_check.ps1`: Quick backend health/tests pre-deployment

---

## 💡 Example Usage

- Register/login on the frontend.
- Select your career pathway and see all required skills/checklists.
- Upload proof artifacts (links, files, certs) for checklist items.
- Watch your MRI and proficiency bands update in real time.
- Test your profile and resume for market demand and AI feedback.
- Simulate skill value shifts using the Future-Shock simulator.
- Get market-aligned action plans for fast improvement.

---

## 📃 Documentation & References

- [Product Requirements](memory/PRD.md)
- [AWS/Render/Netlify Deployment](DEPLOY_AWS_APPRUNNER.md, DEPLOY_AWS.md, DEPLOY_RENDER.md, DEPLOY_AWS_BACKEND_NETLIFY.md)
- [Postgres Docker Setup](market-pathways/docker-compose.yml)
- [AI API/Proof/Market Signal Endpoints](see `backend/app/api/routes/` collection)
- [Tech Stack and Certification Advice](backend/app/services/ai.py, backend/app/services/market_connectors.py)

---

## ⚠️ Important Notes

- **PostgreSQL Only:** The backend is designed for SQL DBs, with full production support for AWS RDS/Postgres, Render Postgres, and Neon. MongoDB is NOT supported.
- **No secrets should appear in git!** Always supply secrets/keys via environment variables or your cloud provider’s secrets dashboard.
- **Incomplete Proofs:** Frontend and backend expect file and URL-based proofs for checklist items—mark items or explain gaps explicitly.

---

## 👨‍👩‍👦 Contributors / Attribution

- Project owner: [ashirimi1019](https://github.com/ashirimi1019)

---

## 🤖 FAQ / Q&A

**Q: Why FastAPI and Next.js?**  
A: Ultra-fast, typed APIs and flexible SSR React UI.

**Q: Where is the full MRI/scoring formula?**  
A: See `/api/score/mri` endpoint and `/backend/app/api/routes/mri.py` source for the full scoring breakdown.

**Q: How do I debug deployment issues?**  
A: Check cloud build logs, confirm DB access from App Runner/Render, and review health endpoints (`/meta/health`).

---

## 🔗 Related Links

- [View all code in GitHub repo](https://github.com/ashirimi1019/Marketreadyupdated2)
- [View OpenAI deployment docs](https://platform.openai.com/docs/)
- [Read more about FastAPI](https://fastapi.tiangolo.com/)
- [Learn about Next.js 14](https://nextjs.org/)
