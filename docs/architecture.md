# System architecture

**Scope:** High-level architecture of the multi-tenant platform: discover jobs, tailor application materials, automate submissions, and provide operational control. The design separates a **control plane** (Controller / Control Service) from an **execution plane** (Job Fetcher and Job Applier).

**Repository mapping:** The Control Service lives in `apps/server`; execution services are `packages/jobs_scraper` (Fetcher) and `packages/jobs_applier` (Applier). See [README.md](./README.md).

### Implementation snapshot (this repo)

| Area | Status |
|------|--------|
| **Control Service** | Full FastAPI app: auth (SuperTokens), tenants/users, profiles, documents, resumes, master sections, preferences, policies, workflows, uploads (local/S3), monitoring, admin. MongoDB models + indexes in `apps/server/src/db.py`. |
| **MongoDB** | Single app database (`ai_apply_agents` by default): see [data-model-mongodb.md](./data-model-mongodb.md). |
| **Job Fetcher package** | Stub HTTP service; job/fetch **schema** lives in the Control Service models for shared storage. |
| **Job Applier package** | FastAPI bot API + Camoufox flows; **SQLite** stores resumable `FlowContext`; MongoDB stores `application_*` via the control plane. |

---

## 1. Core architectural principles

- **Separation of concerns** — The Fetcher handles data acquisition, the Applier handles automation execution, and the Controller handles orchestration and policy.
- **Stateful automation** — Fetching and applying are long-running, failure-prone workflows modeled as **resumable** processes, not only request/response RPCs.
- **Connector extensibility** — Job boards and ATSs differ; adapters and strategies avoid hardcoded, brittle flows.
- **Multi-tenant isolation** — Strict boundaries per tenant for data, automation rules, schedules, documents, and execution history.
- **Evidence and auditability** — Execution logs and captures support verification and debugging.
- **Safe automation control** — Automation runs from explicit user actions or policy-based scheduling, not indiscriminate application.

---

## 2. Subsystem component architecture

The platform has three primary applications.

### A. Controller application (control plane)

Entry point for users and admins: schedules, policy, recommendations, and access control.

- **User/admin surfaces:** Profile, job preferences, RBAC, tenant management, health/monitoring.
- **Backend API:** UI operations and internal workflow communication.
- **Scheduler/orchestrator:** Runs, retries, timed policies, rate-limited windows.
- **Recommendation engine:** Matches normalized jobs to structured profiles and preferences.
- **Resume tailoring:** ATS-oriented resume variants from profile + target job.

### B. Job Fetcher (execution plane — inbound)

Acquires listings from multiple sources and normalizes them to an internal representation.

- **Source connectors:** Public APIs, partner APIs, ATS list pages, HTML scraping.
- **Execution engine:** Crawl logic, pagination, retries, source-specific throttling.
- **Normalization pipeline:** Canonical models (skills, seniority, employment type, locations).
- **Deduplication and freshness:** Cross-source dedupe and liveliness of postings.

### C. Job Applier (execution plane — outbound)

Drives automated submissions with target-specific workflows.

- **Task intake:** Validates user readiness, job data, artifacts.
- **Strategy resolver:** Selects ATS/board workflow for the target.
- **Session manager:** Login continuity, cookies, auth context.
- **Browser engine:** Navigation, forms, uploads, submission (e.g. Camoufox in this repo).
- **Evidence capture:** Screenshots and operational logs across the lifecycle.

---

## 3. Shared platform services and domains

- **Data stores:** User/tenant data; normalized job inventory; application tasks and history; durable workflow state for resumability.
- **Documents and artifacts:** Resumes, parsed content, object storage for screenshots.
- **Observability:** Logs, traces, metrics.
- **Notifications:** User and admin alerts for runs, failures, and status changes.

---

## 4. High-level architecture flow

```mermaid
flowchart TB
    subgraph Control Plane [Controller Application]
        API[Controller API and access]
        ORCH[Scheduler and orchestrator]
        MATCH[Recommendation and resume services]
    end

    subgraph Execution Plane
        FE[Job Fetcher engine]
        APP[Job Applier engine]
    end

    subgraph Shared ["Shared services and persistence"]
        DB[("Databases: users, jobs, apps, state")]
        DOC[("Artifacts and storage")]
        OBS[("Observability and metrics")]
    end

    Users((Users and admins)) --> API
    API <--> ORCH
    API <--> MATCH

    ORCH -->|Trigger fetch tasks| FE
    ORCH -->|Schedule apply tasks| APP

    FE -->|Normalize and save| DB
    APP -->|Update status| DB
    MATCH -->|Generate and store| DOC
    APP -->|Save evidence| DOC

    FE -.-> OBS
    APP -.-> OBS
    API -.-> OBS
```

---

## 5. Functional workflows

### Job acquisition flow

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler
    participant F as Fetcher engine
    participant N as Normalization pipeline
    participant DB as Job store

    S->>F: Trigger scheduled fetch run
    F->>F: Acquire raw data via source connectors
    F->>N: Send raw payloads for transformation
    N->>N: Extract canonical metadata
    N->>DB: Upsert, deduplicate, update freshness
```

### Application execution flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Controller API
    participant A as Applier intake
    participant B as Browser automation engine
    participant DB as Application store

    C->>A: Dispatch prepared application task
    A->>A: Resolve target ATS strategy
    A->>B: Initialize session
    B->>B: Navigate, fill forms, upload artifacts
    B->>DB: Checkpoint progress and evidence
    B->>DB: Save final submission result
```

---

## 6. Non-functional and operational architecture

- **Deployment and runtime** — Controller API instances aim to stay responsive; Fetcher and Applier work as asynchronous workers. Orchestration uses queues and durable state so user traffic is not blocked by heavy jobs.
- **Security and access control** — Tenant-scoped RBAC; PII and automation credentials protected at rest; credential access limited to the applier session path where applicable.
- **Observability** — Connector health, API logs, browser failure traces, checkpoint-to-evidence linkage (e.g. screenshots to steps).
- **Risks and constraints** — Target DOM volatility favors pluggable strategies; browser automation is resource-heavy and needs concurrency limits and queue backpressure.

---

## Related docs

- [Control Service detail](./architecture-control-service.md)
- [Job Fetcher detail](./architecture-job-fetcher.md)
- [Job Applier detail](./architecture-job-applier.md)
- [MongoDB data model sketch](./data-model-mongodb.md)
