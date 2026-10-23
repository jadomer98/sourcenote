# Architecture decision records

All six decisions are **proposed**, dated 2026-10-23. They are a consistent implementation recommendation, not evidence of approval or deployment.

## ADR-01 — One TypeScript application on a long-running host

**Requirements:** MVP-01–11. **Options:** Next.js/Node monolith; React/Vite with FastAPI. **Decision:** Next.js route handlers and PostgreSQL on Railway, one application container with private mounted storage. This keeps frontend/backend validation together and allows a bounded PDF child process without assuming serverless background execution. **Consequences:** host and DB costs; one language; volume deployment downtime and one-instance constraint. No gateway, cache or separate API service. **Revisit:** measured extraction time exceeds the route budget, a required parser needs Python, or multi-instance availability becomes necessary.

## ADR-02 — Isolated seven-day guest workspaces

**Requirements:** MVP-08,10. **Options:** managed login; server-issued anonymous sessions. **Decision:** high-entropy token in a secure cookie, hash in PostgreSQL, absolute expiry; authorize every operation. An example notebook is copied into each guest workspace. **Consequences:** low review friction and no shared mutable account, but no recovery after cookie loss and no cross-device continuity. Guest creation can be abused, so global quotas are required. **Revisit:** persistent accounts or shared workspaces become a real product need.

## ADR-03 — PostgreSQL plus private originals on a mounted volume

**Requirements:** MVP-01–03,05,08,10. **Options:** PostgreSQL + private volume; PostgreSQL + object bucket. **Decision:** PostgreSQL stores extracted text and evidence metadata; a private `/data` volume stores originals behind an authorized route. Composite keys constrain notebook and operation provenance. Deletion redacts derived outputs, purges chunks/files, and retains only minimal historical tombstones. **Consequences:** few services and simple local reproduction, but DB/filesystem changes are not atomic; a retryable cleanup pass is required. Storage and DB cost scale with retained data. **Revisit:** replicas, large files or independent object lifecycle controls are needed; then use a private bucket and preserve the adapter contract.

## ADR-04 — Bounded synchronous ingestion with durable operation leases

**Requirements:** MVP-02,03,08,09,11. **Options:** request-bound parsing; durable queue and worker. **Decision:** PDF.js child process with 20s deadline and memory limit; PostgreSQL attempt lease; transactional chunk replacement. Startup and periodic maintenance marks interrupted attempts failed and cleans storage. **Consequences:** simplest complete slice, no background completion promise after request termination; explicit retries and strict document caps. Empty/scanned/encrypted PDFs get useful errors; OCR deferred. **Revisit:** representative documents regularly exceed the deadline or queueing is needed to absorb measured concurrency.

## ADR-05 — Bounded full-context generation and validated references

**Requirements:** MVP-04–07,11. **Options:** full context; relational full-text retrieval; pgvector embeddings. **Decision:** all selected ready chunks up to 24k evidence tokens, with stable operation-specific evidence IDs. OpenAI Responses adapter uses a configured structured-output model; validate references before returning text, and resolve excerpts from storage. Same flow for summaries. No streaming or automatic repair generation initially. **Consequences:** high evidence recall on small inputs, predictable source selection, no indexing/embedding cost; larger contexts cost more and large selections must be reduced. Valid references do not prove supported claims. **Revisit:** real questions/documents exceed context caps or evaluation demonstrates a need for semantic retrieval; benchmark retrieval quality before changing.

## ADR-06 — Early real deployment with explicit quotas and risk-driven tests

**Requirements:** MVP-09–11 and employer repository/live/Loom deliverables. **Options:** local-only polish until feature complete; deploy an early vertical slice. **Decision:** deploy the core source-to-citation path early, use deterministic mocks in routine CI and bounded real-provider evaluations for grounding. Atomic session/global spend reservations and concurrency leases fail closed. No retry after an ambiguous provider timeout. **Consequences:** credentials and operating budget needed early; implementation must distinguish test mocks from the live provider. Operational limits may reject reviewers under abuse or concurrent load. **Revisit:** measured latency/usage exceeds targets, budget policy changes, or persistent availability is required.
