# Recruitment delivery audit

Updated 2026-10-24. This is an evidence-based status, not a completed-submission claim.

| Deliverable | Status | Evidence / next action |
| --- | --- | --- |
| New implementation branch | Complete | `feat/sourcenote-implementation` from the architecture baseline on `cleanup/keep-message-prompt` |
| NotebookLM-inspired application | Implemented; production server tested with Neon and real Groq | Notebook/source CRUD, real PDF/text extraction, selected-source chat, citations, overview, quiz, notes, export, responsive UI, guest persistence and server quotas |
| Editable architecture | Complete artifacts | Four native draw.io pages, standalone XML, generator, validator, current architecture and decisions; actual editor check remains manual |
| Automated verification | Complete local checks | Type/lint, service/provider tests, real PDF and desktop/mobile browser workflow; see testing.md |
| Real free AI workflow | Production HTTP smoke passed; evaluation limitation recorded | Real Groq answer cited the uploaded PDF; five of six evaluation responses passed validation and semantic inspection; one was safely rejected for invalid evidence |
| Neon Free database | Connected and migrated | Existing SourceNote project in Frankfurt; plan `free`, PostgreSQL 18.6, schema 1; pooled app and direct migration URLs configured without printing credentials |
| GitHub repository link | Published; CI verified | https://github.com/jadomer98/sourcenote — `main` and implementation branch pushed; Linux checks/build/browser tests pass |
| Live deployment link | Published and tested | https://sourcenote-mu.vercel.app — Vercel Hobby, Node 24, Frankfurt functions, actual Neon/Groq; anonymous access and real PDF-to-citation smoke pass |
| Loom ≤10 minutes | Recording still required | German 4:30 script ready, fitting Loom Starter's free five-minute limit; no recording link is claimed |
| German email reply | Two verified links filled | Loom placeholder remains; email not sent |

Zero-spend constraint: no paid service, subscription, provider fallback or billing upgrade was used. The employer's entire submission is not complete until the GitHub, public deployment and recording links exist.

## Studio extension rollout

- Preserved `feat/forest-paper-colors` at `ea161a932eeeea70156b8d535f932476d614812c`; created and pushed `feat/studio-learning-usage` before editing.
- Added source-cited flashcards, interactive scored quizzes, collapsible mindmaps with SVG, reports, data tables with CSV, and a separate private owner usage view.
- Local type/lint, 31 backend/provider tests and 10 desktop/mobile browser tests passed. Real Groq and Neon test-branch walkthrough passed for all five formats and owner usage.
- Production migration/deployment and public extension verification are the final rollout steps; the following publication entry will record their outcome.
- Loom recording and email submission remain separate and unfinished.
