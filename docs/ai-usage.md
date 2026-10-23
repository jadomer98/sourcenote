# AI assistance and verification

Ayham used Codex to interpret the recruitment brief, propose an architecture, create editable draw.io diagrams, research free providers and hosting, implement the application, write tests, diagnose integration failures and prepare documentation. The employer explicitly permits AI assistance.

Meaningful user decisions: keep the recruitment project focused on NotebookLM's core research workflow; perform work in this repository on a new branch; spend no money; use Groq free tier as the preferred AI route. The earlier paid-volume/OpenAI proposal was revised accordingly. Cloudflare/Qwen remains an optional adapter, not another project's configuration.

Generated implementation was checked through TypeScript, ESLint, real PostgreSQL-compatible local migrations, service integration tests, actual PDF extraction, provider-boundary tests, and desktop/mobile browser tests. Tests exposed and corrected inconsistent SQL parameter types, a PDF.js lifecycle/API difference, Windows font-path handling, and UI test locator ambiguity. Screenshots were inspected and text contrast/scroll behavior refined.

Routine tests use deterministic providers only within test code or the explicitly labeled development-only `AI_TEST_MODE`. Production rejects that mode. The normal app does not pretend to answer when a real provider key is absent. No live AI results, deployment link, repository publication or Loom URL have been fabricated.

Open-source packages and official documentation remain the sources of truth for framework/provider behavior. AI-generated explanations and valid citation IDs do not prove semantic grounding; the evaluation fixtures require real-provider execution and human inspection before submission. Ayham should review the implementation and rehearse the architecture trade-offs in his own words for the Loom and follow-up interview.
