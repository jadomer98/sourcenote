# Editable SourceNote architecture diagrams

Open **[notebooklm-clone.drawio](notebooklm-clone.drawio)**. It is a complete, uncompressed native diagrams.net file with four editable pages. All shapes, labels and connectors remain editable; there are no external stencils or embedded screenshots.

## Page manifest

| Page | Purpose | Requirements | Decisions |
| --- | --- | --- | --- |
| ARCH-01 · System context & deployment containers | User journey, runtime, data locations, provider transmission and deployment boundary | MVP-01–03,08–11 | ADR-01,02,03,06 |
| ARCH-02 · Source ingestion & grounded answering | Source state/retry flow, selection, bounded evidence, validation, failure and excerpt inspection | MVP-02–07,09,11 | ADR-02,04,05,06 |
| ARCH-03 · Data model / ERD | Ownership, source/chunk lineage, operation evidence, historical outputs and relational integrity | MVP-01–08,10,11 | ADR-02,03,04,05,06 |
| ARCH-04 · Question-to-citation sequence | Authorization, duplicate requests, provider call, valid/insufficient/failure outcomes, citation lookup | MVP-04–08,10,11 | ADR-02,03,05,06 |

The diagrams describe the proposal in [architecture.md](../architecture.md). Read the [six ADRs](decisions.md) and [schema notes](schema-notes.md) for constraints too detailed for a diagram. Every page is explicitly labeled proposed; application behavior has not been implemented or tested.

## Open in diagrams.net

1. Open [app.diagrams.net](https://app.diagrams.net/).
2. Choose **Device** if asked where to store diagrams.
3. Use **Open Existing Diagram**, or **File → Open From → Device**.
4. Select `C:\Users\Ayham\Desktop\Everlast\docs\architecture\notebooklm-clone.drawio`.
5. Use the four page tabs at the bottom. Zoom to fit, then zoom in for detailed labels.

For **Extras → Edit Diagram**, use one standalone graph model, not the full multi-page `mxfile`. Replace the editor contents with exactly one of these complete files and apply it to a blank page:

- [ARCH-01.xml](pages/ARCH-01.xml)
- [ARCH-02.xml](pages/ARCH-02.xml)
- [ARCH-03.xml](pages/ARCH-03.xml)
- [ARCH-04.xml](pages/ARCH-04.xml)

The main file already contains all batches; no repeated `NEXT DIAGRAMS` messages are necessary. Browser automation was stopped by its URL-verification guard, so opening and checking the file in the actual diagrams.net editor remains a manual step. See [validation evidence](validation.md).

Locally rendered layout previews: [context](previews/ARCH-01.png), [ingestion](previews/ARCH-02.png), [ERD](previews/ARCH-03.png), [sequence](previews/ARCH-04.png). These were visually inspected, but use an approximate renderer and are not screenshots of diagrams.net. Native editable XML is the authoritative artifact.

## Visual language

Blue = application/UI; green = durable data and evidence; purple = external AI; amber = policy/validation; rose = failure; grey = context or explanation. Words and labeled arrows communicate the same meaning without depending on color. ERD connectors show parent → child with cardinalities; sequence arrows read top to bottom, with dashed replies. Proposed infrastructure boundaries are dashed boxes.

Payments, organizations and team collaboration are outside the selected individual-review scope. Microservices, multi-region topology, a dedicated queue, cache and vector database have no measured justification here. These are omitted deliberately, not left as incomplete diagram pages. A worker/storage redesign has concrete triggers in ADR-03–05.

## Regenerate and validate

Run from the repository root with Python 3.11+; no third-party dependencies:

```powershell
python scripts/generate_architecture.py
python scripts/validate_architecture.py
```

Regeneration replaces the generated diagram and standalone pages. If you edit them in diagrams.net, preserve those edits separately or update the generator before regenerating. The generator is optional for normal diagram editing.

Optional preview regeneration: `python scripts/preview_architecture.py` uses Pillow and local Windows Arial fonts. It is separate from the standard-library generator and validator.
