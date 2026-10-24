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
export type StudioKind = 'flashcards' | 'quiz' | 'mindmap' | 'report' | 'table';
export type GenerationKind = 'answer' | 'summary' | StudioKind;
export type Block = {
  text: string;
  evidence_ids: string[];
  source_quotes?: { evidence_id: string; text: string }[];
  question?: string;
  options?: string[];
  correct?: number;
  parent?: number;
  cells?: string[];
};
export type Generated = {
  outcome: 'answer' | 'insufficient';
  blocks: Block[];
  format?: StudioKind;
  columns?: string[];
};
export type Entry = {
  id: string;
  notebook_id: string;
  operation_id: string | null;
  kind: 'question' | 'note' | GenerationKind;
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
export type UsageData = {
  scope: 'project' | 'workspace';
  provider: string;
  model: string;
  connected: boolean;
  testMode: boolean;
  day: string;
  refreshAt: string;
  today: {
    requests: number;
    measured: number;
    input: number;
    output: number;
    unknown: number;
    failed: number;
    lifetime: number;
    since: string | null;
  };
  attempts: number;
  requestLimit: number | null;
  budget: { charged: number; limit: number } | null;
  providerSnapshot: { at: string; limits: Record<string, number | string> } | null;
  recent: { kind: string; state: string; total_tokens: number | null; created_at: string }[];
  limits: {
    notebooks: number;
    sources: number;
    fileMiB: number;
    pdfPages: number;
    textChars: number;
    evidenceTokens: number;
    outputTokens: number;
    dailyRequests: number;
    storageMiB: number;
    retentionDays: number;
  };
};
