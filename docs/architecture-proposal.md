# SourceNote original architecture proposal

**Historical planning baseline, 2026-10-23.** This describes the earlier proposal. The user subsequently required zero spending; implementation now uses Groq, Vercel/Neon-compatible storage and local PGlite. See [current architecture](architecture.md) for the implemented system. Statements below about unfinished implementation describe the time of the original proposal.

SourceNote is an independently named, NotebookLM-inspired research assistant for Ayham's Everlast assignment. The employer requires a working clone, GitHub link, live deployment and a Loom video no longer than ten minutes. The chosen scope below is our proposal, not an additional employer requirement.

## Scope and reviewer journey

Create a notebook → upload a text-based PDF or UTF-8 text → see processing complete → ask a question using selected sources → inspect its supporting excerpt → generate a grounded summary → reload and reopen the result. Include an unsupported question and a recoverable upload failure in the demonstration.

Use German product copy and English technical documentation. Desktop uses Sources / Chat / Studio panels; narrow screens use tabs. Inputs have labels, keyboard focus is visible, source processing changes are announced, and errors explain the next action. Accessibility conformance remains unverified until implementation.

| Requirement | Acceptance / boundary | Main data | Meaningful verification |
| --- | --- | --- | --- |
| MVP-01 | Notebook service creates, lists, renames and deletes owned notebooks | owner, notebook | CRUD and reload; foreign IDs rejected |
| MVP-02 | Ingestion accepts text PDF, text file and pasted text; clear failure/retry states | source, chunk, operation | malformed, scanned, encrypted, empty and oversized input |
| MVP-03 | Source UI previews text, selects ready sources and removes sources | source, operation_source | excluded/deleted sources never enter evidence |
| MVP-04 | Generation uses only the exact authorized ready selection | evidence, operation | second session and non-ready IDs rejected |
| MVP-05 | Citation resolver opens stored text and reliable locations | citation, evidence, chunk | invented ID, cross-operation ID and wrong location rejected |
| MVP-06 | Unsupported questions produce an explicit limitation | entry | fixed answerable/unsupported/conflicting/injection examples |
| MVP-07 | Summary shares the chat grounding contract | entry(kind=summary) | inspect supporting evidence and reopen summary |
| MVP-08 | Completed work survives reload for the 7-day guest lifetime | all owned records | reload; missing cookie cannot recover workspace |
| MVP-09 | Complete desktop/mobile states and keyboard workflow | frontend | browser walkthrough, error/retry and focus checks |
| MVP-10 | Low-friction server-issued guest session; private workspace | workspace_owner | two independent cookie jars; forged IDs fail |
| MVP-11 | Real provider path with atomic usage caps and deployed smoke test | operation, quota_bucket | timeout, budget exhaustion, duplicate submissions |

All are MVP priority. Ayham is the assumed solo implementer. Saved answers as notes and an isolated sample notebook are should-haves. Audio, OCR, web import, collaboration and payments are deferred. No decorative controls for unimplemented features.

## Assumptions and stack choice

| Assumption | Confidence / impact | Revisit when |
| --- | --- | --- |
| Solo developer, small review workload | Medium; favors one application | Another developer or sustained traffic changes delivery needs |
| Short review documents are sufficient | Medium; permits full-context grounding | Real fixtures regularly exceed 24k evidence tokens |
| Seven-day guest persistence is adequate | Medium; removes login friction | Reviewers need recovery or cross-device access |
| Railway and an AI provider can be provisioned | Unverified; deployment dependency | Account, region, budget or model access prevents use |

Compared **Next.js + PostgreSQL on a long-running Node host** with **React/Vite + FastAPI + PostgreSQL**. Both are realistic. Select Next.js/TypeScript to share validation types and keep one build/runtime. FastAPI would be attractive for a Python-heavy extraction pipeline but adds a second language and API deployment surface without a present requirement.

Proposed implementation: Next.js App Router, React, TypeScript, CSS with reusable accessible components, route handlers, Zod validation, parameterized SQL through a small PostgreSQL adapter, SQL migrations, PDF.js (`pdfjs-dist`) for page text, and a server-only OpenAI Responses adapter with a configured structured-output-capable model. Do not pin an untested dependency set in architecture documentation; select exact compatible versions and commit a lockfile during the vertical slice.

