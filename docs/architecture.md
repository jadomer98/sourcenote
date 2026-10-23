# SourceNote: implemented architecture

Updated 2026-10-23. The application is implemented and verified locally. Real free-provider evaluation, cloud provisioning and public delivery remain pending credentials/account access. The original [proposal](architecture-proposal.md) and ADR-01–06 remain historical; [ADR-07](architecture/decisions.md) records the revision required by Ayham's zero-spend constraint.

## Application and data boundaries

Next.js 16 App Router, React 19 and TypeScript serve a German research workspace. The home view contains searchable notebooks; the notebook view has Sources, Chat and Studio panels, changing to tabs on narrow screens. Native dialogs provide focus containment and Escape behavior. Buttons, inputs and citation controls have accessible labels. Meaningful browser workflows run on desktop and mobile; full WCAG conformance has not been audited.

The Node route handler is a thin validation/authorization boundary. Small modules handle notebook lifecycle, ingestion, generation, storage and maintenance. The UI receives no credentials. State is persisted in PostgreSQL, not browser memory. A browser-issued seven-day guest cookie selects one owner; only its hash is stored in the DB. Selection IDs in localStorage are UI preferences, never authority.

Local development uses filesystem-backed PGlite (embedded PostgreSQL). With `DATABASE_URL`, a bounded `pg` pool uses managed PostgreSQL such as Neon. All SQL uses parameters. [Migration 001](../migrations/001_initial.sql) defines composite notebook/operation foreign keys, enum-like checks, indexes and persistent operation/quota rows. Private originals are in `source_blob`, capped at 4 MiB each and by a global budget. This avoids a paid volume and lets deletion purge source content and original bytes in one transaction. Temporary disk is used only inside the bounded extraction request.

Prepared deployment: Vercel Hobby + Neon Free, without a custom domain. [Free-tier research](free-tier-research.md) records official sources and trade-offs. No public URL exists yet. Docker is also supplied for a conventional Node host, but no paid service is provisioned.

## Source-to-citation flow

1. Check guest expiry, notebook ownership, Origin, CSRF token, type/signature, size and quotas. Record the source, original and ingest operation atomically. Reusing an ingest key reuses its source.
2. Extract UTF-8 text or parse PDF page text in a child process with a 20s deadline and 128 MiB V8 heap budget. This bounds heap, not total OS memory. Reject empty/scanned, encrypted, malformed and over-limit input. Failed sources remain visible and retryable.
3. Split page-local text into at most ~600-token chunks with stable IDs and offsets. A transaction verifies the current attempt/lease and owner, replaces chunks and marks ready. Stale attempts cannot commit.
4. Questions, summaries and quizzes select an exact set of authorized ready sources. Reject stale, excluded, foreign or oversized selections; do not silently truncate. Full context is chosen for predictable coverage of short documents; no embeddings, search ranker, queue or vector service.
5. Persist operation-specific selection/evidence membership and reserve quotas before the provider call. Pass only the standalone question and selected passages; earlier assistant text is not evidence. Source instructions are untrusted. Groq supplies strict JSON; the optional Cloudflare adapter uses its JSON schema format. Schema and citation allow-list validation happen on the server.
6. Lock the notebook and recheck source state/version before atomically saving output, citations and usage. Unsupported material produces an explicit limitation without citations. Invalid IDs, truncated output, provider errors or late source deletion produce a useful error without exposing provisional text.
7. A citation request authorizes again and resolves source text/page from live stored evidence. Model-provided quotes/page numbers are never accepted. A valid ID proves provenance, not that every claim is supported; the [evaluation set](../fixtures/evaluation.json) requires human semantic review.

Saved answers preserve citation provenance. Summary and quiz outputs reopen in Studio. Markdown export includes source names and reliable PDF page labels. Deleting a source clears its chunks/blob and redacts dependent answer/summary/note/quiz bodies, even if a selected source was not cited; historical questions remain. A minimal content-free source tombstone remains until notebook/owner deletion. Source deletion and generation commits use the same notebook lock.

## Implemented limits and recovery

