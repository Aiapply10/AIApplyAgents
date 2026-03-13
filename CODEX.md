# Codex — AI Apply Agents Project Instructions

## Context

Multi-tenant job auto-apply platform. Control Service orchestrates; Job Fetcher ingests jobs; Job Applier automates applications via browser.

**Stack:** React + TypeScript + Tailwind + Vite + Bun | FastAPI + Python | Camoufox | MongoDB

## Commands

```bash
bun install && uv sync --all-packages
bun run dev
bun run build
bun run lint
bun run dev --filter=@repo/<name>
```

## Service Ownership

| Path | Service | Scope |
|------|---------|-------|
| `apps/server` | Control Service | Users, workflows, orchestration |
| `packages/jobs_scraper` | Job Fetcher | Board adapters, fetch, normalization |
| `packages/jobs_applier` | Job Applier | Browser automation, application execution |
| `apps/client` | Frontend | UI, forms, dashboards |

## Rules

1. Respect service boundaries — do not implement Control logic in Fetcher/Applier or vice versa
2. Tenant-scope all major models
3. Use shared contracts; no duplicate implementations
4. One focused task per change (one endpoint, one model, one component)

## Reference

Full multi-agent plan: `docs/MASTER_PROMPT.md`  
Agent instructions: `AGENTS.md`
