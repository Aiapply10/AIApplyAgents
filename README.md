# AI Apply Agents

Multi-tenant job auto-apply platform with AI-powered resume building and tailoring. Three core services: **Control Service** (orchestration, APIs, UI), **Job Fetcher** (scraping/APIs), and **Job Applier** (browser automation).

## Documentation

- **[docs/README.md](docs/README.md)** — Index of architecture docs and planning prompts.
- **[docs/data-model-mongodb.md](docs/data-model-mongodb.md)** — **MongoDB collections, models, enums, and indexes** (Control Service).
- **[docs/architecture.md](docs/architecture.md)** — System-wide architecture (control vs execution plane, Mermaid diagrams).
- **[docs/architecture-control-service.md](docs/architecture-control-service.md)** — Control Service routers, auth, storage.
- **[docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md)** — Multi-agent build plan and agent topology.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Tailwind](https://tailwindcss.com/) + [Vite](https://vitejs.dev/) | Frontend |
| [FastAPI](https://fastapi.tiangolo.com/) + [Pydantic](https://docs.pydantic.dev/) | Backend APIs |
| [MongoDB](https://www.mongodb.com/) | Database |
| [SuperTokens](https://supertokens.com/) | Authentication (email/password + Google OAuth) |
| [Anthropic Claude](https://docs.anthropic.com/) | AI resume extraction and tailoring |
| [Turborepo](https://turbo.build/) + [Bun](https://bun.sh/) | Monorepo orchestration |
| [uv](https://docs.astral.sh/uv/) | Python package management |

## Project Structure

```
├── apps/
│   ├── client/              # React frontend (port 5173)
│   └── server/              # Control Service API (port 8000)
├── packages/
│   ├── jobs_scraper/        # Job Fetcher service (port 8001)
│   └── jobs_applier/        # Job Applier service (port 8002)
├── docker-compose.yml       # MongoDB + SuperTokens + PostgreSQL
├── package.json             # Bun workspaces
├── pyproject.toml           # uv workspace
└── uv.lock
```

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3.x
- [uv](https://docs.astral.sh/uv/install/)
- Python 3.12+
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose (for MongoDB and SuperTokens)

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **MongoDB** on `localhost:27017`
- **SuperTokens Core** on `localhost:3567` (backed by PostgreSQL)
- **PostgreSQL** on `localhost:5432` (for SuperTokens)

### 2. Install dependencies

```bash
# Node dependencies
bun install

# Python dependencies (all packages)
uv sync --all-packages
```

### 3. Configure environment

Copy example env files and configure:

```bash
# Server
cp apps/server/.env.example apps/server/.env.local

# Client
cp apps/client/.env.example apps/client/.env.local
```

Edit `apps/server/.env.local`:

```env
ENVIRONMENT=development
MONGODB_URI=mongodb://localhost:27017
DB_NAME=ai_apply_agents

# SuperTokens (runs from docker compose)
SUPERTOKENS_CONNECTION_URI=http://localhost:3567

# Domains
API_DOMAIN=http://localhost:8000
WEBSITE_DOMAIN=http://localhost:5173

# Google OAuth (optional — get from Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI features — get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# Admin bootstrap — set to your email to get admin access on startup
ADMIN_EMAIL=you@example.com
```

### 4. Start development

```bash
# All services (client + server + scraper + applier)
bun run dev

# Or individual services
bun run dev --filter=@repo/client    # Frontend only
bun run dev --filter=@repo/server    # Backend only
```

### 5. Open the app

- **Frontend**: http://localhost:5173
- **API docs**: http://localhost:8000/docs
- **SuperTokens dashboard**: http://localhost:3567/dashboard

## Features

### For Users (Members)

- **Auth**: Email/password signup + Google OAuth
- **Profile**: Onboarding flow, profile editor with completeness tracking
- **Resume Builder**: 12 section types (Header, Summary, Skills, Experience, Projects, Education, Certifications, Achievements, Open Source, Leadership, Publications, Additional)
- **Resume Upload**: Upload PDF/DOCX, AI extracts and structures content into the editor
- **AI Builder**: Generate resume from ChatGPT/Claude markdown output
- **Resume Analyzer**: 8-category scoring (100-point scale) with issues, suggestions, keyword analysis
- **Master Profile**: Single source of truth for all career data across resumes
- **AI Resume Tailoring**: Generate role-targeted resumes from master profile + job description

### For Admins

- **RBAC**: Three roles (admin, manager, member) with backend enforcement
- **Admin Dashboard**: System overview with user counts, role distribution, recent signups
- **User Management**: Search, filter, edit roles, toggle active, delete
- **Tenant Management**: CRUD tenants with plan/settings
- **Audit Log**: Filterable activity trail with expandable detail
- **Notifications**: Send and manage system notifications

## Architecture

### Service Boundaries

| Service | Responsibility |
|---------|---------------|
| **Control Service** (`apps/server`) | Users, profiles, resumes, workflows, orchestration |
| **Job Fetcher** (`packages/jobs_scraper`) | Board adapters, fetch execution, normalization |
| **Job Applier** (`packages/jobs_applier`) | Browser automation, form filling |

### Key Design Decisions

- All models are **tenant-scoped** for multi-tenancy
- **Pydantic** schemas for type-safe request/response on backend
- **TypeScript strict** mode on frontend
- Designed for **resumability and idempotency**
- Route-based **color theming** (each section has its own accent color)

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all services in dev mode |
| `bun run dev:reset` | Kill ports 8000-8002 + start dev |
| `bun run build` | Build all workspaces |
| `bun run lint` | Lint all workspaces |
| `bun run clean` | Clean build artifacts |
| `docker compose up -d` | Start MongoDB + SuperTokens |
| `docker compose down` | Stop infrastructure |
| `uv sync --all-packages` | Sync all Python dependencies |

## Dev Server Ports

| Service | Port |
|---------|------|
| Client (Vite) | 5173 |
| Control Service (FastAPI) | 8000 |
| Job Fetcher | 8001 |
| Job Applier | 8002 |
| SuperTokens Core | 3567 |
| MongoDB | 27017 |
| PostgreSQL | 5432 |

## Environment Variables

### Server (`apps/server/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `DB_NAME` | No | Database name (default: `ai_apply_agents`) |
| `SUPERTOKENS_CONNECTION_URI` | Yes | SuperTokens Core URL |
| `SUPERTOKENS_API_KEY` | No | SuperTokens API key |
| `API_DOMAIN` | No | Backend URL (default: `http://localhost:8000`) |
| `WEBSITE_DOMAIN` | No | Frontend URL (default: `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | No | Enables AI resume extraction and tailoring |
| `ADMIN_EMAIL` | No | Email to auto-promote to admin on startup |

### Client (`apps/client/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API URL (default: `http://localhost:8000`) |

## Python Dependencies

Python packages share a single `uv.lock` at the root. To add a dependency:

```bash
uv add <package> --package server
uv add <package> --package jobs-scraper
uv add <package> --package jobs-applier
uv lock
```

## Troubleshooting

**"Address already in use"**

```bash
bun run dev:reset
# or manually:
fuser -k 8000/tcp 8001/tcp 8002/tcp
```

**MongoDB not running**

```bash
docker compose up -d
# Check status:
docker compose ps
```

**SuperTokens connection error**

Ensure Docker is running and SuperTokens is healthy:

```bash
docker compose logs supertokens
curl http://localhost:3567/hello  # Should return "Hello"
```

**AI features not working**

Set `ANTHROPIC_API_KEY` in `apps/server/.env.local`. Required for resume extraction (PDF/DOCX upload) and AI resume tailoring.
