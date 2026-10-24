# HTTP boundary

All private operations resolve a server-issued guest session and enforce owner/notebook scope. UUID syntax and body shape use Zod. Private responses use `Cache-Control: no-store`. This is a compact contract for the implemented REST boundary; source of truth is `src/app/api/[...path]/route.ts`.

Start with `GET /api/bootstrap`: returns `{csrf,expiresAt,aiReady,provider,model,notebooks,usage,requestLimit,testMode}` and sets an HttpOnly session cookie when needed. Browser mutations must send the cookie, exact `Origin: APP_ORIGIN`, and `x-csrf-token` from bootstrap. CSRF tokens are session-specific; a user-supplied notebook/source ID is never authorization.

| Method / path (under `/api`) | Input | Result / important behavior |
| --- | --- | --- |
| GET `health` | None | `{status:"ok",version:"1.0.0"}` after DB probe; no AI request |
| GET `notebooks` | Session | `{notebooks:[...]}` owned records only |
| POST `notebooks` | `{title,emoji?,color?}` | `{id}`; title 1–100 chars, allow-listed styles, max 3 notebooks |
| GET `notebooks/:id` | Owned UUID | `{notebook,sources,entries,operations}`; completed output and pending/failed operation state |
| PATCH `notebooks/:id` | `{title}` | `{ok:true}` after ownership and title validation |
| DELETE `notebooks/:id` | Owned UUID | `{ok:true}`; clear content and dependent data |
| POST `demo` | No body | `{id}`; copy two CC0 sources into an isolated notebook, subject to normal caps |
| POST `notebooks/:id/sources` | Multipart: `key` UUID, `title`, and `file` or `text` | `{id}` after synchronous ingestion attempt; read source status for ready/failed. Max 4 MiB; PDF signature or UTF-8 validation; retained failed source may be retried |
| GET `notebooks/:id/sources/:source` | Owned ready source | `{source,chunks}`; chunks contain stored text/reliable page metadata |
| GET `notebooks/:id/sources/:source/download` | Owned ready source | Original bytes as attachment; no direct DB/storage credentials |
| DELETE `notebooks/:id/sources/:source` | Owned source | `{ok:true}`; purge blob/chunks, invalidate evidence and redact dependent outputs |
| POST `notebooks/:id/sources/:source/retry` | Failed source | `{ok:true}` after new fenced parsing attempt; no duplicate chunks |
| POST `notebooks/:id/generate` | `{sourceIds,question,kind,key}` | `{id,state}` for persisted operation; `kind=answer|summary|quiz`. Exact source selection; standalone question ≤1,500 chars. Replaying running operation returns 202, completed returns 200 |
| GET `notebooks/:id/citations/:entry/:evidence` | Valid owned entry/reference UUIDs | `{text,page_no,char_start,source_id,title}`; only if citation membership and live chunk exist |
| POST `notebooks/:id/notes` | `{entryId}` | `{id}` for saved answer/summary/quiz with original citation provenance; max 30 notes |
| DELETE `notebooks/:id/entries/:entry` | Owned note/summary/quiz | `{ok:true}`; ordinary question/answer history cannot be deleted through this endpoint |

No unchecked model tokens are streamed. Generation waits for schema/reference/quote validation and durable commit. To recover after reload, GET the workspace and poll while an operation is running. A failed request keeps its safe error; an explicit new attempt uses a new UUID key. Reusing a key with different input returns 409.

Errors are `{error: safeGermanMessage, code: stableCode}`: 400 invalid input/unsupported file; 401 missing/expired session; 403 Origin/CSRF; 404 missing or unauthorized resource; 409 selection/idempotency/state conflict; 413 upload/context too large; 429 application/provider quota; 502 invalid/provider output; 503 missing provider/configuration; 504 provider timeout/network; 500 unexpected internal error with no stack or private text returned. Clients should show the message and allow the documented recovery; they must not silently retry uncertain generation.

## Studio and usage extension

`POST /api/notebooks/:id/generate` also accepts `kind=flashcards|mindmap|report|table`; `quiz` now creates structured multiple-choice questions. Bodies retain blocks and add validated format-specific metadata. Existing text-only artifacts remain readable. Entry deletion accepts the new Studio kinds.

- `GET /api/usage`: guest-scoped measured usage, request counters, limits and recent metadata. No account-wide snapshot.
- `POST /api/usage/owner`: project-wide aggregates and latest provider-header snapshot. Requires `x-usage-token` matching the separate `USAGE_ADMIN_TOKEN`, plus existing Origin/CSRF protection. Missing or invalid owner code returns 403. Responses are `no-store`. No prompt text, document content or credential is returned.

See [data semantics and owner access](studio-and-usage.md).
