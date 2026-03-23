# Documentation index

Architecture and planning docs for **AI Apply Agents** — a multi-tenant job auto-apply platform.

## Quick links

| Document | Description |
|----------|-------------|
| [data-model-mongodb.md](./data-model-mongodb.md) | **Authoritative** MongoDB collections, models, enums, indexes (`apps/server`) |
| [architecture.md](./architecture.md) | High-level system architecture (control plane vs execution plane, principles, flows) |
| [architecture-control-service.md](./architecture-control-service.md) | Control Service (APIs, orchestration, matching, tailoring) — maps to `apps/server` |
| [architecture-job-fetcher.md](./architecture-job-fetcher.md) | Job Fetcher pipeline — maps to `packages/jobs_scraper` |
| [architecture-job-applier.md](./architecture-job-applier.md) | Job Applier execution — maps to `packages/jobs_applier` |
| [MASTER_PROMPT.md](./MASTER_PROMPT.md) | Multi-agent build plan (agent topology, collections, delivery phases) |
| [prompt-guide.md](./prompt-guide.md) | Extended master prompt with per-agent task lists |

## Repository layout (actual)

| Area | Path | Dev port (typical) |
|------|------|---------------------|
| Frontend | `apps/client` | 5173 |
| Control Service | `apps/server` | 8000 |
| Job Fetcher | `packages/jobs_scraper` | 8001 |
| Job Applier | `packages/jobs_applier` | 8002 |

Stack: React + TypeScript + Tailwind + Vite + Bun | FastAPI + Python | MongoDB | Camoufox (browser automation in the applier). See the root [README.md](../README.md) for setup and environment variables.

## Diagrams

Mermaid diagrams in these Markdown files render on GitHub, GitLab, and many editors. For local preview, use a Mermaid-capable viewer or VS Code extension.

## Source of truth

- **MongoDB schema:** Pydantic models in `apps/server/src/models/` and indexes in `apps/server/src/db.py` — summarized in [data-model-mongodb.md](./data-model-mongodb.md).
- **Planning / multi-agent prompts:** [MASTER_PROMPT.md](./MASTER_PROMPT.md) uses conceptual collection names; where they differ, the implementation doc above wins.
