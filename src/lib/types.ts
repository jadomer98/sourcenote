export type Notebook = {
  id: string;
  title: string;
  emoji: string;
  color: string;
  created_at: string;
  updated_at: string;
  source_count: number;
};
export type Source = {
  id: string;
  notebook_id: string;
  title: string;
  mime: string;
  bytes: number;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'deleting' | 'deleted';
  char_count: number;
  page_count: number | null;
  error_message: string | null;
  created_at: string;
};
export type Citation = {
  evidence_id: string;
  source_id: string;
  title: string;
  page_no: number | null;
  block_no: number;
  ordinal: number;
};
export type Block = { text: string; evidence_ids: string[] };
export type Generated = { outcome: 'answer' | 'insufficient'; blocks: Block[] };
export type Entry = {
  id: string;
  notebook_id: string;
  operation_id: string | null;
  kind: 'question' | 'answer' | 'summary' | 'note' | 'quiz';
  title: string | null;
  body: Generated | null;
  unavailable_at: string | null;
  created_at: string;
  citations: Citation[];
};
export type Workspace = {
  notebook: Notebook;
  sources: Source[];
  entries: Entry[];
  operations: { id: string; kind: string; state: string; error_message: string | null }[];
};
export type Bootstrap = {
  csrf: string;
  expiresAt: string;
  aiReady: boolean;
  model: string;
  provider: string;
  testMode: boolean;
  notebooks: Notebook[];
  usage: number;
  requestLimit: number;
};
