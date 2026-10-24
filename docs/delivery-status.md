# Recruitment delivery audit

Updated 2026-10-24. This is an evidence-based status, not a completed-submission claim.

| Deliverable | Status | Evidence / next action |
| --- | --- | --- |
| New implementation branch | Complete | `feat/sourcenote-implementation` from the architecture baseline on `cleanup/keep-message-prompt` |
| NotebookLM-inspired application | Implemented; production server tested with Neon and real Groq | Notebook/source CRUD, real PDF/text extraction, selected-source chat, citations, overview, quiz, notes, export, responsive UI, guest persistence and server quotas |
| Editable architecture | Complete artifacts | Four native draw.io pages, standalone XML, generator, validator, current architecture and decisions; actual editor check remains manual |
| Automated verification | Complete local checks | Type/lint, service/provider tests, real PDF and desktop/mobile browser workflow; see testing.md |
| Real free AI workflow | Production HTTP smoke passed; evaluation limitation recorded | Real Groq answer cited the uploaded PDF; five of six evaluation responses passed validation and semantic inspection; one was safely rejected for invalid evidence |
| Neon Free database | Connected and migrated | Existing SourceNote project in Frankfurt; plan `free`, PostgreSQL 18.6, schemas 1 and 2; pooled app and direct migration URLs configured without printing credentials |
| GitHub repository link | Published; CI verified | https://github.com/jadomer98/sourcenote — `main` and implementation branch pushed; Linux checks/build/browser tests pass |
| Live deployment link | Published and tested | https://sourcenote-mu.vercel.app — Vercel Hobby, Node 24, Frankfurt functions, actual Neon/Groq; anonymous access and real PDF-to-citation smoke pass |
| Loom ≤10 minutes | Recording still required | German 4:30 script ready, fitting Loom Starter's free five-minute limit; no recording link is claimed |
| German email reply | Two verified links filled | Loom placeholder remains; email not sent |

Zero-spend constraint: no paid service, subscription, provider fallback or billing upgrade was used. The employer's entire submission is not complete until the GitHub, public deployment and recording links exist.

## Studio extension rollout

- Preserved `feat/forest-paper-colors` at `ea161a932eeeea70156b8d535f932476d614812c`; created and pushed `feat/studio-learning-usage` before editing.
- Added source-cited flashcards, interactive scored quizzes, collapsible mindmaps with SVG, reports, data tables with CSV, and a separate private owner usage view.
- Local type/lint, 31 backend/provider tests and 10 desktop/mobile browser tests passed. Real Groq and Neon test-branch walkthrough passed for all five formats and owner usage.
- Production migration passed with schema versions 1 and 2. The implementation commit `9fa8a34` deployed through Git to Vercel production as `dpl_6fQVN7Jfo439cuTMnjdmfJm3Z5Sv` (READY). Both [main CI](https://github.com/jadomer98/sourcenote/actions/runs/40107234663) and [feature CI](https://github.com/jadomer98/sourcenote/actions/runs/40107232618) passed Linux checks, build and all 10 browser tests.
- Public real-provider verification passed for all five formats, their interactive controls, saved citations, CSV/SVG exports, owner-only usage and mobile layout. Deleting the synthetic notebook retained measured token history. See [machine-readable record](studio-live-verification.json) and `studio-*.png` screenshots. No provider or owner credentials appear in these artifacts.
- Vercel API reconfirmed team `jad-9443` is on `hobby`. No paid resource or fallback was added. Owner access is a server-only Vercel secret; the local copy is in ignored `.data/owner-access.txt`, outside Git.
- Loom recording and email submission remain separate and unfinished.

## Flexible layout iteration

Preserved `feat/studio-learning-usage` at `d76f7e0860007403d1b7c59509e4b1fe535ee992`. Created and pushed `feat/flexible-panels-colors` before editing. Added a five-accent palette, resizable/collapsible navigation, independent Sources/Chat/Studio resizing and visibility, focus/restore, all-closed recovery and browser-local layout persistence. Mobile tabs and the navigation drawer retain their separate layout.

Local verification: 35 service/provider/layout tests, 16 browser tests (two desktop-only project instances skipped on mobile), targeted palette contrast checks and breakpoint fitting. Production build passed. Both [main CI](https://github.com/jadomer98/sourcenote/actions/runs/40110668820) and [feature CI](https://github.com/jadomer98/sourcenote/actions/runs/40110667187) passed. Implementation commit `859b349` deployed as `dpl_CRMhK5te67PtsVQbwGn8A6PL54Nr` (READY).

Public verification passed navigation and panel resizing, focus/restore, full-close recovery, draft preservation, reload persistence, mobile tabs/drawer and usage access. There were no page errors, page-level overflow or AI requests. Only synthetic QA notebooks were removed; the user's notebooks were untouched. See the [verification record](design/flexible-live-verification.json) and `flexible-*-live.png` screenshots. No backend schema, provider, credentials or paid services changed. The original branch still points to `d76f7e0` on GitHub.
