-- Additive migration: the previous release continues to work with this schema.
ALTER TABLE operation DROP CONSTRAINT IF EXISTS operation_kind_check;
ALTER TABLE operation ADD CONSTRAINT operation_kind_check CHECK(kind IN ('ingest','answer','summary','quiz','flashcards','mindmap','report','table'));
ALTER TABLE entry DROP CONSTRAINT IF EXISTS entry_kind_check;
ALTER TABLE entry ADD CONSTRAINT entry_kind_check CHECK(kind IN ('question','answer','summary','note','quiz','flashcards','mindmap','report','table'));
-- Deliberately independent of notebooks/operations so deletion cannot reset usage.
-- No prompts, documents, outputs or credentials are stored in this ledger.
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES workspace_owner(id) ON DELETE SET NULL,
  provider text NOT NULL, model text NOT NULL, kind text NOT NULL,
  state text NOT NULL DEFAULT 'pending', http_status integer,
  input_tokens integer, output_tokens integer, total_tokens integer,
  provider_limits jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_date ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS ai_usage_owner_date ON ai_usage(owner_id,created_at);
-- Preserve historical totals still available in existing operations. Other
-- historical counts may already have been deleted and cannot be reconstructed.
INSERT INTO ai_usage(id,owner_id,provider,model,kind,state,total_tokens,created_at)
SELECT o.id,n.owner_id,'legacy',coalesce(o.model,'unknown'),o.kind,o.state,
       (o.usage->>'total_tokens')::integer,o.created_at
FROM operation o JOIN notebook n ON n.id=o.notebook_id
WHERE o.kind<>'ingest'
ON CONFLICT DO NOTHING;
INSERT INTO schema_version(version) VALUES(2) ON CONFLICT DO NOTHING;