The app runs as one Node container on Railway, with a private mounted `/data` volume for originals and a separate PostgreSQL service. A single deployment is intentional: a mounted volume constrains replication and can introduce redeploy downtime. This is supported as a hosting pattern by [Next.js self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting) and [Railway volume documentation](https://docs.railway.com/reference/volumes). Neither documentation establishes that our application has been tested on that host.

## Evidence and generation contract

Use **bounded full context**, not ranked RAG, initially. Full-text retrieval is inexpensive but can miss paraphrases; embeddings improve semantic recall but add indexing and evaluation work. For small documents, including all selected text gives predictable coverage and makes selection easy to demonstrate. There is no embedding service or hidden truncation. Oversized selections receive an actionable error before any provider call.

Split text into stable page-local chunks of approximately 600 tokens, zero overlap, with source-relative character offsets and page numbers only when extraction reliably preserves them. This chunking is for citation addressing, not top-k search. Preserve immutable extraction versions. Replacing content creates a new source; retrying a failed source replaces its uncommitted chunks atomically.

Before generation, intersect submitted IDs with owner → notebook → ready sources. Reject the request if any requested ID is missing, unauthorized or stale rather than silently answering from a smaller set. Store `operation_source` and `evidence` membership for exactly this request. Prior assistant messages remain visible but are not supplied as evidence; require standalone questions initially, avoiding unsupported conversational carry-over.

Suggested output schema: `{ outcome: "answer" | "insufficient", blocks: [{ text, evidence_ids: [] }] }`. An answer requires nonempty blocks with valid supporting IDs for each factual block. A limitation has an empty citation list. Validate schema, outcome and evidence membership. Refusals, truncated responses or invalid references fail safely without displaying provisional text. Never accept model-supplied quotation or page metadata: the citation viewer obtains both from the stored chunk. No automatic model repair call in the MVP. Structural validation does **not** prove semantic support; human-inspected evaluation cases are still required.

Summary generation uses the identical evidence contract. A saved note copies a validated answer with its operation provenance and citations. Streaming is deferred so users only see validated final results. OpenAI's [structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs) supports schema-constrained responses; application authorization and citation validation remain our responsibility.

## Execution, limits and failures

Proposed limits, not measured performance:

| Boundary | Initial configurable target |
| --- | --- |
| Documents | 5 MiB/file, 50 PDF pages, 100k extracted characters/source |
| Workspace | 3 notebooks/session, 10 sources/notebook, 500k stored characters/session |
| Model input | 24k evidence tokens + at most 2k question/prompt overhead; validate using selected model tokenizer |
| Model output | 1.5k tokens |
| Concurrency | 1 active generation/session, 3/service; 1 extraction/service |
| Generation quota | 30 attempts/session/day; global 1M token reservation/day; fail closed if global cap unset |
| Upload abuse | 20 attempts/session/hour plus short-lived HMAC-IP throttle; global storage budget configured before exposure |
| Timeouts | 20s extraction child process; 45s provider; 60s route budget; 90s operation lease |
| Performance goals | Typical small upload ready within 10s; useful final answer within 15s; measure before advertising |

Reserve the worst-case input/output tokens and a request count atomically before calling the provider. Reconcile to known usage afterwards; uncertain provider spend remains reserved. Caps across session and global scope prevent cookie resets from bypassing the total budget. Token caps bound usage; a monetary budget needs current model rates. Cost formula: hosting + database + volume GB-month + model input tokens × input rate + output tokens × output rate. No monthly total or free-tier assumption is made.

Ingestion runs inside the request lifecycle. Parsing runs in a killable child process with time/memory limits. A source becomes ready only after durable chunk commit. The process must present its current attempt/lease token to commit; an old timed-out worker cannot overwrite a retry. Retry uses the retained original and replaces chunks, never appends duplicates.

Operation uniqueness is `(notebook_id, kind, idempotency_key)`. Reusing a key with another request hash returns 409; completed requests reuse the stored result, running requests return 202 with an operation ID, and failed requests return their stored error. An explicit generation retry creates a new key and a new reservation. An ambiguous provider timeout is never automatically retried. Exactly-once external execution is not promised.

Startup and a 15-minute interval in the long-running process reconcile stale leases, expired owners and deletion/orphan files. A small DB advisory lock prevents overlapping maintenance runs. This is not a durable job queue. While the service is stopped, physical cleanup is delayed; reads still check expiry/deletion once it restarts. Move ingestion to a durable worker only if measured processing no longer fits the bounded request contract.

## Identity, deletion and security

Create a cryptographically random guest token; store only its hash. Cookie: Secure, HttpOnly, SameSite=Lax, Path=/, seven-day absolute lifetime. A lost/expired cookie means the workspace cannot be recovered. Mutations check Origin and a session-bound CSRF token. Never serve private responses through shared caches. SQL and file download paths independently authorize owner/notebook. Storage keys are server-generated and never accepted as user-controlled filesystem paths.

Deleting a source immediately marks it `deleting`, revokes it from all new evidence and hides its content. Serialize source deletion and answer commit with a short notebook row lock; revalidate selected versions inside the commit transaction. Clear chunks and invalidate/redact dependent answer/summary/note bodies and citations, keeping only non-content metadata with an unavailable marker. Keep a minimal source tombstone so historical selection membership remains meaningful. Remove its file idempotently and clear storage metadata; retry failed removal. No historical excerpt snapshot survives content deletion. Notebook/owner deletion purges all dependent records after file cleanup; active operations cannot commit into a deleted notebook.

| Threat | Control | Residual limitation / verification |
| --- | --- | --- |
| Cross-owner or cross-notebook access | Server guard, composite FKs, private file access | Application guard bugs remain possible; test every read/write with another session |
| Malicious PDF | Signature, byte/page/text caps, child timeout, memory budget | Parser vulnerabilities remain; pin/update dependency and test adversarial fixtures |
| Prompt injection | Source text as data; no model tools, no secrets in prompt | Model can still make unsupported claims; evaluate injected/conflicting passages |
| Unsafe output rendering | Markdown raw HTML disabled; safe URL protocols | Verify scripted links and source names |
| Exposed credentials | Server-only env, redacted logs, no client variables | Secret scanning and inspection of built browser bundle |
| Unbounded spending / storage | Atomic reservations, global caps, throttles | Distributed abuse can deny service; fail closed and show recovery guidance |
| Delete/generate race | Notebook lock + version recheck at commit | External call may already have transmitted text; local deletion cannot recall it |

Railway stores originals and extracted text. The AI provider receives the selected extracted text and question; it does not receive cookies or raw originals. Use `store:false`, but do not equate this with zero retention or legal compliance. Verify account-specific provider retention and region before opening the demo to sensitive uploads. The current work uses official product documentation; it does not claim live inspection of Google's product UI.

## Delivery and verification gates

| Stage | Depends on | Solo effort estimate | Evidence required |
| --- | --- | --- | --- |
| T1: scope/architecture | — | 0.5–1 day | Four editable pages and consistent ADRs |
| T2: deployed vertical slice | T1, credentials | 2–4 days | Guest → notebook → real PDF → answer → citation on real host |
| T3: core completion | T2 | 2–4 days | Selection, deletion, summary, persistence, responsive states, quotas |
| T4: verification/polish | T3 | 1–2 days | Isolation, failure, race, grounding and deployed workflow evidence |
| T5: submission | T4 | 0.5–1 day | Accessible GitHub/live links, German Loom <10min, German reply draft |

Estimates are planning assumptions, not a deadline. CI should run type/lint checks, meaningful service tests, migration checks and a deterministic browser core journey. Before recording, run a bounded real-provider evaluation and the deployed upload → question → citation → selection → summary → reload workflow. Test unsupported content, provider timeout and two-session isolation. Release additive migrations before the app; rollback the app only while the schema remains backward compatible. Health probes check process/DB without incurring AI costs. Configure backups and test restore separately before claiming recovery guarantees.

Next artifacts during implementation: application manifest/lockfile, migrations, `.env.example`, demo fixtures, deployment/test/AI-usage notes, 8–9 minute German Loom script and submission draft with verified links. Credentials, provisioning and recording are still outstanding. Architecture is one step toward the recruitment deliverables.

## Navigation

- [Editable diagram and page manifest](architecture/README.md)
- [Architecture decisions](architecture/decisions.md)
- [Relational integrity and deletion notes](architecture/schema-notes.md)
- [Documentation sources](architecture/sources.md)
- [Validation evidence](architecture/validation.md)
