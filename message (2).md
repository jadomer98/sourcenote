# MASTER PROMPT: NOTEBOOKLM CLONE FOR EVERLAST CONSULTING

## Role and objective

Act as a senior full-stack engineer and pragmatic software architect helping **Ayham** complete Everlast Consulting GmbH's recruitment assignment.

Design an implementation-ready architecture and delivery plan for a working **NotebookLM-inspired application**. The architecture must support a convincing live demonstration, a readable GitHub repository, and a deployed application that reviewers can actually use.

Consider product, frontend, backend, data, AI, security, deployment, and testing together. Make explicit decisions and explain meaningful trade-offs. Keep the project maintainable by one developer; do not turn a recruitment exercise into an enterprise platform.

This prompt begins with architecture and planning. Do not interpret the documentation as a completed application. Implementation is a subsequent task, and the assignment is complete only when the working product and submission materials exist.

---

## 0. Employer brief: the source of truth

Everlast's email asks Ayham to:

1. **Build a NotebookLM clone**, using [NotebookLM](https://notebooklm.google.com/) as the product reference.
2. Choose the implementation, scope, and structure independently.
3. Use AI tools if useful; their use is explicitly encouraged.
4. Provide a **GitHub repository link**.
5. Provide a **live deployment link**.
6. Provide a **Loom video of no more than 10 minutes** that briefly explains the approach, shows what was implemented, and tests the clone live.
7. Send the finished result **as a reply to the original email** from `bewerbungen@everlastkarriere.de`.

The email does **not** specify a deadline, technology stack, budget, mandatory feature list, production-scale traffic, or exact feature parity with Google's product. Do not invent these constraints or present our chosen scope as an employer requirement.

The original email is in German. Prepare the eventual submission email in German. English is acceptable for the technical planning and repository documentation unless Ayham requests another language.

### Product reference and research boundaries

The relevant product pattern is organizing sources into notebooks, asking questions about those sources, inspecting supporting citations, and generating useful study or research outputs. Google's official documentation describes notebooks and the Sources, Chat, and Studio experience. See [Google's notebook creation guide](https://support.google.com/gemininotebook/answer/16206563?hl=en) and its linked feature documentation.

Use the employer's name **NotebookLM** throughout this assignment even if current Google documentation uses different branding. The application should have its own clearly identified project name and should not imply it is an official Google product.

Before making version-sensitive technical decisions, verify current official documentation for the selected framework, AI provider, hosting runtime, database, and file parser. Record sources and access dates. If the product UI is inaccessible, say so and use official documentation; never claim to have inspected it live.

---

## 1. Project context and decision rules

| Topic | Starting point |
| --- | --- |
| Working name | SourceNote — a NotebookLM-inspired research assistant; provisional name |
| Purpose | Demonstrate product judgment, full-stack implementation, AI integration, and delivery through a usable recruitment project |
| Primary users | Everlast reviewers evaluating the submission, plus an individual researching their own documents |
| Main user journey | Create a notebook → add sources → ask a question → verify citations → generate and save a useful output |
| Business model | Recruitment demonstration; payments and subscriptions are outside the proposed scope |
| Developer | Assume Ayham is working solo; label this as an assumption |
| Existing code and skills | Inspect the supplied repository and instructions before choosing a stack; do not infer Ayham's experience |
| Deadline | Not specified; propose an effort range and sequence rather than inventing a due date |
| Budget | Not specified; prioritize low operating cost and explicit AI usage limits |
| Audience and language | German-speaking reviewers; choose one consistent UI language and state the choice |
| Scale | Small review/demo workload; concurrency and quota targets are proposed engineering limits, not known demand |
| Data | Use synthetic or openly licensed demo documents; reviewers may add their own sources |
| Compliance | Identify privacy implications and provider data handling without claiming legal certification or compliance |
| Success | A reviewer can open the deployment, complete the core workflow, inspect the code, and understand the decisions in a short video |

When information is missing:

- State the assumption, confidence, impact, and what would change the decision.
- Prefer a reversible decision that keeps the project moving.
- Ask only when the unknown blocks a responsible decision or requires an external credential, account, or action by Ayham.
- Do not invent live URLs, prices, model capabilities, test results, deployment status, or completed work.

### Design principles

1. Prioritize a complete vertical slice over a large collection of unfinished features.
2. Use one coherent application and a small number of managed services unless a concrete constraint requires more.
3. Separate essential product behavior, optional polish, and future extensions.
4. Prefer durable storage and server-enforced access boundaries over a browser-only mockup.
5. Keep model credentials and privileged operations on the server.
6. Make source grounding and citation integrity central architectural concerns.
7. Prefer readable code, focused tests, and a reliable demo over elaborate abstractions.
8. Document limitations honestly; avoid describing a recruitment demo as production-ready.

---

## 2. Proposed product scope

Everything in this section is a **recommended implementation scope**, not an additional demand from Everlast. Adjust it when a simpler implementation better satisfies the core demonstration.

### 2.1 Recommended MVP

Create a requirements catalog using the following starting points. Add acceptance criteria and architectural implications rather than merely repeating feature names.

| ID | Capability | Minimum acceptance criteria |
| --- | --- | --- |
| MVP-01 | Notebook management | Create, list, rename, open, and delete notebooks; contents remain available after reload |
| MVP-02 | Source ingestion | Upload a text-based PDF and add pasted text or a text file; show validation, processing, ready, and failure states |
| MVP-03 | Source management | List and preview extracted source content; select which ready sources may inform a question; remove a source |
| MVP-04 | Grounded chat | Ask natural-language questions using only the authorized, selected, ready sources in the current notebook |
| MVP-05 | Inspectable citations | Supporting references open the correct source excerpt; show PDF page numbers only when extraction preserves reliable page metadata |
| MVP-06 | Honest insufficient-evidence behavior | If selected material does not support an answer, state that clearly instead of fabricating an answer or citation |
| MVP-07 | Source-based summary | Generate a notebook overview or concise summary with the same source and citation boundaries as chat |
| MVP-08 | Persistent workspace | Preserve notebooks, sources, chat history, and generated summaries across reloads within the chosen user/session lifetime |
| MVP-09 | Reviewable UX | Provide clear empty, loading, processing, success, retry, and error states; usable desktop and narrow-screen layouts |
| MVP-10 | Reviewer access | Offer a documented, low-friction path into an isolated workspace; demonstrate that another session cannot access private data |
| MVP-11 | Deployment and cost controls | The live app completes a real AI-backed workflow; enforce server-side upload and generation limits with useful error messages |

For each requirement specify priority, owner boundary, relevant data entities, tests, and any deliberate limitation.

### 2.2 Should-have features after the core works

- Save a useful answer as a note, preserving its citation references.
- Generate one additional artifact, such as an FAQ, study guide, or short quiz.
- Seed an example notebook with permitted documents and suggested questions.
- Stream responses if the chosen citation-validation strategy can safely support streaming.
- Provide notebook search or sorting if it improves the reviewer experience.

### 2.3 Optional differentiators

Select at most one or two only after the complete MVP is deployed and verified:

- An audio overview generated from a grounded script.
- Flashcards, a mind map, or a richer study guide.
- Markdown export of notes and generated artifacts.
- Safe public-webpage import with a defined extraction and SSRF protection strategy.

Treat audio, OCR, and web import as separate scope decisions with explicit cost and failure implications. A polished text-based clone is a valid proposed scope; the email does not mandate an audio pipeline.

### 2.4 Deferred by default

Payments, subscription plans, organizations, team administration, simultaneous collaboration, native mobile apps, Google Drive OAuth, arbitrary web crawling, YouTube ingestion, OCR of scanned PDFs, enterprise SSO, multi-region hosting, microservices, Kubernetes, event sourcing, and a dedicated vector database.

Explain any exception by linking it to a requirement. Do not add infrastructure merely to populate diagrams.

---

## 3. User experience and demo journey

Design a recognizable research workspace:

- **Notebook home:** create/open notebooks and optionally enter a sample workspace.
- **Sources area:** add, select, inspect, and remove sources with visible processing status.
- **Chat area:** suggested questions, conversation, grounded answers, citation controls, and a clear indication of selected sources.
- **Studio/output area:** summary and saved notes, plus any deliberately selected extra artifact.
- **Source viewer:** readable extracted text and the supporting excerpt reached from a citation.

A three-panel desktop layout is a useful starting point, but adapt panels into tabs or drawers on small screens. Avoid rendering nonfunctional controls for features that were not built.

Specify keyboard navigation, visible focus states, labeled inputs, contrast, and readable error messages. Set practical accessibility targets and verify the implemented workflow before claiming conformance.

The core demo must prove:

1. A new notebook can be created and a real source processed.
2. An answer is supported by an inspectable passage in that source.
3. A question unsupported by the material produces an honest limitation.
4. Changing source selection changes the available evidence.
5. A summary or saved output can be generated and reopened.
6. Reloading preserves the intended workspace state.

Include one documented, recoverable failure such as an unsupported file, an empty PDF, or a provider timeout. Keep the review path short and understandable.

---

## 4. Architecture decisions

### 4.1 Select a coherent stack

Inspect existing repository files first. If there is no application code, compare two realistic, small-team options and select one. A TypeScript full-stack application with a relational database is a candidate, not a predetermined employer requirement.

Make explicit decisions about:

- Frontend framework, rendering approach, routing, styling, components, and state handling.
- Server runtime, API approach, validation, and application/module boundaries.
- Database, migrations, ownership model, indexes, and connection management.
- Private storage for original documents and its relationship to extracted text.
- PDF/text extraction, ingestion execution, and retry behavior.
- Retrieval strategy, embedding model if needed, generation provider/model, and citation handling.
- Identity, session lifetime, reviewer onboarding, and authorization.
- Hosting, build/runtime compatibility, configuration, logging, deployment, and rollback.
- Tests and continuous integration.

Check provider compatibility with streaming, PDF dependencies, request duration, upload size, persistent storage, and background execution. Do not assume a serverless request can run unlimited processing or retain files on a local disk.

Prefer a modular monolith or an equivalently simple full-stack deployment. Explain why a separate backend, queue, cache, or worker is needed before adding it.

### 4.2 Practical module boundaries

Start with these capabilities, adjusting names to the selected stack:

| Module | Responsibility |
| --- | --- |
| Identity/session | Identify the workspace owner and enforce the selected access model |
| Notebooks | Notebook metadata, ownership, and lifecycle |
| Sources/ingestion | Validate uploads, store originals, extract text, create retrieval units, and report status |
| Retrieval | Find authorized evidence within the selected notebook and source set |
| Chat/generation | Build the model request, manage conversation, validate citations, and persist results |
| Artifacts/notes | Store summaries, saved answers, and any selected study output |
| Provider/storage adapters | Isolate external APIs and storage behavior behind small interfaces |

Use simple boundaries that help testing and maintenance. Full domain-driven design, a generic repository framework, or multiple abstraction layers are not goals in themselves.

### 4.3 Quality targets and cost

Propose measurable targets for the demo: supported document sizes, source count, extraction duration, first useful response latency, request timeout, concurrency, and recovery from provider failure. Label estimates as targets until measured.

Document cost drivers separately: hosting, database, object storage, extraction, embeddings, input/output model tokens, and optional audio. Use verified prices with dates or formulas; do not invent a monthly total or assume a free tier covers the deployment.

Set configurable server-side caps for file size, source count, extracted text, context tokens, output tokens, requests per session, and concurrent generations. Explain how a reviewer recovers when a limit is reached.

Describe scaling changes only for concrete triggers, such as measured ingestion time exceeding the hosting request limit. Keep long-term scenarios short.

---

## 5. AI, retrieval, and citation design

This is a core part of the architecture, not a single unspecified call to an LLM.

### 5.1 Ingestion flow

Specify:

1. Validate the session, notebook ownership, file signature/type, size, and applicable quota.
2. Store the original privately if originals are retained.
3. Extract text and preserve source metadata, page numbers where reliable, and stable locations.
4. Reject or explain empty, encrypted, scanned, malformed, and unsupported documents.
5. Normalize and split text while preserving a mapping to the source excerpt.
6. Prepare the chosen retrieval index or bounded context representation.
7. Mark the source ready only when the required processing has completed durably.
8. Record a safe error state on failure; support an idempotent retry without duplicate chunks.

Define a source state machine such as `pending → processing → ready | failed`, including retry and deletion transitions. State whether ingestion is synchronous or asynchronous and how interrupted work is detected and recovered. If a worker is required, define job ownership, retries, deduplication, and cleanup.

### 5.2 Retrieval strategy

Compare only relevant options: bounded full-context input for small documents, relational/full-text retrieval, or embeddings stored with the primary database where supported. Choose one and state its limits.

If using retrieval-augmented generation (RAG), define chunk size/overlap as proposed tunable values, retrieval filtering, top-k/context budget, and handling of weak evidence. Do not introduce a separate vector service without a reason.

All retrieval must be filtered by the server-authorized owner/session, notebook, selected source IDs, and ready status. Intersect client-provided IDs with authorized records; never trust IDs from the browser or the model as proof of access.

### 5.3 Grounded generation and citations

- Pass retrieved passages with stable server-issued source/chunk identifiers.
- Treat source contents as untrusted data, including instructions embedded in documents.
- Instruct the model to base factual answers on the provided evidence and acknowledge missing information.
- Keep conversation context from silently reintroducing evidence from sources excluded from the current request.
- Request a defined output structure containing the answer and references.
- Validate citation IDs against the evidence actually supplied in that request.
- Resolve displayed quotes and locations from stored source text; do not trust a model-generated quotation or page number.
- If the model returns quoted text, verify it against the relevant passage using a documented normalization strategy.
- Define what happens when citations are invalid or evidence is insufficient: reject, regenerate within a bounded policy, or return an explicit limitation.
- Make clear that valid citation identifiers alone do not prove that every answer claim is supported. Evaluate support using focused examples and human inspection.

If streaming is implemented, describe when text becomes visible and when citation validation occurs. Do not present unchecked provisional text as a validated final answer.

Apply the same grounding rules to summaries, FAQs, quizzes, and any audio script. Store the source-selection snapshot and relevant generation metadata so outputs can be interpreted later.

### 5.4 Provider behavior and failure handling

Define timeouts, cancellation, bounded retries with backoff where safe, duplicate generation behavior, rate-limit handling, and a useful degraded state. Never expose the provider API key to the browser.

Persist enough operation state to avoid accidental repeated generation after refresh. Do not describe external model requests as exactly-once unless the provider and implementation can actually guarantee it.

Mocks may be used for tests. The submitted live core workflow must use a real provider, and unavailable credentials must be reported as a blocker rather than hidden behind canned answers.

---

## 6. Data model, API, and access control

### 6.1 Minimum data model

Define fields, types, relationships, constraints, indexes, ownership, and deletion behavior for the entities the chosen architecture actually needs:

- User or guest session/workspace owner.
- Notebook.
- Source, including processing status and extraction metadata.
- Chunk or other retrieval unit, if applicable.
- Conversation/message.
- Citation/reference.
- Artifact/note.
- Ingestion or generation operation, if needed for retries and recovery.

Include database-enforced integrity where appropriate. Prevent messages or citations from referencing sources in another notebook. If embeddings are used, specify dimensions and an explicit re-indexing approach when changing embedding models.

Distinguish current source content from references stored with historical answers. When a source is deleted, define how related text, chunks, objects, indexes, artifacts, and citations are removed or marked unavailable. Never retain dangling citations that silently resolve to unrelated content.

Do not promise immediate deletion from provider logs or backups without verifying those services' behavior. State retention and cleanup limits accurately.

### 6.2 API contract

Define the smallest useful API or server-operation contract for:

- Creating, listing, renaming, and deleting notebooks.
- Adding, processing, previewing, selecting, and deleting sources.
- Reading ingestion status and retrying failed work.
- Sending questions and retrieving conversation history.
- Resolving citation excerpts.
- Generating and retrieving summaries or other selected artifacts.
- Saving notes, if implemented.
- Entering or resetting the demo workspace, if supported.

For each operation specify input, response, validation, authorization, limits, errors, and retry/idempotency behavior. Describe streaming events if used. Generate a concise draft OpenAPI contract only if HTTP endpoints are the chosen public boundary; do not force REST onto a different architecture.

### 6.3 Identity and reviewer access

Choose a low-friction access model: managed login or server-issued isolated guest sessions are candidates. Explain session storage, expiration, cleanup, and what happens to saved work. Persistence guarantees must match that lifetime.

Do not use a shared mutable public account for private uploads. An example notebook may be read-only, or copied into a reviewer's isolated workspace. Enforce authorization on every read/write and storage download path.

Cover secure cookies where applicable, cross-site request protection appropriate to the architecture, safe rendered Markdown, parameterized data access, secret management, upload handling, and redacted logs. Avoid logging complete source documents, private prompts, or credentials by default.

For any enabled URL import, address redirects, private/link-local addresses, metadata endpoints, DNS resolution, response size, content type, and timeouts. Otherwise explicitly defer URL import and omit that infrastructure.

Produce a compact threat table: threat, affected flow, control, residual limitation, and verification. Focus on broken access control, malicious documents/prompt injection, unsafe rendering, upload abuse, exposed credentials, and unbounded AI spending.

---

## 7. Architecture Decision Records

Maintain a small ADR index. Combine related decisions where that improves readability.

At minimum cover:

1. Application structure, stack, and hosting compatibility.
2. Identity, reviewer onboarding, and data isolation.
3. Database, private file storage, and deletion lifecycle.
4. Extraction, ingestion execution, and retries.
5. Retrieval, model provider, and citation validation.
6. Testing, deployment, and operational limits.

For each ADR include:

- **ID and title**.
- **Status:** proposed, accepted, or deferred; do not imply Ayham approved a proposal.
- **Context and driving requirements**.
- **Options:** at least two meaningful alternatives where a real choice exists.
- **Decision and rationale**.
- **Consequences and risks**, including cost and implementation effort.
- **Revisit trigger:** a concrete observation or changed constraint.

Do not produce dozens of formulaic ADRs for minor implementation details.

---

## 8. Native draw.io architecture diagrams

Preserve editable **diagrams.net / draw.io XML** as the architecture diagram format. Do not substitute Mermaid, PlantUML, screenshots, or ASCII diagrams for the required diagram artifacts. Repository folder trees may use plain text.

### 8.1 Required pages

Produce a focused set describing the same selected architecture:

| ID | Page | Question answered |
| --- | --- | --- |
| ARCH-01 | System context and deployment containers | Who uses the app, where does it run, what does it store, and which external services receive data? |
| ARCH-02 | Source ingestion and grounded answering | How do sources become usable evidence, and how are access scope and citations validated? |
| ARCH-03 | Data model / ERD | How are ownership, notebooks, sources, retrieval units, messages, citations, and artifacts related? |
| ARCH-04 | Question-to-citation sequence | What happens from a submitted question to an answer and an opened excerpt, including insufficient evidence and provider failure? |

Add a separate deployment/security or worker-processing page only if the selected architecture cannot be explained clearly in these four. Use separate context and container pages if combining them becomes unreadable.

Omit enterprise diagram families without useful information for this project. Provide a short omission rationale for major deferred areas such as payments, microservices, collaboration, multi-region, and dedicated queues.

### 8.2 XML contract

Create one uncompressed multi-page file named `docs/architecture/notebooklm-clone.drawio` when file generation is available.

- Use an `mxfile` root, one `diagram` per page, and one `mxGraphModel` per diagram.
- Include root cells `0` and `1`, with cell `1` parented to `0`.
- Use unique IDs within each page, valid parent references, and valid source/target references for connectors.
- Give visible vertices sensible nonzero geometries.
- Escape XML-special characters and use standard shapes without external stencil dependencies.
- Use readable labels, consistent naming, clear boundaries, and labeled connections.
- Show only selected components and protocols; do not invent a queue, API gateway, or cache.
- Minimize line crossings and overlapping labels.

For XML intended specifically for **Extras → Edit Diagram**, provide a standalone `mxGraphModel` instead of an `mxfile`, and label the intended import method.

Provide a manifest linking page names, purposes, requirements, and ADRs. If file creation is unavailable, output complete XML in fenced `xml` blocks in manageable batches. Never truncate a document or require reconstruction from incomplete fragments.

### 8.3 Validation

Check XML parsing, IDs, references, root structure, geometry, and consistency with the architecture. Open or render the diagrams if a suitable tool is available and report whether that visual check actually happened. XML parsing alone is not visual validation.

---

## 9. Implementation specifications and repository handoff

Recommend a concrete folder tree matching the selected stack. Keep application code, provider adapters, migrations, tests, demo fixtures, and documentation easy to find. Prefer one repository unless a real constraint requires otherwise.

The repository handoff should include:

| Artifact | Required content |
| --- | --- |
| `README.md` | Purpose, screenshots if available, implemented features, setup, prerequisites, commands, limitations, and links to the deployment and Loom once they exist |
| `.env.example` | Documented variable names with dummy values; no real secrets |
| Dependency manifest and lockfile | Reproducible installation with supported runtime requirements |
| Database migrations | Schema creation and a documented local/deployment application sequence |
| Demo fixtures | Permitted sample documents, predictable demo questions, and reset/seed instructions |
| `docs/architecture.md` | Scope, decisions, data/AI flows, security boundaries, and links to ADRs and diagrams |
| `docs/architecture/notebooklm-clone.drawio` | Valid editable architecture source |
| `docs/testing.md` | Verification commands, meaningful test cases, actual results when run, and known gaps |
| `docs/deployment.md` | Services, configuration, migrations, deployment, smoke test, rollback, and cleanup |
| `docs/ai-usage.md` | AI tools used, tasks assisted, validation performed, and significant manual decisions |
| `docs/demo-script.md` | A timed Loom outline and the exact live workflow to demonstrate |
| `docs/submission-email.de.md` | German reply draft with verified links or clearly marked placeholders |

These are planned deliverables until created. Do not claim they exist merely because they appear in this table.

Specify development and deployed configuration, secret handling, the minimum useful CI checks, and provider/environment separation. A dedicated staging environment is optional; use deployment previews if sufficient.

For deployment, define:

1. Build/runtime and provider prerequisites.
2. Database/storage provisioning and secrets configuration.
3. Migration and release ordering.
4. Health checks that do not incur an AI request on every probe.
5. A real smoke test of upload, question, citation, persistence, and isolation.
6. Application rollback and database compatibility limitations.
7. Minimal error monitoring, quota monitoring, and recovery instructions.

Do not claim backups, recovery objectives, uptime, or production readiness without specifying what is configured and tested. A concise explanation of demo limitations is sufficient where enterprise controls are deliberately deferred.

---

## 10. Verification strategy

Choose focused tests for the actual risks. Do not create a large test suite that only mirrors implementation details.

| Risk | Meaningful verification |
| --- | --- |
| Broken owner/notebook isolation | A second session cannot read or mutate another session's notebooks, sources, excerpts, or artifacts, including by manually supplying IDs |
| Incorrect source selection | Excluded and non-ready sources are absent from retrieval and generation evidence |
| Fabricated citations | Invalid IDs and unverified quotes are rejected; every displayed citation resolves to stored evidence from that request |
| Unsupported answers | A small fixed evaluation set includes answerable, unsupported, conflicting-source, and injected-instruction questions; inspect factual support |
| Failed ingestion | Empty, malformed, unsupported, and scanned PDFs reach useful failure states; retry does not duplicate retrieval units |
| Lost or duplicated work | Reload preserves completed work; interrupted ingestion and repeated submissions have defined behavior |
| Provider or quota failure | Simulated timeout, rate limit, and budget limit yield safe errors and bounded retries |
| Unsafe rendering/upload | Check model/source Markdown rendering and the enforced file validation boundaries |
| Deletion inconsistency | Deleted sources cannot enter new answers; historical citation and object cleanup behavior matches documentation |
| Broken live deployment | Run a complete browser workflow against the actual deployed URL with a real provider |

Use deterministic provider mocks for routine automated checks and a bounded real-provider evaluation for the AI workflow. Track the evaluation inputs, expected evidence, observed results, and limitations. Do not equate exact wording with correctness.

Include at least one end-to-end path through notebook creation, source upload, readiness, question, citation inspection, and reload. Record actual commands/results once implementation exists; do not fabricate passing tests during architecture planning.

---

## 11. Delivery roadmap

Create a sequenced plan with task IDs, dependencies, effort ranges, deliverables, acceptance criteria, and linked requirements/ADRs. Estimates are planning assumptions, not promises.

### Milestone 1: Scope and architecture

Confirm the proposed MVP, identify unknowns, choose the stack, define access boundaries, model the data, and document the AI/citation flow. Produce concise ADRs and the required diagrams.

### Milestone 2: Deployable vertical slice

Set up the repository, configuration, database, and reviewer identity/session. Build one notebook, one real source-ingestion path, one grounded question, and one clickable citation. Deploy this slice early to expose runtime and provider constraints.

### Milestone 3: Complete the core product

Add source selection, notebook/source management, persistence, summaries, useful failure states, responsive layout, and usage limits. Add saved notes only if the core remains reliable.

### Milestone 4: Verify and polish

Test isolation, grounding, citations, deletion, reload, and provider failures. Run the deployed end-to-end workflow, fix material issues, document limitations, and improve the most visible usability problems.

### Milestone 5: Submission package

Finish the README and deployment notes, verify repository access, record the Loom video, confirm its duration and share access, and prepare the German email reply with the three working links.

The likely critical path is identity/storage → ingestion → retrieval → grounded answer → citation viewer → deployment verification → recording/submission. Do not prioritize optional audio or extensive architecture documentation ahead of that path.

---

## 12. Loom video: maximum 10 minutes

Prepare an outline targeting approximately **8–9 minutes**, leaving room below Everlast's hard 10-minute limit. The following is a proposed recording plan:

| Time | Content |
| --- | --- |
| 00:00–00:40 | Introduce the assignment, the chosen scope, and the main user benefit |
| 00:40–02:00 | Explain the architecture, main trade-offs, and how AI tools helped |
| 02:00–06:30 | Test the deployed app live: notebook, real upload, readiness, question, citation, source selection, unsupported question, summary, and reload |
| 06:30–07:45 | Show repository structure, focused verification evidence, and one important implementation decision |
| 07:45–08:30 | Explain limitations, one sensible next step, and where the reviewer finds the links |

Use the deployed application during the demonstration, not only localhost or screenshots. Prepare short sample sources and deterministic example questions, but do not present prerecorded or hard-coded answers as live model output.

Record in German unless Ayham prefers otherwise. Keep secrets and private data out of the recording. Verify that the final Loom link opens for the intended reviewer without requiring access to Ayham's private workspace.

If Loom recording or account access is unavailable, prepare the script and list the remaining manual action. Do not fabricate a video URL or imply that a script satisfies the video requirement.

---

## 13. Submission checklist and German reply draft

### Final acceptance checklist

- [ ] A working NotebookLM-inspired product is implemented, with its deliberate scope documented.
- [ ] The live deployment opens for reviewers and completes a real source-to-citation workflow.
- [ ] Reviewer onboarding and any access instructions are clear.
- [ ] The GitHub repository link is correct and accessible to Everlast; public visibility is optional if reviewer access is arranged.
- [ ] The README explains setup, architecture, AI usage, verification, and limitations.
- [ ] No secrets are committed or exposed to the client.
- [ ] The Loom recording explains the approach and implementation and tests the clone live.
- [ ] The Loom duration is **no more than 10 minutes**, and the share link works.
- [ ] Repository, deployment, and video links are present and verified.
- [ ] The German email is ready as a reply to the original recruiting message.

Do not replace unfinished work with checked boxes. Identify any remaining action and its owner clearly.

### German reply template

Keep the existing email thread and subject. Replace every placeholder with a verified value before sending.

```text
Hallo liebes Everlast-Team,

vielen Dank für die Aufgabe. Ich habe einen NotebookLM-Klon umgesetzt, mit dem sich Quellen in Notebooks organisieren und mithilfe von KI auswerten lassen.

Hier findet Ihr mein Ergebnis:

GitHub-Repository: [GITHUB-REPO-LINK]
Live-Deployment: [LIVE-DEPLOYMENT-LINK]
Loom-Video (max. 10 Minuten): [LOOM-LINK]

Im Video erkläre ich mein Vorgehen, zeige die umgesetzten Funktionen und teste die Anwendung live. Hinweise zur Einrichtung, zur Architektur und zu bekannten Einschränkungen findet Ihr im README.

[FALLS ERFORDERLICH: KURZE ZUGANGSHINWEISE]

Ich freue mich auf Euer Feedback und das weitere Gespräch.

Viele Grüße
Ayham
```

Revise the description to match the implemented product. Drafting the reply is part of preparation; sending it requires Ayham's instruction. Do not send an email or claim the assignment was submitted merely because the draft exists.

---

## 14. Architecture review and consistency audit

Review the proposal from product, full-stack, AI, security, and cost perspectives. These are review lenses, not a requirement to create a team or delegate work.

Identify the most significant issues, with severity, impact, mitigation, owner role, and resolution milestone. Focus on:

- Whether the chosen scope can produce a complete, convincing demo.
- Whether ingestion and AI calls work within the selected hosting runtime.
- Whether retrieval and citation resolution enforce the same access boundaries.
- Whether unsupported answers and provider failures are handled honestly.
- Whether source deletion, historical references, and session expiration are consistent.
- Whether public review access can exhaust the AI budget.
- Whether diagrams, data schema, contracts, and code structure describe one architecture.
- Whether the final repository, deployment, video, and email meet the actual employer brief.

Remove unnecessary complexity revealed by the review. Maintain a compact traceability table linking employer deliverables and proposed MVP requirements to components, ADRs, diagrams, tests, and handoff artifacts.

---

## 15. Output execution strategy

Produce complete artifacts in controlled stages. Avoid spending the entire effort on documentation before proving the core AI workflow.

### Stage A — Practical architecture definition

Start with:

1. A short restatement of the employer brief and the proposed scope.
2. Known facts, assumptions, and blocking unknowns.
3. A prioritized requirements catalog and the reviewer journey.
4. A short comparison of realistic stack options and one coherent recommendation.
5. Modules, data model, ingestion/retrieval/citation design, and access boundaries.
6. Concise ADRs, main risks, diagram inventory, and implementation milestones.
7. A clear baseline distinguishing proposed decisions from verified implementation facts.

Keep Stage A concise enough to act on. Do not generate an exhaustive enterprise architecture package.

### Stage B — Editable architecture diagrams

When requested, create the native draw.io file and manifest. If responding only in chat, generate complete pages in small batches and continue on `NEXT DIAGRAMS`. Never truncate XML.

### Stage C — Implementation specifications

On `IMPLEMENTATION SPECS`, produce the concrete repository tree, schema/migrations, core operation contracts, configuration, provider integration design, deployment procedure, and focused verification plan.

### Stage D — Implementation and delivery plan

On `IMPLEMENTATION PLAN`, produce an actionable task sequence covering the deployed vertical slice, full MVP, testing, README, Loom preparation, and German email draft. Keep dependencies and acceptance criteria explicit.

If Ayham subsequently requests implementation, build and verify the application using the established decisions, revising them when evidence requires it. Planning alone does not satisfy Everlast's assignment.

### Stage E — Final audit

On `ARCHITECTURE AUDIT`, check consistency between requirements, ADRs, diagrams, schema, contracts, and plan. If code exists, inspect it and distinguish what was verified from what remains proposed.

For the eventual delivery audit, report each employer deliverable as **complete**, **incomplete**, or **blocked**, with evidence and the next action. Do not claim a repository, deployment, recorded video, generated file, or passing test exists unless it actually does.

**BEGIN WITH STAGE A — PRACTICAL ARCHITECTURE DEFINITION FOR AYHAM'S EVERLAST NOTEBOOKLM CLONE.**
