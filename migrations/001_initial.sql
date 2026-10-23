CREATE TABLE IF NOT EXISTS workspace_owner (
  id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS notebook (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES workspace_owner(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  emoji text NOT NULL DEFAULT 'book', color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,id)
);
CREATE INDEX IF NOT EXISTS notebook_owner ON notebook(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS source (
  id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook(id) ON DELETE CASCADE,
  title text NOT NULL, mime text NOT NULL, bytes integer NOT NULL CHECK(bytes >= 0),
  status text NOT NULL CHECK(status IN ('pending','processing','ready','failed','deleting','deleted')),
  version integer NOT NULL DEFAULT 1, storage_key text,
  char_count integer NOT NULL DEFAULT 0 CHECK(char_count >= 0), page_count integer,
  error_code text, error_message text, attempt_token uuid, lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE(notebook_id,id)
);
CREATE INDEX IF NOT EXISTS source_notebook ON source(notebook_id,status);
CREATE TABLE IF NOT EXISTS source_blob (
  source_id uuid PRIMARY KEY REFERENCES source(id) ON DELETE CASCADE,
  data bytea NOT NULL
);
CREATE TABLE IF NOT EXISTS chunk (
  id uuid PRIMARY KEY, notebook_id uuid NOT NULL, source_id uuid NOT NULL, ordinal integer NOT NULL,
  text text NOT NULL, tokens integer NOT NULL, page_no integer,
  char_start integer NOT NULL, char_end integer NOT NULL CHECK(char_end >= char_start),
  FOREIGN KEY(notebook_id,source_id) REFERENCES source(notebook_id,id) ON DELETE CASCADE,
  UNIQUE(source_id,ordinal), UNIQUE(notebook_id,source_id,id)
);
CREATE TABLE IF NOT EXISTS operation (
  id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('ingest','answer','summary','quiz')),
  state text NOT NULL CHECK(state IN ('running','succeeded','failed')),
  idempotency_key text NOT NULL, request_hash text NOT NULL,
  lease_until timestamptz NOT NULL, attempt integer NOT NULL DEFAULT 1,
  model text, prompt_version text, reserved_tokens integer NOT NULL DEFAULT 0,
  usage jsonb, error_code text, error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notebook_id,kind,idempotency_key), UNIQUE(notebook_id,id)
);
CREATE INDEX IF NOT EXISTS operation_lease ON operation(state,lease_until);
CREATE TABLE IF NOT EXISTS operation_source (
  notebook_id uuid NOT NULL, operation_id uuid NOT NULL, source_id uuid NOT NULL, source_version integer NOT NULL,
  PRIMARY KEY(operation_id,source_id), UNIQUE(notebook_id,operation_id,source_id),
  FOREIGN KEY(notebook_id,operation_id) REFERENCES operation(notebook_id,id) ON DELETE CASCADE,
  FOREIGN KEY(notebook_id,source_id) REFERENCES source(notebook_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY, notebook_id uuid NOT NULL, operation_id uuid NOT NULL, source_id uuid NOT NULL,
  chunk_id uuid, ordinal integer NOT NULL, unavailable_at timestamptz,
  FOREIGN KEY(notebook_id,operation_id,source_id) REFERENCES operation_source(notebook_id,operation_id,source_id) ON DELETE CASCADE,
  FOREIGN KEY(notebook_id,source_id,chunk_id) REFERENCES chunk(notebook_id,source_id,id),
  UNIQUE(notebook_id,operation_id,id)
);
CREATE INDEX IF NOT EXISTS evidence_source ON evidence(source_id);
CREATE TABLE IF NOT EXISTS entry (
  id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook(id) ON DELETE CASCADE,
  operation_id uuid, parent_id uuid,
  kind text NOT NULL CHECK(kind IN ('question','answer','summary','note','quiz')),
  title text, body jsonb, unavailable_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(notebook_id,operation_id) REFERENCES operation(notebook_id,id) ON DELETE CASCADE,
  FOREIGN KEY(notebook_id,parent_id) REFERENCES entry(notebook_id,id) ON DELETE CASCADE,
  UNIQUE(notebook_id,id), UNIQUE(notebook_id,operation_id,id)
);
CREATE INDEX IF NOT EXISTS entry_notebook ON entry(notebook_id,created_at);
CREATE TABLE IF NOT EXISTS citation (
  notebook_id uuid NOT NULL, operation_id uuid NOT NULL, entry_id uuid NOT NULL,
  evidence_id uuid NOT NULL, block_no integer NOT NULL, ordinal integer NOT NULL,
  PRIMARY KEY(entry_id,block_no,ordinal),
  FOREIGN KEY(notebook_id,operation_id,entry_id) REFERENCES entry(notebook_id,operation_id,id) ON DELETE CASCADE,
  FOREIGN KEY(notebook_id,operation_id,evidence_id) REFERENCES evidence(notebook_id,operation_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quota_bucket (
  key text PRIMARY KEY, requests integer NOT NULL DEFAULT 0, tokens bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS schema_version (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_version(version) VALUES(1) ON CONFLICT DO NOTHING;
