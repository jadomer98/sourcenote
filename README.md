# SourceNote · NotebookLM-inspired research assistant

Architecture preparation for Ayham's Everlast Consulting assignment.

**Current status: proposed architecture only. The application is not implemented or deployed.**

Start with the [editable four-page draw.io diagram](docs/architecture/notebooklm-clone.drawio) and [opening instructions / page manifest](docs/architecture/README.md).

- [Architecture baseline and MVP](docs/architecture.md)
- [Six proposed decisions](docs/architecture/decisions.md)
- [Schema integrity and deletion lifecycle](docs/architecture/schema-notes.md)
- [Official documentation sources](docs/architecture/sources.md)
- [Actual validation results and editor limitation](docs/architecture/validation.md)

Generate and validate the diagram files with Python 3.11+:

```powershell
python scripts/generate_architecture.py
python scripts/validate_architecture.py
```

No application setup commands, GitHub publication link, live deployment URL or Loom URL exist yet. Those belong to the subsequent implementation and delivery stages. The original supplied brief remains in `message (2).md`.
