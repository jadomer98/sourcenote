# Deployment and local operation

The live app is **https://sourcenote-mu.vercel.app**; source is **https://github.com/jadomer98/sourcenote**. On 2026-10-24, Vercel team `jad-9443` reported Hobby, Neon reported Free, and actual Groq generation passed on the public deployment. Functions and Neon are in Frankfurt; Vercel's build ran in its default US build region. Use free plans only, no Pro trial, paid domain or paid provider fallback. See [research and current limits](free-tier-research.md).

## Local start (Windows)

Prerequisites: Node.js 24.x, Git. Python is only needed to regenerate architecture diagrams. No local PostgreSQL or Docker installation is required.

```powershell
npm.cmd ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Do not overwrite an existing configured `.env.local`: it now contains the supplied Groq key, a random session secret and the Neon URLs. Keep `AI_PROVIDER=groq` and `AI_MODEL=openai/gpt-oss-120b`. Open http://localhost:3000. With `DATABASE_URL`, data persists in Neon; without it, development uses `.data/postgres`. The guest cookie determines workspace access. Without an AI key, source/notebook functions work and the UI clearly states that generation is unavailable.

PowerShell may block `npm.ps1`; use `npm.cmd` as shown. Do not weaken the execution policy. On macOS/Linux, ordinary `npm` is sufficient.

## Provision the free deployment

1. Use the existing **Neon Free** project `SourceNote` (`cool-salad-21039999`), branch `production`, region `aws-eu-central-1`. The CLI has pulled pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` into ignored `.env.local`. Keep both in secret stores; do not paste them into Git or screenshots.
2. The public repository `jadomer98/sourcenote` now contains `main` and `feat/sourcenote-implementation`. Keep Git changes on the implementation branch and update `main` deliberately for production.
3. Vercel project `sourcenote` is linked to that GitHub repository and deploys production from `main`. Next.js, Node `24.x`, `npm ci`, and `npm run build` are configured. Hobby is for eligible personal/non-commercial work.
4. Production variables below are configured. Secret values were sent through stdin, not command arguments or logs. Other branches are excluded from automatic deployments in `vercel.json`; previews need their own isolated database and exact origin before enabling them.
5. Before the app release, run `npm.cmd run db:migrate` with the target database's **direct** URL. Initial migration 001 is idempotent and protected by an advisory transaction lock. App requests verify schema version 1 and use the **pooled** URL; they do not perform hosted DDL. Future migrations need explicit release ordering/version handling rather than editing applied schema in place.
6. Open `/api/health`; expect `{"status":"ok","version":"1.0.0"}`. This checks DB reachability without model usage. Run the smoke test below with a real free-provider key.

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Neon pooled TLS connection URL |
| `DATABASE_URL_UNPOOLED` | Neon direct TLS URL for migrations; not needed in the Vercel runtime after migration |
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

An automated API smoke helper is available: set `SMOKE_URL=https://sourcenote-mu.vercel.app` and run `npm.cmd run smoke -- --ai --pdf`. This requires a real-provider answer/citation and checks a generated binary PDF, byte-exact original download, saved note, source deletion redaction and cross-owner rejection. Omitting `--ai` explicitly skips AI; omitting `--pdf` uses pasted text only. It cleans up its isolated notebook. It passed on both the local production server and the actual public Vercel deployment on 2026-10-24. A separate public browser check passed real summary generation, saved-note reload and mobile Studio.

## Neon CLI setup and production start

The installed Neon agent skills recommend preserving `pg` for Next.js on Vercel Fluid compute. The shared pool is registered with `attachDatabasePool` from `@vercel/functions` and uses a five-second idle timeout. [Driver guidance](https://neon.com/docs/connect/choose-connection) · [Vercel pool lifecycle](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#attachdatabasepool).

```powershell
neon.cmd init -y --org-id org-jolly-voice-65504856 --project-id cool-salad-21039999 --branch production --services postgres
neon.cmd deploy
npm.cmd run db:migrate
npm.cmd run build
npm.cmd run start
# In another terminal:
npm.cmd run smoke -- --ai --pdf
```

The project is already linked locally; `.neon` and `.env.local` stay ignored. Another checkout must link itself explicitly. `neon.ts` enables no optional services: Postgres is implicit, Auth is false, and there are no buckets, functions, realtime subscriptions or AI Gateway calls. `neon deploy` reported no policy changes and pulled three Neon variables while preserving the Groq configuration. The account API reported plan `free`.

`npm run start` loads the root environment, copies static assets and starts Next's generated standalone server. Docker starts that server directly with its packaged assets and host-supplied environment. Routine Vitest and Playwright runs explicitly clear both hosted database URLs; deterministic browser data stays in `.data/e2e`.

## Operations and rollback

Inspect platform errors and operation/quota state, not raw prompts or source documents. 429 errors may originate from SourceNote or the provider; the UI asks users to wait or narrow input. Failed ingestions expose retry; source removal frees original storage. Unknown provider usage remains reserved for the UTC day, preventing uncertain retry spend from disappearing. Session expiration is absolute, not sliding.

Maintenance is request-triggered on bootstrap, not an always-on worker. It marks expired leases failed, clears old quota rows and purges up to ten expired owners per run. Without traffic, physical cleanup is delayed; authorization still denies expired workspaces. Backups/restore are not configured or tested. Verify the Neon plan's actual recovery settings separately before relying on them.

Rollback a bad app release using Vercel's prior deployment only while the schema remains backward compatible. Migration 001 is initial schema creation; no destructive down migration is included. Stop new work and export data before any incompatible schema rollback. No exact recovery time is promised.

The Dockerfile provides an alternative portable Node build with the same DB and environment contract. Docker was not installed in this environment, so the container build itself remains unverified. Do not deploy a paid host under the zero-spend constraint.
