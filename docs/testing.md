# Verification evidence

Latest execution: **2026-10-24**, Windows, Node 24.19.0; GitHub CI on Ubuntu/Node 24; public Vercel production on Node 24. The live deployment is **https://sourcenote-mu.vercel.app**, using actual Neon and Groq services.

| Command | Result |
| --- | --- |
| `npm.cmd run check` | Type generation, TypeScript, ESLint and all 35 service/provider/layout tests passed |
| `npm.cmd run test:e2e` | 18 desktop/mobile Chromium tests passed; two redundant desktop-only checks skipped on mobile; clearly labeled deterministic test provider |
| `npm.cmd run build` | Optimized Next.js compilation and all static/API routes passed |
| `neon.cmd deploy` | Existing production policy matched; Postgres-only use; 3 Neon variables pulled into ignored `.env.local` |
| `npm.cmd run db:migrate` | Neon direct-connection migrations passed; schema versions 1 and 2 |
| `npm.cmd run start` then `npm.cmd run smoke -- --ai --pdf` | Standalone production HTTP workflow passed against actual Neon/Groq |
| Public `SMOKE_URL=https://sourcenote-mu.vercel.app`, `npm.cmd run smoke -- --ai --pdf` | All PDF, real AI/citation, note, deletion and access-isolation checks passed on Vercel |
| Real-provider public browser check | Desktop demo, real answer/citation, note, summary, reload and mobile Studio passed; `live-*.png` screenshots inspected |
| GitHub Actions | Linux check/build and all 18 browser tests passed; [verified dark-workspace main run](https://github.com/jadomer98/sourcenote/actions/runs/40113067620) |
| `npm.cmd audit --omit=dev --audit-level=high` | 0 reported production dependency vulnerabilities |
| `python scripts/validate_architecture.py` (2026-10-23) | Four native pages and equivalent standalone XML passed structural checks |

Backend tests cover actual PDF parsing/page metadata, ingestion, owner isolation, foreign/excluded sources, idempotency, missing/fabricated citations, honest limitations, ambiguous timeout without repeated provider calls, deletion races, quotas, failed extraction retry, original deletion and historical-output redaction. Provider tests inspect outbound schema, rate limits, truncation, optional Cloudflare format and quotation validation.

Routine browser tests exercise notebook creation, pasted/binary PDF ingestion, questions, citations/pages, notes, summary, reload, unsupported questions, source selection, deletion, timeout recovery, file errors, cross-context access and CSRF rejection on desktop/mobile. The original screenshots show test mode; the separate `live-*.png` screenshots come from the public deployment with real Groq and no test mode. Vitest uses memory; Playwright uses `.data/e2e`. Both explicitly clear hosted database URLs. Routine tests spend no model tokens. Avoid concurrent Next dev/build processes because they share `.next` state.

## Neon and real-provider proof

The existing SourceNote project `cool-salad-21039999`, production branch `br-green-pond-ba3zfooq`, is in AWS Frankfurt. The account API reports plan `free`; no billing upgrade was requested. Only Postgres was wired into the app. Env pull preserved the Groq key. App traffic uses pooled `DATABASE_URL`; migrations use `DATABASE_URL_UNPOOLED`. Client inspection confirmed encrypted, certificate-authorized TLS to the pooled endpoint.

Selected actual output, with secrets omitted:

```text
neon deploy:
No changes — branch production already matches the policy.
Utilized services: Postgres
Pulled 3 Neon variables into .env.local

npm run db:migrate:
PostgreSQL migration applied using direct connection. Schema versions: 1.

Read-only database inspection:
PASS: Neon pooled application connection, verified client TLS, direct migration URL configured, Groq key preserved.
{"server_version":"18.6 (fd34222)","tables":12,"schema_version":1}

npm run smoke -- --ai --pdf:
PASS: binary PDF upload, page extraction and byte-exact original download.
Live answer: Das genehmigte Budget für das Projekt Morgenlicht beträgt 5.000 Euro.
PASS: real-provider answer, stored citation, persisted note and deletion redaction.
PASS: HTTP health, isolated session, notebook, source, preview and cross-owner rejection.
```

The real answer correctly reported the synthetic source's EUR 5,000 budget and cited its stored PDF excerpt. This was inspected against the fixture. Smoke notebooks are deleted in `finally`.

A separate synthetic notebook/source survived a full production-server stop, rebuild and restart. The same private session could reopen its stored text afterward; the verification notebook and ignored session checkpoint were then deleted. The production page and its JavaScript asset also returned HTTP 200.

```text
PASS: Neon notebook and source persisted across full server stop, rebuild and restart.
PASS: standalone production page and JavaScript assets return HTTP 200.
```

## Forest and paper palette

The forest/paper color update is on `feat/forest-paper-colors`, based on the preserved `feat/sourcenote-implementation` commit `28adc4f`. Type/lint, all 24 backend/provider tests, all 8 desktop/mobile browser tests and production compilation passed. The actual public UI passed real Groq answer/citation, note, summary, reload and mobile Studio checks with the forest palette; the current `live-*.png` screenshots show this run. [Palette research, measured contrast and rollback](design/color-research.md).

## Bounded Groq evaluation

`npm.cmd run evaluate` runs six synthetic cases against a real provider. [Recorded responses](evaluation-results.json) include evidence-ID-to-source mappings for successful cases. Five responses passed structural validation and inspection against the fixtures: budget breakdown, source exclusion, conflicting approval status, outside-knowledge refusal and prompt-injection handling. The financial payback case was **rejected for invalid evidence**; it is not counted as a successful answer or refusal. The application withheld it. This sample does not establish general factual accuracy or reliability.

## Corrections and remaining gaps

- The first generated smoke PDF drew text beyond its page edge. Resizing the fixture fixed the check; the full workflow then passed.
- An initial TLS probe inspected the database-side hop. The corrected check verifies the client's encrypted, certificate-authorized socket.
- A CLI organization-detail endpoint returned 404; `neon orgs list` confirmed this organization's Free plan.
- `pg` emits a future SSL-mode semantics warning for Neon's `sslmode=require`; current certificate verification was confirmed.
- The Vercel helper initially introduced an outdated transitive Zod pin. A scoped npm override reuses the app's patched Zod 4 version; the dependency audit now reports 0 vulnerabilities.
- Vercel's actual Linux PDF/runtime bundle passed the binary PDF smoke test. The first verified deployment is `dpl_CVFW6sF4gTqfGbsLq93wMGha1vhq`, source commit `391771b`, production region `fra1`, Node `24.x`. Anonymous health returned HTTP 200 with `{"status":"ok","version":"1.0.0"}`; no Vercel login was needed on the production domain.
- The first public UI check used an incorrect test locator, “Zusammenfassung”; using the actual “Quellenüberblick” control completed the real summary workflow. No app change was needed.
- Cloudflare has boundary tests but was not called live. Docker remains unbuilt because Docker is unavailable.
- diagrams.net editor rendering remains a manual check; native XML and approximate previews were checked earlier.
- No external penetration test, formal accessibility audit, load benchmark, backup/restore test or production-readiness claim.

## Studio and usage verification (2026-10-24)

The expanded suite includes strict structured-content validation, invalid evidence, quiz choices, acyclic mind maps, rectangular tables, CSV formula escaping, idempotent usage accounting, owner authorization, and usage retained after source/notebook deletion. Provider telemetry is tested before truncated-output rejection.

All five formats were generated with actual Groq through an isolated Neon branch copied from production. Browser checks exercised card reveal/learning marks, scored quiz answers, SVG/CSV downloads, report rendering, real citations, private owner metrics, mobile layout, absence of page errors and ledger survival after deleting the synthetic notebook. Minute-limit waits were respected. A shortcut-label encoding error found by this check was corrected before publication.

The first Neon test-branch request attempted a custom suspend timeout unsupported on Free; retrying with default suspend settings succeeded without an upgrade. Migration 002 applied on the isolated branch and the temporary branch was deleted afterwards. No production credentials were overwritten for test isolation.

The separate `studio-live-verification.json` records the latest real-provider run and its target. Screenshots `studio-*.png` use real generation; the original `home-*`/`workspace-*` screenshots remain clearly marked deterministic test-provider captures. Owner screenshots contain counters only, never the owner code or API key. The existing original-PDF production smoke remains relevant; publication checks for the extension are recorded in the delivery audit.

## Flexible workspace verification (2026-10-24)

The layout iteration adds four preference/size-bound tests and browser coverage for pointer resizing, keyboard resizing, sidebar collapse and usable icon navigation, reload persistence, focus/restore, closing all three panes, reopening panes without losing an in-progress draft, and the mobile navigation drawer. The viewport matrix covers 801, 900, 1024, 1280, 1600 and 1920 pixels with no page-level horizontal overflow. Tool-label contrast is checked at 4.5:1 or greater across five distinct accent families. This is a targeted color check, not a formal accessibility audit.

All 16 browser cases passed locally; the two skipped project instances duplicate desktop color/matrix checks on mobile, whose interactions have separate coverage. Existing source-to-citation and Studio/usage journeys still pass. No AI tokens are consumed by these deterministic tests or the display controls. [Design and keyboard details](design/flexible-workspace.md).

The public deployment also passed resizing (pointer and keyboard), visibility/reopening, focus, retained draft, reload persistence, usage access, desktop overflow checks and mobile navigation/recovery with zero AI requests. See [public layout verification](design/flexible-live-verification.json). Screenshots `flexible-*-live.png` were captured from the public domain with no test mode; the other layout screenshots retain their test-mode banner. [Linux verification for this implementation](https://github.com/jadomer98/sourcenote/actions/runs/40110668820) passed checks, build and the full browser suite.

## Dark workspace redesign

The new `feat/dark-notebook-workspace` branch preserves `feat/flexible-panels-colors` at `45c67c9`. A compact header, initially collapsed navigation, black chat canvas, charcoal panels and pinned Studio tools replace the preceding layout. Panel controls and persisted data remain available. [Design and rollback details](design/dark-workspace.md).

Local type generation, TypeScript, ESLint and all 35 service/provider/layout tests pass. The optimized production build passes. All 18 desktop/mobile browser cases pass; two duplicate desktop-only checks are skipped in the mobile project. New checks measure usable space at 1280×720, composer size and multiline growth, answer readability, pinned tools after four generated artifacts, mobile rename and page fitting. Existing source/citation, learning tools, usage, resizing, hiding, focus and persistence checks still pass. The `dark-workspace-laptop.png` and `dark-workspace-mobile.png` captures use the explicitly labeled deterministic test provider.

The public deployment passed a real Groq answer with stored citations, dark source preview, saved note, reload persistence, usage view, navigation expand/collapse, pane focus/restore, close/reopen, phone tabs and rename. At 1280×720, measured panel height is 638 px, reading area height 494 px, and the initial composer height 64 px. Checked widths 801, 900, 1024, 1280, 1600 and 1920 fit without page overflow. There were no browser page errors. Only the synthetic QA notebook was deleted. [Live verification record](design/dark-live-verification.json); screenshots `dark-*-live.png` show the actual public deployment with test mode disabled. No dependency, schema, provider or paid service changed.

Both [main CI](https://github.com/jadomer98/sourcenote/actions/runs/40113067620) and [feature CI](https://github.com/jadomer98/sourcenote/actions/runs/40113065328) passed checks, build and the full browser suite on Linux for implementation `b2cd012`.