| Boundary | Limit |
| --- | --- |
| Upload | 4 MiB, PDF/TXT/MD or pasted UTF-8 text; 50 PDF pages; 100k characters/source |
| Workspace | 3 notebooks; 10 active sources/notebook; 500k characters/owner; 30 saved notes/notebook |
| Ingestion | 20 new uploads/owner/hour; one globally active parser; 20s parser deadline |
| Generation | 4k evidence tokens; 1.5k question characters; 2k completion tokens; 45s provider deadline |
| Concurrency | One active generation/owner, three/service, protected by DB admission locks |
| Free Groq pacing | Reserve estimated tokens against 8k per clock minute; provider can still return 429 |
| Daily defaults | 30 attempts/owner; configured 100k service tokens and 50 MiB source bytes in `.env.example` |
| Session | Seven-day absolute lifetime; lost cookies cannot recover data |

Provider tokenization can differ from the local `o200k_base` estimate; an input margin is used. Provider/account rate limits remain authoritative. The service caps bound local usage; they are not a promise that every allowed request will fit a free provider window.

An idempotency key and request hash persist across refresh. A running replay returns the existing operation; a completed replay reuses it; a mismatched key returns 409. Failed generation retries require a new explicit key. No automatic retries after uncertain provider execution; unknown token usage remains conservatively reserved. Browser reload polls pending operations.

Bootstrap-triggered maintenance, throttled to once/minute per process and serialized in SQL, marks stale operations failed and purges a bounded batch of expired owners. Access checks deny expired owners before physical cleanup. There is no background scheduling or claimed deletion deadline when the app receives no traffic. No uptime, HA, backup or restore guarantee is claimed.

## Security and remaining limits

| Risk | Implemented control | Residual / verification |
| --- | --- | --- |
| Broken isolation | Session hash, expiry, guard on every notebook path, composite SQL keys | Cross-owner read/write/citation tests pass; broader external pentest absent |
| Request forgery | SameSite cookie, exact Origin, constant-time CSRF check | Production must set exact APP_ORIGIN; no permissive CORS |
| Malicious rendering | Source text displayed as text; Markdown has no raw HTML; CSP restricts network/image sources | CSP permits inline styles/scripts for Next; nonce hardening deferred |
| Malicious documents | Signature/type/size checks; page/text caps; child timeout/heap limit | Not an OS sandbox; dependency updates and bounded demo input remain necessary |
| Prompt injection / invented facts | No tools/secrets in prompt, explicit source-data boundary, reference validation | Semantic grounding needs real-provider evaluation |
| Spending / abuse | Free-account recommendation; no paid fallback; global token/storage and session-creation caps | Cookie resets can exhaust shared demo quota; distributed IP-level mitigation deferred |
| Delete/generate race | Commit revalidation and notebook row lock; atomic content purge | Already transmitted provider text cannot be recalled locally |

Provider credentials are server environment variables only. Error responses and routine logs avoid source text, prompts and secrets. Use synthetic fixtures for review. Groq's [data policy](https://console.groq.com/docs/your-data) describes retention controls and US data location; enabling ZDR or determining account-specific obligations is an operator action, not something claimed by this application.

## Traceability

| Requirements | Main code | Diagram | Verification |
| --- | --- | --- | --- |
| MVP-01,08 | notebooks.ts, db.ts, workspace-app.tsx | ARCH-01,03 | CRUD, reload, isolated cookie tests |
| MVP-02,03 | sources.ts, extraction.ts, pdf-extract.mjs | ARCH-02,03 | Real PDF/page, failed input, retry, selection tests |
| MVP-04–07 | generation.ts, provider.ts | ARCH-02–04 | Evidence allow-list, limitation, deletion race, timeout tests |
| MVP-09 | workspace-app.tsx, CSS | ARCH-01 | Desktop/mobile browser core journey, screenshots |
| MVP-10,11 | auth.ts, API handler, quotas/config | ARCH-01,04 | Cross-owner IDs, CSRF and service cap tests |
| Employer delivery | README, deployment/demo/submission docs | all four | Local package complete; public links/real AI/video pending |

See [tests](testing.md), [deployment](deployment.md), [diagram manifest](architecture/README.md) and [delivery audit](delivery-status.md).
