# Claude Code — AI Apply Agents Project

## Project Overview

Multi-tenant job auto-apply platform with three core systems: **Job Fetcher** (scrapes/APIs), **Job Applier** (browser automation), and **Control Service** (orchestration, APIs, UI). Built as multi-tenant microservices with resumable workflows.

Stack: React + TypeScript + Tailwind + Vite + Bun (frontend) | FastAPI + Python (backend) | Camoufox (browser) | MongoDB.

## Common Commands

```bash
# Setup
bun install
uv sync --all-packages

# Development
bun run dev                 # All services
bun run dev:reset           # Free ports + dev (if "Address already in use")
bun run dev --filter=@repo/client
bun run dev --filter=@repo/server
bun run dev --filter=@repo/jobs-scraper
bun run dev --filter=@repo/jobs-applier

# Build & lint
bun run build
bun run lint

# Python deps (from root)
uv add <package> --package server|jobs-scraper|jobs-applier
uv lock
```

## Architecture and Conventions

### Monorepo layout
```
apps/client/           # React frontend (port 5173)
apps/server/           # Control Service (port 8000)
packages/jobs_scraper/ # Job Fetcher (port 8001)
packages/jobs_applier/ # Job Applier (port 8002)
```

### Service boundaries
- **Control Service** — Users, profiles, workflows, orchestration. No scraping or browser logic.
- **Job Fetcher** — Board adapters, fetch execution, normalization. No user CRUD.
- **Job Applier** — Browser automation, form filling. No matching or fetching.

### Domain rules
- All major models tenant-scoped
- Type-safe schemas (Pydantic / TypeScript)
- Contracts first; no duplicate ownership across services
- Design for resumability and idempotency

## Gotchas

- Port conflicts: Use `bun run dev:reset` or `fuser -k 8000/tcp 8001/tcp 8002/tcp`
- Python deps: Single `uv.lock` at root; use `uv add --package <name>` for per-service deps
- Turborepo runs tasks in parallel; each Python service has its own port

## Code Style

- **Backend:** FastAPI + Pydantic; typed request/response schemas; Ruff for lint
- **Frontend:** React functional components; TypeScript strict; Tailwind; ESLint
- **General:** Modular, composable; clear interfaces; avoid hidden coupling
