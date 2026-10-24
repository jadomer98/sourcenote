# Studio learning tools and honest free-tier usage

SourceNote extends the existing Groq text model rather than adding paid media providers. Each Studio creation is one bounded generation. Reopening content, practicing, scoring, collapsing a map and exporting run locally without additional model calls.

| Tool | Complete workflow |
| --- | --- |
| Lernkarten | Click anywhere on a card (or Enter/Space) to flip it. Reveal, self-assess with **Falsch**/**Richtig**, and advance. Counts reflect one current rating per card; revising a rating replaces it. Position and ratings persist in this browser; reset clears both. Citations are separate controls and can return to the card. Existing learned marks become correct ratings. |
| Wissenscheck | Generate three questions with four choices each; answer once per question, see feedback and evidence, receive a score, revisit questions and restart. Progress persists in the same browser. Older text-only quizzes still display normally. |
| Mindmap | Generate a validated rooted hierarchy, expand/collapse branches, open node citations, export a standalone SVG and Markdown. |
| Bericht | Generate a cited briefing with findings and open questions, retain it in Studio, export Markdown. |
| Datentabelle | Extract a rectangular table, inspect each row's citations, export UTF-8 CSV including source names, or Markdown. CSV cells are escaped against spreadsheet formula injection. |

Select the relevant sources, open Studio and choose a tool. Results open immediately and remain in the saved-content list. Every new format inherits ownership, idempotency, quotas, source-change checks and deletion invalidation. The model's schema is strict, and the server separately validates content lengths, references, quiz choices, table dimensions and acyclic map structure. Semantic accuracy still requires checking the source.

## Usage dashboard

Use **Nutzung & Limits** in the sidebar or the daily counter in the top bar. Reading or refreshing the dashboard does not call Groq.

- Default view: only the current guest workspace's counters and recent operation metadata.
- Owner view: all project usage, the configured daily protection budget and the latest Groq response-header snapshot. A separate `USAGE_ADMIN_TOKEN` of at least 32 characters is required. It is compared through constant-time digests; never reuse the AI key. Requests also require the existing session, Origin and CSRF checks. The browser keeps the code in memory only until the dialog closes; there is no token in URLs or local storage.
- Real `prompt_tokens`, `completion_tokens` and `total_tokens` are captured before output validation. A rejected or truncated answer can therefore still count. Network failures with no token report are marked unknown, not zero. The conservative app budget retains reservations for uncertain usage.
- An independent SQL ledger survives notebook deletion. It contains no documents, questions, answers or credentials. Owner references become null when the seven-day guest expires; aggregate usage remains. Existing surviving operation totals are backfilled once, but already-deleted historical requests cannot be recovered. Legacy records may lack input/output breakdowns.
- Today uses **UTC**. The measured token sum, app budget reservations and provider availability are deliberately different numbers. Input/output counts may be partial for legacy records. Provider headers describe **requests per day** and **tokens per minute**, not daily tokens remaining. Snapshots are timestamped, not described as live credit balances. Calls from other apps in the same organization are not in SourceNote's ledger.
- Account-specific Groq limits and Neon/Vercel account consumption must be checked in their own consoles. No fabricated Neon/Vercel meters, currency balance or promise of unlimited free use.

For this local installation, the owner code is saved only in ignored `.data/owner-access.txt` and `.env.local`. Copy it into the dashboard's **Eigentümer-Zugangscode** field. The production environment stores the same code as a server-only Vercel secret. Neither file is committed. For another deployment, generate your own code and set it in both local and hosting environment variables.

## Compatibility and rollout

Migration `002_studio_usage.sql` adds new allowed kinds and the usage ledger. It is additive and was tested against an isolated Neon branch copied from production. Migration scripts apply SQL files in order and use the direct connection; application traffic continues through the existing pooled `pg` driver. The preceding release remains compatible with the extended schema. Its UI will not expose the new tools.

Starting Git branch: `feat/forest-paper-colors` at `ea161a932eeeea70156b8d535f932476d614812c` (preserved). Feature branch: `feat/studio-learning-usage`. Production deploys from `main`.

Audio/video generation and AI image generation were not added. The implemented tools use the existing free text-model route. A root diagram stays simple and bounded rather than requiring a rendering service.

## Provider research

Checked 2026-10-24 against primary documentation. Groq supports strict JSON-schema outputs for the existing GPT-OSS model. Quotas apply to the organization and can differ by account; a 429 must be respected. The implementation uses reported usage and a whitelist of response headers, never a client-side provider key. [Structured outputs](https://console.groq.com/docs/structured-outputs), [rate limits and header semantics](https://console.groq.com/docs/rate-limits), [API response usage](https://console.groq.com/docs/api-reference).

See [test evidence](testing.md) and the [real-provider verification record](studio-live-verification.json). The Loom recording is still a separate, unfinished submission deliverable.
