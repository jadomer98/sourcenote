# Diagram validation evidence

Date: **2026-10-23**. Scope: generated architecture artifacts only.

## Executed checks

`python scripts/generate_architecture.py` produced the native four-page `mxfile` and four complete standalone `mxGraphModel` documents.

`python scripts/validate_architecture.py` passed:

| Page | Visible vertices | Edges | Result |
| --- | ---: | ---: | --- |
| ARCH-01 | 15 | 5 | PASS |
| ARCH-02 | 19 | 9 | PASS |
| ARCH-03 | 16 | 11 | PASS |
| ARCH-04 | 14 | 22 | PASS |

Verified XML parsing, uncompressed root, four unique page IDs/names, root cells 0/1, unique cell IDs, valid parent chains without cycles, connector references or explicit endpoints, positive visible geometry, page bounds, no external stencil references, and semantic equivalence of each standalone page with the multi-page source. Edges in the sequence use explicit points intentionally; they do not have dangling source/target IDs.

`python scripts/preview_architecture.py` generated four approximate local PNG previews. Label-fit checks passed for all four after expanding two tight explanatory cards. All four previews were visually inspected for hierarchy, readable labels and connector layout; context connector alignment was subsequently adjusted to keep labels in the gaps between cards. These previews use Pillow, not the diagrams.net engine. XML parsing and local label metrics do not prove exact editor rendering.

## Actual editor check: blocked

The browser connector reported no available browser surfaces. The Windows computer-use fallback found Chrome, but its navigation attempt was stopped with: “could not determine the current browser URL on Windows with enough confidence to enforce policy.” No further computer-use input was attempted. The file has **not** been opened or visually verified in the actual diagrams.net editor in this session.

Remaining manual check: open `notebooklm-clone.drawio` through diagrams.net's **File → Open From → Device**, inspect all four page tabs at readable zoom, and save any desired layout refinements. Complete import instructions are in [README.md](README.md).

## Architecture consistency review

| Concern | Resolution in this proposal | Remaining evidence |
| --- | --- | --- |
| Excess infrastructure | One app, one DB, private volume; no queue/cache/vector service | Deployed resource and latency measurements |
| Scope or citation leakage | Owner/notebook/ready filter, exact selection, operation evidence IDs, composite FKs | Two-session tests and adversarial references |
| Historical evidence after deletion | Redact derived outputs, null evidence chunk links, purge text/files, retain content-free tombstones | Deletion/commit race integration test |
| Request interruption | Attempt leases, fenced commit, explicit retry, startup/periodic cleanup | Kill parsing/request and verify recovery |
| Unbounded model usage | Atomic worst-case reservations and service-wide cap; no ambiguous automatic retry | Concurrency and quota-failure tests |
| Unsupported answers | Explicit limitation and claim-level evaluation; valid IDs are not proof of support | Fixed real-provider evaluation set |
| Deployment limitation | Single instance; volume redeploy downtime documented | Real image/PDF/DB/provider smoke test |

No application tests, provider calls, runtime compatibility checks, public deployment or Loom recording were performed. No employer deliverable beyond the architecture artifact set is marked complete.
