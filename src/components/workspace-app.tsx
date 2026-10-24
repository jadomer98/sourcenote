'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from 'react';
import {
  Activity,
  Layers,
  GitBranch,
  Table2,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  FlaskConical,
  Home,
  Leaf,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  NotebookPen,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { StudioContent } from './studio-content';
import { UsageDashboard } from './usage-dashboard';
import { studioTools } from '@/lib/studio';
import type {
  Bootstrap,
  Notebook,
  Source,
  Entry,
  Workspace,
  Citation,
  GenerationKind,
} from '@/lib/types';

type DialogState = {
  type: 'create' | 'rename' | 'delete' | 'add' | 'info' | 'viewer' | 'artifact' | 'usage';
  source?: Source;
  entry?: Entry;
  title?: string;
  text?: string;
  page?: number | null;
  chunks?: { text: string; page_no: number | null }[];
} | null;
type ApiError = Error & { code?: string };
const suggestions = [
  'Was sind die wichtigsten Ziele und Maßnahmen?',
  'Wie setzt sich das Budget zusammen?',
  'Welche Fragen sind noch offen?',
];
const palette = ['blue', 'peach', 'green', 'purple'];
function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true">
      <NotebookPen size={small ? 18 : 24} />
    </span>
  );
}
function BookIcon({ name, size = 25 }: { name: string; size?: number }) {
  const Icon =
    (
      { sun: Sun, leaf: Leaf, lightbulb: Lightbulb, flask: FlaskConical } as Record<
        string,
        typeof Sun
      >
    )[name] || BookOpen;
  return <Icon size={size} strokeWidth={1.7} />;
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Schließen">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function SafeMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {text}
    </Markdown>
  );
}
function date(value: string) {
  return new Date(value).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function WorkspaceApp() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [tab, setTab] = useState<'sources' | 'chat' | 'studio'>('chat');
  const [railOpen, setRailOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [addMode, setAddMode] = useState<'file' | 'text'>('file');
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formColor, setFormColor] = useState('blue');
  const [formEmoji, setFormEmoji] = useState('book');
  const fileInput = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const workspaceId = useRef<string | null>(null);
  const csrf = useRef('');
  const bootRequest = useRef<Promise<Bootstrap> | null>(null);
  async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch('/api/' + path, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : options.body
            ? { 'Content-Type': 'application/json' }
            : {}),
        'x-csrf-token': csrf.current,
        ...options.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      const e = new Error(data.error || 'Die Anfrage ist fehlgeschlagen.') as ApiError;
      e.code = data.code;
      throw e;
    }
    return data;
  }
  function notify(message: string) {
    setToast(message);
  }
  async function refreshBootstrap() {
    const data = await api<Bootstrap>('bootstrap');
    csrf.current = data.csrf;
    setBootstrap(data);
    return data;
  }
  function applySelection(id: string, data: Workspace, initialize = false) {
    const ready = data.sources.filter((s) => s.status === 'ready').map((s) => s.id);
    if (initialize) {
      try {
        const stored = localStorage.getItem('sourcenote:selection:' + id);
        setSelected(stored ? JSON.parse(stored).filter((s: string) => ready.includes(s)) : ready);
      } catch {
        setSelected(ready);
      }
    } else setSelected((old) => old.filter((s) => ready.includes(s)));
  }
  async function openNotebook(id: string, updateUrl = true) {
    workspaceId.current = id;
    setLoading(true);
    setError('');
    setRailOpen(false);
    try {
      const data = await api<Workspace>('notebooks/' + id);
      if (workspaceId.current !== id) return;
      setWorkspace(data);
      applySelection(id, data, true);
      setTab('chat');
      if (updateUrl) history.pushState({}, '', `/?notebook=${id}`);
    } catch (e) {
      setError((e as Error).message);
      workspaceId.current = null;
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }
  async function refreshWorkspace() {
    const id = workspaceId.current;
    if (!id) return;
    const data = await api<Workspace>('notebooks/' + id);
    if (id !== workspaceId.current) return;
    setWorkspace(data);
    applySelection(id, data);
    return data;
  }
  function goHome(updateUrl = true) {
    workspaceId.current = null;
    setWorkspace(null);
    setError('');
    setRailOpen(false);
    if (updateUrl) history.pushState({}, '', '/');
    void refreshBootstrap().catch((e) => setError(e.message));
  }
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        await (bootRequest.current ??= refreshBootstrap());
        if (!active) return;
        const id = new URLSearchParams(location.search).get('notebook');
        if (id && /^[a-f0-9-]{36}$/.test(id)) await openNotebook(id, false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    const pop = () => {
      const id = new URLSearchParams(location.search).get('notebook');
      if (id) void openNotebook(id, false);
      else goHome(false);
    };
    window.addEventListener('popstate', pop);
    return () => {
      active = false;
      window.removeEventListener('popstate', pop);
    };
    // Initial session synchronization is intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (workspace)
      try {
        localStorage.setItem(
          'sourcenote:selection:' + workspace.notebook.id,
          JSON.stringify(selected),
        );
      } catch {
        /* unavailable storage does not prevent use */
      }
  }, [selected, workspace]);
  useEffect(() => {
    if (
      workspace?.entries.some((e) => e.kind === 'answer' || e.kind === 'question') ||
      (busy && ['answer', ...studioTools.map((t) => t.kind)].includes(busy))
    ) {
      const pane = chatEnd.current?.parentElement;
      pane?.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
    }
  }, [workspace?.entries, busy]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const remoteBusy = workspace?.operations.some((o) => o.state === 'running') || false;
  useEffect(() => {
    if (
      !remoteBusy &&
      !workspace?.sources.some((s) => ['pending', 'processing'].includes(s.status))
    )
      return;
    const timer = setInterval(() => void refreshWorkspace().catch(() => {}), 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteBusy, workspace?.sources]);
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  function showCreate() {
    setFormTitle('');
    setFormColor(palette[(bootstrap?.notebooks.length || 0) % 4]);
    setFormEmoji('book');
    setDialog({ type: 'create' });
  }
  function showAdd() {
    setAddMode('file');
    setFormTitle('');
    setFormText('');
    setDialog({ type: 'add' });
  }
  async function createBook(event: FormEvent) {
    event.preventDefault();
    await run('create', async () => {
      const { id } = await api<{ id: string }>('notebooks', {
        method: 'POST',
        body: JSON.stringify({ title: formTitle, emoji: formEmoji, color: formColor }),
      });
      setDialog(null);
      await refreshBootstrap();
      await openNotebook(id);
      notify('Dein Notebook ist bereit.');
    });
  }
  async function seed() {
    await run('demo', async () => {
      const { id } = await api<{ id: string }>('demo', { method: 'POST' });
      await refreshBootstrap();
      await openNotebook(id);
      notify('Zwei Beispielquellen sind bereit. Stelle deine erste Frage.');
    });
  }
  async function upload(file?: File) {
    if (!workspace) return;
    if (file && file.size > 4 * 1024 * 1024) {
      setError('Die Datei ist zu groß. Maximal 4 MiB pro Quelle.');
      return;
    }
    const id = workspace.notebook.id;
    await run('upload', async () => {
      const data = new FormData();
      if (file) data.set('file', file);
      else data.set('text', formText);
      data.set('title', formTitle.trim() || file?.name || 'Textquelle');
      data.set('key', crypto.randomUUID());
      setDialog(null);
      const result = await api<{ id: string }>(`notebooks/${id}/sources`, {
        method: 'POST',
        body: data,
      });
      const next = await refreshWorkspace();
      if (next?.sources.find((s) => s.id === result.id)?.status === 'ready') {
        setSelected((old) => [...new Set([...old, result.id])]);
        notify('Quelle verarbeitet und ausgewählt.');
      } else
        setError(
          next?.sources.find((s) => s.id === result.id)?.error_message ||
            'Die Quelle konnte nicht verarbeitet werden.',
        );
      await refreshBootstrap();
    });
  }
  async function ask(text = question, kind: GenerationKind = 'answer') {
    if (!workspace || !text.trim() || busy || remoteBusy) return;
    const id = workspace.notebook.id;
    setPendingQuestion(kind === 'answer' ? text : '');
    if (kind === 'answer') setQuestion('');
    await run(kind, async () => {
      try {
        const result = await api<{ id: string }>(`notebooks/${id}/generate`, {
          method: 'POST',
          body: JSON.stringify({
            sourceIds: selected,
            question: text,
            kind,
            key: crypto.randomUUID(),
          }),
        });
        if (kind !== 'answer') {
          setTab('studio');
          notify((studioTools.find((t) => t.kind === kind)?.title || 'Inhalt') + ' ist bereit.');
          const next = await refreshWorkspace();
          const created = next?.entries.find(
            (e) => e.operation_id === result.id && e.kind === kind,
          );
          if (created) setDialog({ type: 'artifact', entry: created });
        }
      } finally {
        await refreshWorkspace();
        await refreshBootstrap();
      }
    });
    setPendingQuestion('');
  }
  async function openSource(source: Source) {
    await run('preview', async () => {
      const result = await api<{ chunks: { text: string; page_no: number | null }[] }>(
        `notebooks/${source.notebook_id}/sources/${source.id}`,
      );
      setDialog({ type: 'viewer', source, title: source.title, chunks: result.chunks });
    });
  }
  async function openCitation(entry: Entry, citation: Citation) {
    await run('citation', async () => {
      const result = await api<{ text: string; title: string; page_no: number | null }>(
        `notebooks/${entry.notebook_id}/citations/${entry.id}/${citation.evidence_id}`,
      );
      setDialog({ type: 'viewer', title: result.title, text: result.text, page: result.page_no });
    });
  }
  async function save(entry: Entry) {
    await run('save', async () => {
      await api(`notebooks/${entry.notebook_id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ entryId: entry.id }),
      });
      await refreshWorkspace();
      notify('Antwort im Studio gespeichert.');
    });
  }
  function exportEntry(entry: Entry) {
    const text =
      `# ${entry.title || 'SourceNote · Antwort'}\n\n` +
      (entry.body?.blocks
        .map(
          (block, i) =>
            (block.question ? '### ' + block.question + '\n\n' : '') +
            (block.options
              ? block.options
                  .map((o, j) => '- ' + o + (j === block.correct ? ' (richtig)' : ''))
                  .join('\n') + '\n\n'
              : '') +
            (block.cells ? block.cells.join(' | ') + '\n' : '') +
            block.text +
            '\n' +
            entry.citations
              .filter((c) => c.block_no === i)
              .map((c) => `- Quelle: ${c.title}${c.page_no ? ' · Seite ' + c.page_no : ''}`)
              .join('\n'),
        )
        .join('\n\n') || 'Quelle nicht mehr verfügbar.');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sourcenote-notiz.md';
    link.click();
    URL.revokeObjectURL(url);
    notify('Als Markdown exportiert.');
  }
  function renderCitations(entry: Entry, i: number) {
    return entry.citations
      .filter((c) => c.block_no === i)
      .map((c, index) => (
        <button
          className="citation"
          title={`Beleg aus ${c.title}`}
          aria-label={`Beleg ${index + 1} aus ${c.title} öffnen`}
          key={c.evidence_id}
          onClick={() => void openCitation(entry, c)}
        >
          <FileText size={11} />
          {index + 1}
          {c.page_no ? ` · S. ${c.page_no}` : ''}
        </button>
      ));
  }
  function renderEntry(entry: Entry) {
    if (!entry.body)
      return (
        <p className="unavailable">
          Dieser Inhalt ist nicht mehr verfügbar, weil eine verwendete Quelle entfernt wurde.
        </p>
      );
    return entry.body.blocks.map((block, i) => (
      <div className="answer-block" key={i}>
        <SafeMarkdown text={block.text} />
        {renderCitations(entry, i)}
      </div>
    ));
  }
  const filtered =
    bootstrap?.notebooks.filter((n) =>
      n.title.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de')),
    ) || [];
  const ready = workspace?.sources.filter((s) => s.status === 'ready') || [];
  const chat = workspace?.entries.filter((e) => e.kind === 'question' || e.kind === 'answer') || [];
  const artifacts =
    workspace?.entries.filter((e) => e.kind !== 'answer' && e.kind !== 'question') || [];
  const isGeneration = !!busy && ['answer', ...studioTools.map((t) => t.kind)].includes(busy);
  return (
    <div className={`app-shell ${workspace ? 'in-notebook' : ''}`}>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <aside className={`nav-rail ${railOpen ? 'open' : ''}`} aria-label="Hauptnavigation">
        <button className="brand" onClick={() => goHome()} aria-label="SourceNote Startseite">
          <Logo />
          <span>
            Source<span className="brand-light">Note</span>
          </span>
        </button>
        <button className={`nav-item ${!workspace ? 'active' : ''}`} onClick={() => goHome()}>
          <Home size={18} />
          Meine Notebooks<span>{bootstrap?.notebooks.length || 0}</span>
        </button>
        <div className="rail-section-label">
          DEIN ARBEITSBEREICH
          <button onClick={showCreate} className="icon-button" aria-label="Notebook erstellen">
            <Plus size={16} />
          </button>
        </div>
        <nav className="notebook-nav">
          {bootstrap?.notebooks.map((n) => (
            <button
              key={n.id}
              className={`nav-notebook ${workspace?.notebook.id === n.id ? 'selected' : ''}`}
              onClick={() => void openNotebook(n.id)}
            >
              <span className={`mini-book ${n.color}`}>
                <BookIcon name={n.emoji} size={15} />
              </span>
              <span>{n.title}</span>
            </button>
          ))}
          {bootstrap?.notebooks.length === 0 && (
            <p className="rail-empty">Hier beginnt deine nächste gute Idee.</p>
          )}
        </nav>
        <div className="rail-bottom">
          <button
            className="nav-item"
            onClick={() => {
              setRailOpen(false);
              setDialog({ type: 'usage' });
            }}
          >
            <Activity size={18} /> Nutzung & Limits
          </button>
          <div className="private-badge">
            <ShieldCheck size={17} />
            <div>
              <strong>Dein privater Denkraum</strong>
              <span>Isoliert. Für 7 Tage gespeichert.</span>
            </div>
          </div>
          <button className="nav-item" onClick={() => setDialog({ type: 'info' })}>
            <CircleHelp size={18} />
            Über SourceNote
            <ArrowUp size={14} className="rotate" />
          </button>
          <div className="profile">
            <span className="avatar">G</span>
            <div>
              <strong>Gast-Arbeitsbereich</strong>
              <span>Kostenloser Demo-Zugang</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      {railOpen && (
        <button
          aria-label="Navigation schließen"
          className="rail-backdrop"
          onClick={() => setRailOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setRailOpen((v) => !v)}
              aria-label="Navigation öffnen"
            >
              <PanelLeftClose size={20} />
            </button>
            <button onClick={() => goHome()}>Arbeitsbereich</button>
            {workspace && (
              <>
                <ChevronRight size={15} />
                <span>{workspace.notebook.title}</span>
              </>
            )}
          </div>
          <div className="topbar-end">
            <button
              className="usage-shortcut"
              aria-label="Nutzung und Limits öffnen"
              onClick={() => setDialog({ type: 'usage' })}
            >
              <Activity size={16} />
              <span>
                {bootstrap?.usage || 0}/{bootstrap?.requestLimit || 30} heute
              </span>
            </button>
            <span className="topbar-private">
              <ShieldCheck size={14} />
              Privater Bereich
            </span>
            <button
              className="help-button"
              onClick={() => setDialog({ type: 'info' })}
              aria-label="Hilfe und Projektinformationen"
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar small-avatar">G</span>
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            <CircleHelp size={17} />
            <span>{error}</span>
            <button
              className="icon-button"
              onClick={() => setError('')}
              aria-label="Fehlermeldung schließen"
            >
              <X size={17} />
            </button>
          </div>
        )}
        {bootstrap?.testMode && (
          <div className="test-mode-banner">
            Automatisierter Testmodus · keine echte KI · nicht für die Live-Demo verwenden
          </div>
        )}
        {bootstrap && !bootstrap.aiReady && (
          <div className="setup-banner">
            <Sparkles size={15} />
            <span>
              Quellen und Notebooks sind bereit. Die KI wird verfügbar, sobald ein kostenloser
              Anbieter verbunden ist.
            </span>
            <button onClick={() => setDialog({ type: 'info' })}>
              Mehr erfahren
              <ArrowRight size={13} />
            </button>
          </div>
        )}
        {loading ? (
          <main className="loading-state" id="main">
            <Logo />
            <LoaderCircle className="spin" size={24} />
            <p>Dein Denkraum wird vorbereitet …</p>
          </main>
        ) : !workspace ? (
          <main className="home-content" id="main">
            <section className="welcome">
              <div>
                <span className="eyebrow">
                  <span />
                  DEIN WISSEN, GUT VERBUNDEN
                </span>
                <h1>
                  Gute Gedanken
                  <br />
                  beginnen mit guten Quellen<span>.</span>
                </h1>
                <p>
                  Sammle, was dich beschäftigt. Stelle Fragen.
                  <br />
                  Und finde Antworten, denen du auf den Grund gehen kannst.
                </p>
                <button className="primary hero-button" onClick={showCreate}>
                  <Plus size={18} />
                  Notebook erstellen
                </button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <div className="floating-spark">
                  <Sparkles size={24} />
                </div>
                <div className="art-card art-back">
                  <FileText size={30} />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="art-card art-front">
                  <div className="art-card-header">
                    <Logo small />
                    <span>Eine neue Perspektive</span>
                  </div>
                  <i />
                  <i />
                  <i />
                  <div className="art-answer">
                    <Sparkles size={16} />
                    <div>
                      <b>Wissen wird klar.</b>
                      <span>Mit Quellen, die es belegen.</span>
                    </div>
                    <span className="art-cite">1</span>
                  </div>
                </div>
                <span className="floating-check">
                  <Check size={18} />
                </span>
              </div>
            </section>
            <section className="notebooks-section">
              <div className="section-toolbar">
                <div>
                  <h2>
                    Meine Notebooks{' '}
                    <span className="count">{bootstrap?.notebooks.length || 0}</span>
                  </h2>
                  <p>Deine Themen. Dein Überblick.</p>
                </div>
                <label className="search-field">
                  <Search size={17} />
                  <input
                    placeholder="Notebooks durchsuchen"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Notebooks durchsuchen"
                  />
                  <kbd>⌕</kbd>
                </label>
              </div>
              <div className="notebook-grid">
                {filtered.map((n) => (
                  <NotebookCard key={n.id} book={n} onOpen={() => void openNotebook(n.id)} />
                ))}
                {!search && (
                  <button className="new-notebook-card" onClick={showCreate}>
                    <span>
                      <Plus size={25} />
                    </span>
                    <strong>Raum für eine neue Idee</strong>
                    <p>Quellen hinzufügen. Zusammenhänge entdecken.</p>
                  </button>
                )}
              </div>
              {search && !filtered.length && (
                <div className="empty-search">
                  <Search size={25} />
                  <h3>Kein passendes Notebook</h3>
                  <p>Versuche einen anderen Suchbegriff.</p>
                </div>
              )}
            </section>
            {!search && (
              <section className="example-banner">
                <div className="example-icon">
                  <Sun size={27} />
                </div>
                <div>
                  <span className="eyebrow">EINFACH MAL AUSPROBIEREN</span>
                  <h3>Von der Quelle zur ersten Erkenntnis.</h3>
                  <p>
                    Entdecke den Beispielbereich „Projekt Morgenlicht“ mit zwei fertigen Quellen.
                  </p>
                </div>
                <button className="secondary" disabled={!!busy} onClick={() => void seed()}>
                  {busy === 'demo' ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}
                  Beispiel erkunden
                  <ArrowRight size={15} />
                </button>
              </section>
            )}
            <footer className="home-footer">
              <Logo small />
              <span>SourceNote — weniger suchen, mehr verstehen.</span>
              <span>Ein unabhängiges NotebookLM-inspiriertes Projekt.</span>
            </footer>
          </main>
        ) : (
          <main className="workspace-content" id="main">
            <div className="notebook-heading">
              <div className="notebook-heading-left">
                <button
                  className="icon-button back-home"
                  onClick={() => goHome()}
                  aria-label="Zurück zu Notebooks"
                >
                  <ArrowLeft size={19} />
                </button>
                <span className={`book-symbol ${workspace.notebook.color}`}>
                  <BookIcon name={workspace.notebook.emoji} size={25} />
                </span>
                <div>
                  <div className="title-row">
                    <h1>{workspace.notebook.title}</h1>
                    <button
                      className="icon-button"
                      aria-label="Notebook umbenennen"
                      onClick={() => {
                        setFormTitle(workspace.notebook.title);
                        setDialog({ type: 'rename' });
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                  <span className="notebook-meta">
                    {workspace.sources.length} Quellen<span>·</span>Zuletzt bearbeitet am{' '}
                    {date(workspace.notebook.updated_at)}
                  </span>
                </div>
              </div>
              <div className="notebook-heading-actions">
                <span>
                  <CheckCheck size={15} />
                  Gespeichert
                </span>
                <button
                  className="icon-button"
                  aria-label="Notebook löschen"
                  onClick={() => setDialog({ type: 'delete' })}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <div className="mobile-tabs" role="tablist" aria-label="Notebook-Bereiche">
              {(['sources', 'chat', 'studio'] as const).map((t) => (
                <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)}>
                  {t === 'sources' ? (
                    <FileText size={16} />
                  ) : t === 'chat' ? (
                    <MessageCircle size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}{' '}
                  {t === 'sources' ? 'Quellen' : t === 'chat' ? 'Chat' : 'Studio'}
                </button>
              ))}
            </div>
            <div className="workspace-grid">
              <section
                className={`sources-panel panel ${tab === 'sources' ? 'mobile-active' : ''}`}
                aria-label="Quellen"
              >
                <div className="panel-heading">
                  <h2>
                    <FileText size={17} />
                    Quellen <span className="count">{workspace.sources.length}</span>
                  </h2>
                  <button className="icon-button" onClick={showAdd} aria-label="Quelle hinzufügen">
                    <Plus size={18} />
                  </button>
                </div>
                <button className="add-source" onClick={showAdd} disabled={!!busy}>
                  <Plus size={17} />
                  Quellen hinzufügen
                </button>
                <div className="source-selection">
                  <label>
                    <input
                      type="checkbox"
                      checked={ready.length > 0 && selected.length === ready.length}
                      disabled={!ready.length}
                      onChange={(e) => setSelected(e.target.checked ? ready.map((s) => s.id) : [])}
                    />
                    Alle Quellen auswählen
                  </label>
                  <span>
                    {selected.length}/{ready.length}
                  </span>
                </div>
                <div className="source-list">
                  {workspace.sources.map((source) => (
                    <div
                      className={`source-row ${selected.includes(source.id) ? 'checked' : ''}`}
                      key={source.id}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${source.title} auswählen`}
                        disabled={source.status !== 'ready'}
                        checked={selected.includes(source.id)}
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [...old, source.id]
                              : old.filter((s) => s !== source.id),
                          )
                        }
                      />
                      <button
                        className="source-info"
                        disabled={source.status !== 'ready'}
                        onClick={() => void openSource(source)}
                      >
                        <span
                          className={`source-file-icon ${source.mime === 'application/pdf' ? 'pdf' : ''}`}
                        >
                          <FileText size={17} />
                        </span>
                        <span>
                          <strong>{source.title}</strong>
                          <small>
                            {source.status === 'ready'
                              ? `${source.mime === 'application/pdf' ? 'PDF · ' + source.page_count + ' S.' : 'Text'} · ${new Intl.NumberFormat('de').format(source.char_count)} Zeichen`
                              : source.status === 'failed'
                                ? 'Verarbeitung fehlgeschlagen'
                                : 'Wird verarbeitet …'}
                          </small>
                        </span>
                      </button>
                      <button
                        className="icon-button source-delete"
                        aria-label={`${source.title} entfernen`}
                        onClick={() =>
                          void run('delete-source', async () => {
                            await api(`notebooks/${workspace.notebook.id}/sources/${source.id}`, {
                              method: 'DELETE',
                            });
                            await refreshWorkspace();
                            notify('Quelle und davon abhängige Inhalte entfernt.');
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                      {source.status === 'failed' && (
                        <div className="source-error">
                          <p>{source.error_message}</p>
                          <button
                            disabled={!!busy}
                            onClick={() =>
                              void run('retry-source', async () => {
                                await api(
                                  `notebooks/${workspace.notebook.id}/sources/${source.id}/retry`,
                                  { method: 'POST' },
                                );
                                await refreshWorkspace();
                              })
                            }
                          >
                            Erneut versuchen
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {busy === 'upload' && (
                    <div className="source-processing">
                      <LoaderCircle size={18} className="spin" />
                      <span>Quelle wird gelesen und vorbereitet …</span>
                    </div>
                  )}
                  {!workspace.sources.length && busy !== 'upload' && (
                    <div className="source-empty">
                      <FileText size={29} />
                      <h3>Hier beginnt dein Wissen</h3>
                      <p>Lade eine Text-PDF hoch oder füge eigene Notizen ein.</p>
                      <span>PDF, TXT, Markdown · bis 4 MiB</span>
                    </div>
                  )}
                </div>
                <div className="source-footer">
                  <ShieldCheck size={15} />
                  <p>Nur ausgewählte Quellen fließen in neue Antworten ein.</p>
                </div>
              </section>
              <section
                className={`chat-panel panel ${tab === 'chat' ? 'mobile-active' : ''}`}
                aria-label="Chat"
              >
                <div className="panel-heading">
                  <h2>
                    <MessageCircle size={18} />
                    Chat
                  </h2>
                  <span className="grounded-label">
                    <span />
                    Quellenbasiert
                  </span>
                </div>
                <div className="chat-scroll" role="log" aria-label="Gespräch" aria-live="polite">
                  {!chat.length && !pendingQuestion && (
                    <div className="chat-intro">
                      <span className="chat-spark">
                        <Sparkles size={29} />
                      </span>
                      <span className="eyebrow">NEUE QUELLEN. NEUE PERSPEKTIVEN.</span>
                      <h2>
                        Was möchtest du
                        <br />
                        herausfinden?
                      </h2>
                      <p>
                        {ready.length
                          ? 'Deine Quellen sind bereit. Stelle eine Frage und entdecke die Belege hinter jeder Antwort.'
                          : 'Füge zuerst eine Quelle hinzu. Dann kannst du Fragen stellen und Antworten direkt überprüfen.'}
                      </p>
                      <div className="suggestions">
                        {suggestions.map((s, i) => (
                          <button
                            key={s}
                            disabled={!selected.length || !!busy || !bootstrap?.aiReady}
                            onClick={() => void ask(s)}
                          >
                            <span>
                              {i === 0 ? (
                                <Lightbulb size={17} />
                              ) : i === 1 ? (
                                <FileText size={17} />
                              ) : (
                                <CircleHelp size={17} />
                              )}
                            </span>
                            {s}
                            <ArrowUp size={15} className="rotate" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chat.map((entry) => (
                    <article
                      key={entry.id}
                      className={`chat-message ${entry.kind === 'question' ? 'user-message' : 'assistant-message'}`}
                    >
                      {entry.kind === 'answer' && (
                        <div className="assistant-label">
                          <Logo small />
                          <strong>SourceNote</strong>
                          {entry.body?.outcome === 'insufficient' && (
                            <span>Keine ausreichenden Belege</span>
                          )}
                        </div>
                      )}
                      <div className="message-body">
                        {entry.kind === 'question' ? (
                          <p>{entry.body?.blocks[0]?.text}</p>
                        ) : (
                          renderEntry(entry)
                        )}
                      </div>
                      {entry.kind === 'answer' && entry.body && (
                        <div className="answer-actions">
                          <button disabled={!!busy} onClick={() => void save(entry)}>
                            <StickyNote size={14} />
                            Als Notiz speichern
                          </button>
                          <button
                            onClick={() => exportEntry(entry)}
                            aria-label="Antwort exportieren"
                          >
                            <ArrowDownToLine size={14} />
                          </button>
                          <span>{date(entry.created_at)}</span>
                        </div>
                      )}
                    </article>
                  ))}
                  {pendingQuestion && isGeneration && (
                    <article className="chat-message user-message">
                      <div className="message-body">
                        <p>{pendingQuestion}</p>
                      </div>
                    </article>
                  )}
                  {(isGeneration || remoteBusy) && (
                    <div className="thinking">
                      <Sparkles size={17} />
                      <span>
                        {busy === 'summary'
                          ? 'Dein Quellenüberblick entsteht'
                          : busy === 'quiz'
                            ? 'Dein Wissenscheck entsteht'
                            : 'Die Quellen werden ausgewertet'}
                        <span className="dots">…</span>
                      </span>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
                <div className="composer-area">
                  <form
                    className="composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void ask();
                    }}
                  >
                    <textarea
                      ref={composer}
                      aria-label="Frage an deine Quellen"
                      placeholder={
                        selected.length
                          ? 'Stelle eine Frage an deine Quellen …'
                          : 'Wähle zuerst mindestens eine Quelle aus …'
                      }
                      value={question}
                      maxLength={1500}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void ask();
                        }
                      }}
                      rows={2}
                    />
                    <div className="composer-bottom">
                      <span className="selection-pill">
                        <FileText size={12} />
                        {selected.length} {selected.length === 1 ? 'Quelle' : 'Quellen'}
                        <ChevronDown size={12} />
                      </span>
                      <button
                        className="send-button"
                        aria-label="Frage senden"
                        disabled={
                          !question.trim() ||
                          !selected.length ||
                          !!busy ||
                          remoteBusy ||
                          !bootstrap?.aiReady
                        }
                      >
                        {busy === 'answer' ? (
                          <LoaderCircle className="spin" size={18} />
                        ) : (
                          <ArrowUp size={19} />
                        )}
                      </button>
                    </div>
                  </form>
                  <p className="composer-footnote">
                    KI kann Fehler machen. Prüfe die Belege.
                    <span>
                      {bootstrap?.usage || 0}/{bootstrap?.requestLimit || 30} heute
                    </span>
                  </p>
                </div>
              </section>
              <section
                className={`studio-panel panel ${tab === 'studio' ? 'mobile-active' : ''}`}
                aria-label="Studio"
              >
                <div className="panel-heading">
                  <h2>
                    <Sparkles size={18} />
                    Studio
                  </h2>
                  <span className="count">{artifacts.length}</span>
                </div>
                <div className="studio-scroll">
                  <p className="studio-intro">
                    Mach aus deinen Quellen
                    <br />
                    <strong>etwas, das bleibt.</strong>
                  </p>
                  <div className="studio-tools-grid">
                    {studioTools.map((tool) => {
                      const Icon = {
                        summary: FileText,
                        flashcards: Layers,
                        quiz: Lightbulb,
                        mindmap: GitBranch,
                        report: NotebookPen,
                        table: Table2,
                      }[tool.kind];
                      return (
                        <button
                          key={tool.kind}
                          className={`studio-tool ${tool.kind}-tool`}
                          disabled={!selected.length || !!busy || remoteBusy || !bootstrap?.aiReady}
                          onClick={() =>
                            void ask(
                              tool.title + ' aus den ausgewählten Quellen erstellen.',
                              tool.kind,
                            )
                          }
                        >
                          <span className="tool-icon">
                            <Icon size={22} />
                          </span>
                          <div>
                            <strong>{tool.title}</strong>
                            <span>{tool.description}</span>
                          </div>
                          {busy === tool.kind ? (
                            <LoaderCircle size={16} className="spin" />
                          ) : (
                            <Plus size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="studio-footnote studio-generation-hint">
                    Einmal erstellen. Immer wieder nutzen. Jede Erstellung zählt als eine
                    KI-Anfrage.
                  </p>
                  <div className="studio-divider">
                    <span>GESPEICHERTE INHALTE</span>
                    <span>{artifacts.length}</span>
                  </div>
                  {artifacts.map((entry) => (
                    <button
                      className="artifact-card"
                      key={entry.id}
                      onClick={() => setDialog({ type: 'artifact', entry })}
                    >
                      <span className={`artifact-icon ${entry.kind}`}>
                        {entry.kind === 'note' ? (
                          <StickyNote size={18} />
                        ) : entry.kind === 'quiz' ? (
                          <Lightbulb size={18} />
                        ) : entry.kind === 'flashcards' ? (
                          <Layers size={18} />
                        ) : entry.kind === 'mindmap' ? (
                          <GitBranch size={18} />
                        ) : entry.kind === 'table' ? (
                          <Table2 size={18} />
                        ) : entry.kind === 'report' ? (
                          <NotebookPen size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </span>
                      <div>
                        <strong>{entry.title || 'Gespeicherte Notiz'}</strong>
                        <p>
                          {entry.body?.blocks[0]?.text.replace(/[#*]/g, '').slice(0, 90) ||
                            'Verwendete Quelle entfernt'}
                        </p>
                        <small>
                          {date(entry.created_at)} ·{' '}
                          {entry.kind === 'note'
                            ? 'Notiz'
                            : entry.kind === 'quiz'
                              ? 'Wissenscheck'
                              : 'Überblick'}
                        </small>
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  {!artifacts.length && (
                    <div className="studio-empty">
                      <div className="note-illustration">
                        <StickyNote size={35} strokeWidth={1} />
                        <span>
                          <Plus size={12} />
                        </span>
                      </div>
                      <h3>Gedanken festhalten</h3>
                      <p>
                        Speichere hilfreiche Antworten als Notiz oder erstelle einen
                        Quellenüberblick.
                      </p>
                    </div>
                  )}
                </div>
                <div className="studio-footer">
                  <Sparkles size={14} />
                  Aus deinen Quellen. Für deine Ideen.
                </div>
              </section>
            </div>
          </main>
        )}
      </div>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <Check size={16} />
            {toast}
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.txt,.md"
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Quelldatei auswählen"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />
      {dialog && (
        <Modal
          title={
            dialog.type === 'create'
              ? 'Ein neuer Raum für deine Ideen'
              : dialog.type === 'rename'
                ? 'Notebook umbenennen'
                : dialog.type === 'delete'
                  ? 'Notebook löschen?'
                  : dialog.type === 'add'
                    ? 'Wissen beginnt mit einer Quelle'
                    : dialog.type === 'usage'
                      ? 'Nutzung & Limits'
                      : dialog.type === 'info'
                        ? 'Über SourceNote'
                        : dialog.type === 'artifact'
                          ? dialog.entry?.title || 'Gespeicherter Inhalt'
                          : dialog.title || 'Quelle'
          }
          onClose={() => setDialog(null)}
          wide={dialog.type === 'viewer' || dialog.type === 'artifact' || dialog.type === 'usage'}
        >
          {(dialog.type === 'create' || dialog.type === 'rename') && (
            <form
              className="modal-body"
              onSubmit={
                dialog.type === 'create'
                  ? createBook
                  : (e) => {
                      e.preventDefault();
                      void run('rename', async () => {
                        await api(`notebooks/${workspace!.notebook.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ title: formTitle }),
                        });
                        setDialog(null);
                        await refreshWorkspace();
                        await refreshBootstrap();
                      });
                    }
              }
            >
              <p className="muted">
                {dialog.type === 'create'
                  ? 'Ein Thema, alle Quellen, neue Erkenntnisse.'
                  : 'Gib deinem Thema einen passenden Namen.'}
              </p>
              <label className="field-label">
                Notebook-Titel
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="z. B. Meine nächste große Idee"
                />
              </label>
              {dialog.type === 'create' && (
                <>
                  <span className="field-label">Dein Stil</span>
                  <div className="style-picker">
                    {palette.map((color) => (
                      <button
                        type="button"
                        aria-label={`Farbe ${color}`}
                        aria-pressed={formColor === color}
                        className={`color-dot ${color} ${formColor === color ? 'picked' : ''}`}
                        key={color}
                        onClick={() => setFormColor(color)}
                      >
                        {formColor === color && <Check size={16} />}
                      </button>
                    ))}
                    <span />
                    {['book', 'sun', 'leaf', 'lightbulb', 'flask'].map((emoji) => (
                      <button
                        className={`emoji-choice ${formEmoji === emoji ? 'picked' : ''}`}
                        key={emoji}
                        type="button"
                        aria-label={`Symbol ${emoji}`}
                        aria-pressed={formEmoji === emoji}
                        onClick={() => setFormEmoji(emoji)}
                      >
                        <BookIcon name={emoji} size={20} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setDialog(null)}>
                  Abbrechen
                </button>
                <button className="primary" disabled={!!busy || !formTitle.trim()}>
                  {busy ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />}{' '}
                  {dialog.type === 'create' ? 'Notebook erstellen' : 'Speichern'}
                </button>
              </div>
            </form>
          )}
          {dialog.type === 'delete' && (
            <div className="modal-body">
              <p>
                „{workspace?.notebook.title}“ und alle zugehörigen Quellen, Gespräche und Notizen
                werden dauerhaft entfernt.
              </p>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setDialog(null)}>
                  Behalten
                </button>
                <button
                  className="danger"
                  disabled={!!busy}
                  onClick={() =>
                    void run('delete', async () => {
                      await api('notebooks/' + workspace!.notebook.id, { method: 'DELETE' });
                      setDialog(null);
                      goHome();
                      notify('Notebook gelöscht.');
                    })
                  }
                >
                  <Trash2 size={16} />
                  Notebook löschen
                </button>
              </div>
            </div>
          )}
          {dialog.type === 'add' && (
            <div className="modal-body">
              <p className="muted">
                Füge Material hinzu, das du verstehen möchtest. Deine Quellen bleiben in deinem
                Arbeitsbereich.
              </p>
              <div className="add-tabs">
                <button
                  className={addMode === 'file' ? 'active' : ''}
                  onClick={() => setAddMode('file')}
                >
                  <Upload size={17} />
                  Datei hochladen
                </button>
                <button
                  className={addMode === 'text' ? 'active' : ''}
                  onClick={() => setAddMode('text')}
                >
                  <FileText size={17} />
                  Text einfügen
                </button>
              </div>
              {addMode === 'file' ? (
                <>
                  <button
                    className={`dropzone ${dragging ? 'dragging' : ''}`}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) void upload(f);
                    }}
                  >
                    <span>
                      <Upload size={28} />
                    </span>
                    <strong>Datei hier ablegen</strong>
                    <p>oder klicken, um eine Datei auszuwählen</p>
                    <small>Text-PDF, TXT oder Markdown · maximal 4 MiB · 50 PDF-Seiten</small>
                  </button>
                  <p className="upload-hint">
                    <CircleHelp size={15} />
                    Scans und passwortgeschützte PDFs werden noch nicht unterstützt.
                  </p>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void upload();
                  }}
                >
                  <label className="field-label">
                    Titel
                    <input
                      autoFocus
                      required
                      maxLength={160}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Wie heißt deine Quelle?"
                    />
                  </label>
                  <label className="field-label">
                    Dein Text
                    <textarea
                      required
                      minLength={20}
                      maxLength={100000}
                      rows={9}
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      placeholder="Notizen, ein Artikel oder ein Gedanke mit etwas Kontext …"
                    />
                  </label>
                  <div className="modal-actions">
                    <span className="muted">Mindestens 20 Zeichen</span>
                    <button
                      className="primary"
                      disabled={!!busy || formText.trim().length < 20 || !formTitle.trim()}
                    >
                      <Plus size={17} />
                      Quelle hinzufügen
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          {dialog.type === 'viewer' && (
            <div className="modal-body source-viewer">
              <div className="viewer-meta">
                <span className="pill">
                  <FileText size={13} />
                  {dialog.text ? 'Zitierter Originalauszug' : 'Extrahierter Quelltext'}
                </span>
                {dialog.source && (
                  <a
                    className="text-link"
                    href={`/api/notebooks/${dialog.source.notebook_id}/sources/${dialog.source.id}/download`}
                  >
                    <ArrowDownToLine size={14} />
                    Original herunterladen
                  </a>
                )}
              </div>
              {dialog.text ? (
                <>
                  <p className="excerpt-location">
                    {dialog.page ? 'Seite ' + dialog.page : 'Textquelle · Originalauszug'}
                  </p>
                  <blockquote className="source-excerpt">{dialog.text}</blockquote>
                </>
              ) : (
                dialog.chunks?.map((c, i) => (
                  <section className="source-chunk" key={i}>
                    {c.page_no && <span>Seite {c.page_no}</span>}
                    <p>{c.text}</p>
                  </section>
                ))
              )}
            </div>
          )}
          {dialog.type === 'artifact' && dialog.entry && (
            <div className="modal-body artifact-viewer">
              <div className="artifact-viewer-meta">
                <span>{date(dialog.entry.created_at)} · Quellenbasierter Inhalt</span>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Inhalt exportieren"
                    onClick={() => exportEntry(dialog.entry!)}
                  >
                    <ArrowDownToLine size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Gespeicherten Inhalt löschen"
                    onClick={() =>
                      void run('delete-entry', async () => {
                        await api(
                          `notebooks/${workspace!.notebook.id}/entries/${dialog.entry!.id}`,
                          { method: 'DELETE' },
                        );
                        setDialog(null);
                        await refreshWorkspace();
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              {dialog.entry.body?.format ? (
                <StudioContent
                  key={dialog.entry.id}
                  entry={dialog.entry}
                  renderBlock={(i) => (
                    <div className="answer-block">
                      <SafeMarkdown text={dialog.entry!.body!.blocks[i].text} />
                      {renderCitations(dialog.entry!, i)}
                    </div>
                  )}
                  citations={(i) => renderCitations(dialog.entry!, i)}
                />
              ) : (
                renderEntry(dialog.entry)
              )}
            </div>
          )}
          {dialog.type === 'usage' && <UsageDashboard csrf={bootstrap?.csrf || ''} />}
          {dialog.type === 'info' && (
            <div className="modal-body info-content">
              <div className="info-brand">
                <Logo />
                <h3>Deine Quellen. Klare Antworten.</h3>
              </div>
              <p>
                SourceNote verbindet Dokumente, belegte Antworten und hilfreiche Notizen in einem
                persönlichen Recherchebereich. Ein unabhängiges Projekt von Ayham, inspiriert von
                NotebookLM.
              </p>
              <div className="info-feature">
                <ShieldCheck />
                <div>
                  <strong>Ein Arbeitsbereich nur für dich</strong>
                  <p>
                    Deine Inhalte sind an diesen Browser gebunden und sieben Tage verfügbar. Nach
                    Ablauf oder bei verlorenen Cookies ist kein Zugriff mehr möglich.
                  </p>
                </div>
              </div>
              <div className="info-feature">
                <FileText />
                <div>
                  <strong>Belege zum Nachlesen</strong>
                  <p>
                    Quellenauswahl gilt für neue Fragen. Belegnummern öffnen Originalauszüge. Wenn
                    du eine Quelle entfernst, werden abhängige Antworten und Notizen unzugänglich.
                  </p>
                </div>
              </div>
              <div className="info-feature">
                <Sparkles />
                <div>
                  <strong>Kostenlose KI mit klaren Grenzen</strong>
                  <p>
                    {bootstrap?.aiReady
                      ? 'Die KI ist verbunden.'
                      : 'Die KI ist noch nicht verbunden; der Betreiber muss einen kostenlosen Anbieter konfigurieren.'}{' '}
                    Bis zu 30 Fragen pro Tag und Arbeitsbereich. Kostenlose Anbieter können
                    zusätzliche Minuten- und Tageslimits haben.
                  </p>
                </div>
              </div>
              <p className="privacy-note">
                Ausgewählte Quelltexte und Fragen werden zur KI-Verarbeitung an den konfigurierten
                Anbieter gesendet. Nutze für die Demo bitte keine vertraulichen Dokumente.
                KI-Antworten können Fehler enthalten.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function NotebookCard({ book, onOpen }: { book: Notebook; onOpen: () => void }) {
  return (
    <button className={`notebook-card ${book.color}`} onClick={onOpen}>
      <span className="card-top">
        <span className="card-book">
          <BookIcon name={book.emoji} size={30} />
        </span>
      </span>
      <h3>{book.title}</h3>
      <p>
        {book.source_count} {book.source_count === 1 ? 'Quelle' : 'Quellen'}
      </p>
      <span className="card-bottom">
        <span>Bearbeitet am {date(book.updated_at)}</span>
        <ArrowUp size={17} className="rotate" />
      </span>
    </button>
  );
}
