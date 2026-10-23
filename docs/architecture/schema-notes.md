# Schema and lifecycle notes

This is a logical schema design accompanying ARCH-03, not an executable migration. All entity primary IDs are UUIDs. All timestamps are `timestamptz`; the diagram abbreviates some as `time`. Creation timestamps apply to records even where omitted from compact cards. `operation.idempotency_key` is abbreviated as `idem_key` in one diagram constraint.

## Relational constraints

- `notebook.owner_id → workspace_owner.id`; all private reads first join this chain and check expiry.
- `source.notebook_id`, `operation.notebook_id` and `entry.notebook_id → notebook.id`.
- `chunk(notebook_id, source_id) → source(notebook_id, id)`; unique `(notebook_id, source_id, id)` and `(source_id, ordinal)`.
- `operation_source(notebook_id, operation_id) → operation(notebook_id, id)` and `(notebook_id, source_id) → source(notebook_id, id)`; additionally unique `(notebook_id, operation_id, source_id)`.
- `evidence(notebook_id, operation_id, source_id) → operation_source(notebook_id, operation_id, source_id)`.
- `evidence(notebook_id, source_id, chunk_id) → chunk(notebook_id, source_id, id)`. On source deletion, explicitly set only `chunk_id` to NULL and `unavailable_at` before deleting chunks. The source/operation membership remains intact; no copied excerpt is retained.
- `entry(notebook_id, operation_id) → operation(notebook_id, id)` when an operation exists. `entry(notebook_id, parent_id) → entry(notebook_id, id)` supports question/answer association and saved-note origin without crossing notebooks.
- `citation(notebook_id, operation_id, entry_id) → entry(notebook_id, operation_id, id)` and `(notebook_id, operation_id, evidence_id) → evidence(notebook_id, operation_id, id)`. A reference cannot point to evidence from a different notebook or generation. All citation FK columns are non-null.
- Entry body stores structured blocks; the citation table addresses block index and display order. Enforce their correspondence in the commit transaction. Copying a validated answer to a note retains the original operation and reconstructs citation rows under the new entry ID.
- Enforce nonnegative byte/token counters, positive page numbers when present, start ≤ end offsets, valid states, and bounded titles/questions. A deleted source has no text/file bytes accessible through any route.
- Index the referencing FK columns as well as the read/status indexes shown on ARCH-03. Lock the owner row during admission and inspect its active operations through notebooks to enforce one active generation per owner. A serialized service quota/lease reservation enforces global concurrency. Acquire admission locks in a consistent order (service quota, owner, notebook) to avoid deadlocks.

The diagram shows structural relationships, not every redundant FK line: notebook ownership of entries is also enforced, operation_source belongs to both a source and an operation, and evidence belongs to an operation through that join. `quota_bucket` has polymorphic scope keys for service/session/IP, so it intentionally has no direct owner FK. `operation` carries the active lease and reservation metadata; expired leases release concurrency slots, not unknown provider-spend reservations.

## Ingestion and atomicity

Reserve the source slot in a notebook-locked transaction. Create `pending` source and operation, write to an operation-scoped temp file, fsync/rename to the generated storage key, then claim the processing attempt. A crash at any stage is recoverable by inspecting source state, lease and file presence. Sweep abandoned temp/orphan files only after an age threshold exceeding the request/lease window. Do not infer readiness from file presence.

On parsing success, one transaction verifies the current attempt token, non-expired owner, notebook existence and non-deleting source; replaces any uncommitted chunks; and changes source to `ready`. Reject stale-worker writes. Source retries use the same source ID but a new attempt token; user-visible generation retries use a new operation key. Retryable database-only serialization failures do not repeat the provider request.

## Deletion ordering

1. Lock the notebook, mark source `deleting`, and deny preview/download/evidence access immediately. Generation commit uses the same lock and must recheck all source versions and states.
2. Find operations selecting this source through `operation_source`. Set affected answer/summary/note entries to unavailable and clear their bodies; erase their citation rows. This conservative policy also invalidates outputs that selected, but did not cite, the source. User-authored questions are distinct and remain unless their notebook is deleted.
3. Mark associated evidence unavailable and null its chunk IDs. Delete chunks; remove title/extraction metadata that could retain source content. Preserve only opaque IDs/status required for a tombstone and its historical selection associations.
4. Delete the original file idempotently. Until success retain the private storage key solely for cleanup; access remains denied. Clear the key and mark `deleted` on success. Sweep retries failures; do not claim physical deletion while it is pending.
5. For notebook/owner expiry, first make the entire scope inaccessible, finish file cleanup, then delete citations, entries, evidence, operation_source, operations, chunks, sources and the notebook/owner in dependency order. Clear expired quota rows separately. Cancellation and commit guards prevent in-flight operations from resurrecting data.

Backups, if later configured, require a separate retention/deletion policy. A local purge cannot withdraw text already sent to a model provider. Neither immediate provider erasure nor legal certification is claimed.
