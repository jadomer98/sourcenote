# Deployment and local operation

The prepared zero-spend path is Vercel Hobby + Neon Free + Groq Free. No cloud resources or public URL have been created yet. Use free plans only, no Pro trial, paid domain or paid provider fallback. See [research and current limits](free-tier-research.md).

## Local start (Windows)

Prerequisites: Node.js 24+, Git. Python is only needed to regenerate architecture diagrams. No local PostgreSQL or Docker installation is required.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Do not overwrite an existing configured `.env.local`. A local configuration was prepared during implementation with an unprinted random session secret; the Groq key is still blank unless Ayham supplies it. Add `GROQ_API_KEY` locally (never to Git), leaving `AI_PROVIDER=groq` and `AI_MODEL=openai/gpt-oss-120b`. Open http://localhost:3000. App data persists in `.data/postgres`; the guest cookie determines workspace access. Without an AI key, source/notebook functions work and the UI clearly states that generation is unavailable.

PowerShell may block `npm.ps1`; use `npm.cmd` as shown. Do not weaken the execution policy. On macOS/Linux, ordinary `npm` is sufficient.

## Provision the free deployment

1. Create/use a **Neon Free** project in an appropriate region. Obtain its pooled PostgreSQL URL with TLS (`sslmode=require`). Keep it in the deployment secret store. Do not paste it into Git or screenshots.
2. Publish this branch to a GitHub repository Ayham owns. Choose visibility suitable for the employer. The current local branch is `feat/sourcenote-implementation`; no remote is configured yet.
3. Import the repository into a **personal Vercel Hobby** project using the Next.js preset and Node 24. Hobby is for eligible personal/non-commercial work. Connect the prepared branch or merge it into the intended deployment branch first.
4. Set the production variables below. For a preview use a separate database branch and the preview's exact origin; do not point a preview at private production data by accident.
5. Deploy. Schema migration 001 is idempotent and guarded by a PostgreSQL advisory transaction lock on initial connection. Alternatively apply `migrations/001_initial.sql` through Neon SQL Editor before the first request. Future migrations need explicit release ordering/version handling rather than editing applied schema in place.
6. Open `/api/health`; expect `{"status":"ok","version":"1.0.0"}`. This checks DB reachability without model usage. Run the smoke test below with a real free-provider key.

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Neon pooled TLS connection URL |
| `AI_PROVIDER` | `groq` |
| `AI_MODEL` | `openai/gpt-oss-120b` |
| `GROQ_API_KEY` | Free-tier account key; server secret |
| `APP_ORIGIN` | Exact deployed HTTPS origin, no trailing slash |
| `SESSION_SECRET` | Random string ≥32 characters; generate locally without logging it |
| `GLOBAL_DAILY_TOKEN_LIMIT` | `100000` (conservative shared demo cap) |
| `GLOBAL_STORAGE_BYTES` | `52428800` (50 MiB originals) |
| `SESSION_DAILY_REQUESTS` | `30` |
| `AI_TEST_MODE` | **Unset or false**, production explicitly rejects true |

Do not put secrets in `NEXT_PUBLIC_*` variables. `ALLOW_LOCAL_DATABASE=true` is only an explicit single-process local production-build smoke-test escape hatch; never use PGlite on an ephemeral serverless filesystem. `DATA_DIR` is for local development, not Vercel durability.

## Live smoke test

- Open the deployment in a clean browser. Create a notebook; upload a real short PDF and pasted text. Verify readiness and an actual extracted page.
- Ask a source-supported question; open its citation and compare wording with the original. Confirm the provider is real and no test banner is visible.
- Ask for tomorrow's weather or another unsupported fact; expect a limitation. Exclude one source and confirm it is absent from new evidence.
- Save a note, generate a summary, reload and reopen both. A free Groq minute limit may require waiting; do not bypass it.
- Open an independent browser context; manually supplying private notebook/source/citation IDs must fail.
- Try an unsupported or scanned file, then recover with a text PDF. Delete a source and verify dependent outputs become unavailable.
- Run `npm.cmd run evaluate` with the local real-provider key. Review `docs/evaluation-results.json` semantically; the script's schema validation is not a factual-support grade.

Record the deployed URL, provider/model, date, inputs and observed results in testing/delivery notes before recording the Loom.

An automated API smoke helper is also available: set `SMOKE_URL` to the deployment origin and run `npm.cmd run smoke`. Add `-- --ai` to require a real-provider answer/citation; otherwise the script explicitly skips AI. It creates and cleans up its own isolated notebook. Local production startup for this check was rejected by automatic approval review in this session, so no production HTTP smoke result is claimed.

## Operations and rollback

Inspect platform errors and operation/quota state, not raw prompts or source documents. 429 errors may originate from SourceNote or the provider; the UI asks users to wait or narrow input. Failed ingestions expose retry; source removal frees original storage. Unknown provider usage remains reserved for the UTC day, preventing uncertain retry spend from disappearing. Session expiration is absolute, not sliding.

Maintenance is request-triggered on bootstrap, not an always-on worker. It marks expired leases failed, clears old quota rows and purges up to ten expired owners per run. Without traffic, physical cleanup is delayed; authorization still denies expired workspaces. Backups/restore are not configured or tested. Verify the Neon plan's actual recovery settings separately before relying on them.

Rollback a bad app release using Vercel's prior deployment only while the schema remains backward compatible. Migration 001 is initial schema creation; no destructive down migration is included. Stop new work and export data before any incompatible schema rollback. No exact recovery time is promised.

The Dockerfile provides an alternative portable Node build with the same DB and environment contract. Docker was not installed in this environment, so the container build itself remains unverified. Do not deploy a paid host under the zero-spend constraint.
