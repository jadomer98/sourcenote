# Verification evidence

Local execution date: **2026-10-23**, Windows, Node 24.19.0. Current verified results are recorded below; no deployed or real-provider result is implied.

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed without errors or warnings |
| `npm.cmd test` | 24 backend/provider tests passed |
| `npm.cmd run test:e2e` | Eight desktop/mobile Chromium tests passed against the real local app with an explicitly labeled deterministic test provider |
| `npm.cmd run build` | Next.js production compilation and static/API route build passed |
| `npm.cmd run db:migrate` | Actual local PGlite schema migration passed |
| `npm.cmd audit --omit=dev --audit-level=high` | Zero reported production dependency vulnerabilities |
| `python scripts/validate_architecture.py` | Four native pages and equivalent standalone XML passed structural checks |

Backend tests exercise durable ingestion, actual PDF parsing/page metadata, owner isolation, foreign/excluded source IDs, idempotency conflicts, missing/fabricated citations, honest limitations, provider timeout without repeated calls, delete-during-generation, token admission caps, failed extraction retry, original deletion and historical output redaction. Provider adapter tests inspect outbound schema, rate-limit behavior, truncation handling, optional Cloudflare format and explicit quotation validation against the cited text.

Browser tests use the actual UI and route handler: notebook creation, pasted-source and binary PDF ingestion, question, citation/page inspection, saving a note, summary, reload, unsupported question, changing source selection, deletion, provider-timeout recovery, unsupported file errors, cross-context access and CSRF rejection. Desktop and narrow-screen tabs both complete the flow. Screenshots in `docs/screenshots/` were captured from this test run and clearly show test mode; they are not live AI evidence. Local installed Google Chrome is used by default; on CI, Chromium is installed by the workflow. Set `PLAYWRIGHT_CHROMIUM=true` to use an installed Playwright Chromium locally.

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run test:e2e
```

Test data lives under `.data/e2e`, separate from ordinary local workspaces. Do not run another dev/build process simultaneously with the browser test server: Next.js shares `.next` build state. Tests reject enabling deterministic AI mode in production. A bounded real-provider evaluation is separate:

```powershell
npm.cmd run evaluate
```

This requires a real configured free-provider key; it fails explicitly if no key is available. Inspect each case against its expected evidence and record semantic pass/failure yourself. Exact response wording is not the correctness criterion. The fixture set covers supported answers, missing facts, source selection, conflicting approval/budget context, unsupported outside knowledge and prompt injection.

## Known verification gaps

- Real Groq/Cloudflare calls and semantic answer quality: awaiting a free-provider credential.
- Hosted Neon `pg` adapter and Vercel PDF runtime/bundle compatibility: awaiting service access and a live smoke test.
- Local production HTTP smoke: not executed. Automatic approval review rejected the production-server launch with “blocked by policy.” The optimized build itself passed. `npm.cmd run smoke` and `npm.cmd run smoke -- --ai` are prepared for a permitted running environment; the latter requires real credentials.
- Docker image: provided, not built here because Docker is unavailable.
- Actual diagrams.net editor rendering: prior browser automation was stopped by URL verification. Native XML checks and approximate diagram preview inspection are recorded separately.
- No external penetration test, formal accessibility audit, load benchmark, backup/restore test or production-readiness claim.
