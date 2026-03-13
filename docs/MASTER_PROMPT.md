# Master Prompt — Multi-Agent Build Plan for Job Auto-Apply Platform

Paste this as-is into a strong coding agent, or use as the operating spec for a multi-agent workflow.

## Platform Summary

3 core systems:

1. **Job Fetcher Service** — Scrapes/calls APIs, extracts jobs, normalizes to shared domain model
2. **Job Applier Service** — Uses profiles + job data to automate applications via browser automation (Camoufox), with screenshots and resumable execution
3. **Control Service** — Backend APIs and frontend UI for users, workflows, monitoring, scheduling, policies

Stack: React + TypeScript + Tailwind + Vite + Bun | FastAPI + Python | Camoufox | MongoDB

Architecture: Multi-tenant microservices, resumable state-machine workflows, ~1000 users, focus on maintainability, extensibility, observability, resumability.

---

## Agent Topology (16 Agents)

| # | Agent | Owns | Constraints |
|---|-------|------|-------------|
| 1 | Platform Architect | Structure, shared contracts, env conventions | No scraper/browser/UI logic |
| 2 | MongoDB Domain Model | Pydantic models, collections, indexes | No routes, no frontend |
| 3 | Control Service Backend | FastAPI control plane, orchestration | No scraping, no browser automation |
| 4 | Workflow Engine | Workflow builder, state transitions, retry | Generic, no board/UI |
| 5 | Job Fetcher Service | Fetcher FastAPI, board adapters, normalization | No user CRUD, no app logic |
| 6 | Board Integration | Per-board adapters under fetcher | One adapter per task |
| 7 | Job Matching | Scoring, matching, match persistence | No applying, no fetching |
| 8 | Job Applier Service | Applier FastAPI, execution coordinator | No user/matching/fetcher |
| 9 | Browser Automation | Camoufox primitives, page helpers | No orchestration |
| 10 | Domain Applier Adapters | Per-domain application strategies | Uses browser primitives |
| 11 | Frontend Dashboard | Shell, routing, dashboards, pages | No backend logic |
| 12 | Frontend Feature Forms | Profile, document, preference, policy forms | Typed contracts only |
| 13 | Frontend Monitoring | Workflow timeline, task/attempt views | Read-focused |
| 14 | Auth and Tenant Isolation | Auth deps, tenant scoping | Pluggable, fail closed |
| 15 | Notifications and Audit | Audit writes, notification infra | Append-only audit |
| 16 | DevOps and Quality | Docker, compose, lint, test, env | Operational DX |

---

## Core Collections (MongoDB)

tenants, users, user_profiles, user_documents, job_preferences, automation_policies, job_sources, fetch_runs, job_postings, job_matches, workflow_runs, task_runs, application_runs, application_attempts, artifacts, audit_events, notifications

---

## Suggested Delivery Order

**Phase 1 — Foundations:** Platform Architect → MongoDB Model → Auth/Tenant → DevOps

**Phase 2 — Control Plane:** Control Service Backend → Workflow Engine → Notifications/Audit

**Phase 3 — Execution:** Job Fetcher → Board Integration → Job Matching → Job Applier → Browser Automation → Domain Applier Adapters

**Phase 4 — Frontend:** Frontend Dashboard → Frontend Feature Forms → Frontend Monitoring

---

## Task Assignment Format

```
Agent: <Agent Name>
Task: <Task description>
Goal: <What to achieve>
Scope: <In scope items>
Out of scope: <Explicit exclusions>
Definition of done: <Checklist>
```
