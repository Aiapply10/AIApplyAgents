# AI Apply Agents — Agent Instructions

Multi-tenant job auto-apply platform. See `docs/README.md` for architecture and `docs/data-model-mongodb.md` for **implemented MongoDB collections**; `docs/MASTER_PROMPT.md` for the multi-agent build plan.

## Project Overview

| System | Location | Responsibility |
|--------|----------|----------------|
| **Control Service** | `apps/server` | APIs, users, workflows, orchestration, monitoring |
| **Job Fetcher** | `packages/jobs_scraper` | Scraping/API ingestion, normalization, dedupe |
| **Job Applier** | `packages/jobs_applier` | Browser automation, form filling, application execution |
| **Frontend** | `apps/client` | React dashboard, forms, monitoring UI |

Stack: React + TypeScript + Tailwind + Vite + Bun | FastAPI + Python | Camoufox | MongoDB

## Build & Test

```bash
bun install && uv sync --all-packages   # Setup
bun run dev                             # All services (or bun run dev:reset if ports busy)
bun run build                           # Build all
bun run lint                            # Lint all
bun run dev --filter=@repo/<name>       # Single app (client, server, jobs-scraper, jobs-applier)
```

Python deps: `uv add <pkg> --package server|jobs-scraper|jobs-applier` then `uv lock`

## Service Boundaries (DO NOT cross)

| Service | Owns | Must NOT implement |
|---------|------|--------------------|
| **Job Fetcher** | board adapters, fetch execution, normalization, dedupe | user CRUD, application logic |
| **Job Applier** | browser automation, form filling, step traces, artifacts | user CRUD, matching, fetching |
| **Control Service** | users, profiles, workflows, orchestration, audit | board scraping, browser automation |
| **Frontend** | UI, forms, monitoring views | backend business logic |

## MongoDB (Control Service)

Single application database (default `ai_apply_agents`): tenants, users, user_profiles, user_documents, master_sections, resumes, job_preferences, automation_policies, job_sources, job_postings, job_matches, fetch_runs, workflow_runs, task_runs, application_runs, application_attempts, artifacts, audit_events, notifications. Models: `apps/server/src/models/`; indexes: `apps/server/src/db.py`.

## Global Rules

1. **Domain-driven boundaries** — Keep code modular; no hidden coupling.
2. **Tenant-aware** — All major models scoped by tenant.
3. **Contracts first** — Shared DTOs, status enums, event schemas before feature work.
4. **Resumability & idempotency** — Design for durable, resumable workflows.
5. **Type-safe schemas** — Pydantic for backend; TypeScript types for frontend.
6. **No duplicate ownership** — Use contracts, do not re-implement across services.
7. **Small tasks** — One endpoint, one model, one component, one helper per task.

## File Boundaries by Agent

- **Platform Architect** — Root structure, `packages/shared/*`, env templates, architecture docs
- **MongoDB Model Agent** — Domain models, `*_models.py`, index specs, repository interfaces
- **Control Service** — `apps/server/**` only
- **Workflow Engine** — Workflow/task orchestration modules (owned by control or shared)
- **Job Fetcher** — `packages/jobs_scraper/**` only
- **Board Integration** — `packages/jobs_scraper/adapters/**` only
- **Job Matching** — Matching logic (in control or shared)
- **Job Applier** — `packages/jobs_applier/**` only
- **Browser Automation** — `packages/jobs_applier/browser/**` only
- **Domain Applier Adapters** — `packages/jobs_applier/strategies/**` only
- **Frontend** — `apps/client/**` only
- **Auth/Tenant** — Auth dependencies, tenant middleware
- **Notifications/Audit** — Audit and notification modules
- **DevOps** — Docker, compose, CI, `.env.example`

## Task Output Format

When implementing a task, provide:

1. What you changed
2. Files created/updated
3. Why the design is correct
4. Assumptions
5. Follow-up tasks unlocked
