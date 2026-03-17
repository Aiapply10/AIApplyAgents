# AI Apply Agents

A Turborepo + Bun monorepo with a React frontend and FastAPI backend services.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Turborepo](https://turbo.build/) | Monorepo task orchestration |
| [Bun](https://bun.sh/) | Node.js runtime & package manager |
| [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/) | Client app |
| [FastAPI](https://fastapi.tiangolo.com/) | Python API framework |
| [uv](https://docs.astral.sh/uv/) | Python package manager |

## Project Structure

```
├── apps/
│   ├── client/          # React + TypeScript + Vite
│   └── server/           # FastAPI main server
├── packages/
│   ├── jobs_scraper/     # FastAPI jobs scraper service
│   └── jobs_applier/     # FastAPI jobs applier service
├── package.json          # Bun workspaces
├── pyproject.toml        # uv workspace (single lockfile for Python)
├── turbo.json
└── uv.lock
```

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3.x
- [uv](https://docs.astral.sh/uv/install/) (Python)
- Python 3.12+

## Setup

```bash
# Install Node dependencies (Bun)
bun install

# Install Python dependencies (uv workspace - single command)
uv sync --all-packages

# Activate venv (optional — uv run does not require it)
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows
```

## Commands

From the repo root:

| Command | Description |
|---------|--------------|
| `bun run dev` | Start client, server, jobs_scraper, jobs_applier in dev mode |
| `bun run build` | Build all workspaces |
| `bun run lint` | Run lint in all workspaces |
| `bun run clean` | Clean build artifacts |

## Running Individual Apps

```bash
# Client only
bun run dev --filter=@repo/client

# Server only
bun run dev --filter=@repo/server

# Jobs scraper only
bun run dev --filter=@repo/jobs-scraper

# Jobs applier only
bun run dev --filter=@repo/jobs-applier
```

## Environment Variables

Each project has `.env.local` and `.env.production` (gitignored). Copy from `.env.example` to get started.

| Project | Env Loader | Files |
|---------|------------|-------|
| **Client** | Vite (built-in) | `.env.local`, `.env.production` — only `VITE_*` vars exposed |
| **Server** | pydantic-settings | `MONGODB_URI`, `ENVIRONMENT` |
| **jobs_scraper** | pydantic-settings | `MONGODB_URI`, `CONTROL_SERVICE_URL` |
| **jobs_applier** | pydantic-settings | `MONGODB_URI`, `CONTROL_SERVICE_URL` |

Import `settings` from `config` in Python services; use `import.meta.env.VITE_*` in the client.

## Python Workspace (uv)

Python packages share a single `uv.lock` at the root. To add a dependency to a specific package:

```bash
uv add <package> --package server
uv add <package> --package jobs-scraper
uv add <package> --package jobs-applier
```

After adding deps, regenerate the lockfile:

```bash
uv lock
```

## Dev Server Ports

| App | Default Port |
|-----|--------------|
| Client (Vite) | 5173 |
| Server (FastAPI) | 8000 |
| jobs_scraper | 8001 |
| jobs_applier | 8002 |

## Troubleshooting

**"Address already in use" / port conflicts**

If `bun run dev` fails with `[Errno 98] Address already in use`, ports 8000–8002 may be in use by leftover processes. Use:

```bash
bun run dev:reset
```

This clears those ports and starts dev. On Linux you can also manually free ports:

```bash
fuser -k 8000/tcp 8001/tcp 8002/tcp
```

## Agent Prompting Files

For AI coding agents (Cursor, Claude Code, Codex, etc.):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Main agent instructions, service boundaries, commands |
| `CLAUDE.md` | Claude Code project context |
| `CODEX.md` | Codex project context |
| `docs/MASTER_PROMPT.md` | Full multi-agent build plan and agent topology |
| `.cursor/rules/*.mdc` | Per-domain Cursor rules (control, fetcher, applier, frontend) |
