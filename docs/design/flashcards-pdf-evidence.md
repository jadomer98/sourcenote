# Flashcards, original PDF evidence and free-tier pacing

Starting branch `feat/dark-notebook-workspace` remains at `0ba661bfe9925dce3903dd465bb5b0bfba57dda4`. The new branch `feat/flashcards-pdf-evidence` was created and pushed before edits. No schema migration, dependency, provider switch, billing upgrade or paid service is needed.

## Flashcards

The complete card is a native button: click its padding, question or answer, or press Enter/Space, to flip it. Citation controls remain outside the button, so opening evidence does not accidentally flip the card. Reveal the answer, then choose **Falsch** or **Richtig**. Each card has one current self-assessment; revising it replaces its previous rating. Grading advances to the next card except on the last card. Arrows revisit any card. Counts, card position and progress persist in this browser; reset clears both ratings and position. Historic learned marks become correct ratings. This is self-assessment, not an AI judgment of the user's answer. Practicing and grading make no AI calls.

## Original PDF citations

PDF.js renders the private original bytes on a canvas. A selectable text layer maps the extraction order back to the page, preserving its fonts, graphics and layout. Page selection, previous/next, zoom, **Zum Beleg**, authorized download and **Textauszug** remain available. Jumping to a highlight scrolls only the page viewport, keeping the source controls visible. Only one page is rendered at a time; canvas pixel count is bounded. The worker is bundled on the same origin, with no external viewer, conversion service or CDN.

New provider schemas require a short verbatim source quotation for each evidence ID. The server checks membership, uniqueness and actual source text before accepting it. Citation resolution returns the matching substring and page-local offsets from the stored source. The viewer marks these original words, never text reconstructed from the model's answer. Unicode ligatures and wrapped whitespace are normalized for matching while retaining original offsets.

Existing entries still work. When no precise quote was stored, the viewer labels and highlights the larger **Belegabschnitt**. Ambiguous or unmappable text is not guessed: the page remains visible with an explanation and a verified text fallback. A matching quotation proves source provenance; it does not independently prove every generated claim. Scanned PDFs still require OCR, which this application does not provide.

Both inline viewing and download repeat ownership checks and return `Cache-Control: no-store`. Other guest workspaces cannot access the bytes. The original file is unchanged. Returning from evidence to a learning artifact restores its persisted card position and ratings.

## Limits and pacing

| App allowance | Previous | New |
| --- | --- | --- |
| Notebooks per workspace | 3 | 10 |
| Active sources per notebook | 10 | 20 |
| PDF pages | 50 | 200 |
| AI attempts per workspace/day | 30 | 200 |
| Additional app minute reservation gate | 8,000 reserved tokens per fixed clock minute | Removed; provider controls its actual window |

Groq's published free `openai/gpt-oss-120b` baseline remains 8,000 tokens/minute, 1,000 requests/day and 200,000 tokens/day; account-specific limits and response headers are authoritative. These are provider limits, not new app entitlements. [Groq rate limits](https://console.groq.com/docs/rate-limits), [prompt caching](https://console.groq.com/docs/prompt-caching). The fixed app bucket could reject consecutive requests because it retained worst-case reservations even when output was shorter or provider caching reduced charged tokens. It has been removed rather than approximating the provider's rolling window a second time.

On a provider 429, the app forwards its wait time, keeps the question, and displays a wall-clock countdown. Expiry re-enables the submit button without sending automatically. There is no retry loop, model switch, account/key rotation or paid fallback. Unknown provider usage stays reserved in the shared daily protection budget.

The existing 4 MiB/file, 100k extracted characters/source, 500k characters/workspace, 4k evidence tokens/request, 2k output tokens, parser deadline, concurrency limits, seven-day guest lifetime and configured shared storage/token budgets remain. In this deployment the daily shared app budget remains 100k tokens and original storage 50 MiB. **A 200-page allowance does not mean a 200-page document will fit every other limit.** No retrieval system was added: oversized selected text is still rejected explicitly. Uploading/viewing/learning does not spend AI tokens; generating a new answer or study artifact does.

## Verification

Local type/lint, 43 service/provider tests and optimized build pass. The full desktop/mobile suite passed 22 cases (two desktop-only checks skipped on mobile). Six affected browser cases were rerun after refining phone scroll behavior and testing rotated-page text geometry. Coverage includes whole-card pointer/keyboard flipping, rating replacement/reset/persistence, exact and legacy quotes, Unicode offsets, original canvas rendering, zoom/navigation, rotated text, highlight restoration, fallback after file failure, cross-guest inline-file rejection, saved-note quote provenance, sequential provider-approved calls and cooldown with no automatic resubmission. Parser tests accept 51-page input and reject more than 200 pages. Deterministic screenshots retain the test-mode banner.

Public verification is recorded separately after publication. Only synthetic QA notebooks are created/deleted; the user's original files and notebooks are preserved.

## Rollback

Restore the preserved `feat/dark-notebook-workspace` release to return to the prior UI. Its schema remains compatible with the additive JSON quotation metadata. The production `SESSION_DAILY_REQUESTS` setting was increased from 30 to 200; return it to 30 as part of a full policy rollback. No history was rewritten.
