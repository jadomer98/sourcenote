'use client';
import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import {
  FileText,
  MessageCircle,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  PanelsTopLeft,
  Plus,
} from 'lucide-react';
import {
  clamp,
  defaultLayout,
  panelIds,
  panelLabels,
  panelMinimums,
  parseLayout,
  resizePair,
  type LayoutPreferences,
  type PanelId,
} from '@/lib/workspace-layout';

// The dark workspace has a new default arrangement. Keep the preceding
// layout untouched so restoring that Git release also restores its preferences.
const key = 'sourcenote:workspace-layout:v2';
const eventName = 'sourcenote:layout-change';
let rawCache: string | null | undefined;
let snapshot = defaultLayout;
function getSnapshot() {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== rawCache) {
      rawCache = raw;
      snapshot = parseLayout(raw);
    }
  } catch {
    /* In-memory preferences work when storage is unavailable. */
  }
  return snapshot;
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener('storage', storage);
  };
}
function persistLayout() {
  try {
    rawCache = JSON.stringify(snapshot);
    localStorage.setItem(key, rawCache);
  } catch {
    /* optional */
  }
}
export function updateLayout(
  update: (value: LayoutPreferences) => LayoutPreferences,
  persist = true,
) {
  snapshot = update(getSnapshot());
  if (persist) persistLayout();
  window.dispatchEvent(new Event(eventName));
}
export function useLayoutPreferences() {
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultLayout);
}

export function WorkspacePanelToolbar() {
  const layout = useLayoutPreferences();
  const visible = panelIds.filter(
    (id) => !layout.hidden.includes(id) && (!layout.focused || layout.focused === id),
  );
  return (
    <div className="panel-toolbar" aria-label="Bereiche ein- und ausblenden">
      <div className="panel-toggles">
        {panelIds.map((id) => {
          const Icon = { sources: FileText, chat: MessageCircle, studio: Sparkles }[id];
          return (
            <button
              key={id}
              className={`panel-toggle ${id}`}
              data-toggle={id}
              aria-label={panelLabels[id]}
              aria-pressed={visible.includes(id)}
              title={panelLabels[id] + (visible.includes(id) ? ' ausblenden' : ' einblenden')}
              onClick={() =>
                updateLayout((s) => ({
                  ...s,
                  hidden: visible.includes(id)
                    ? [...new Set([...s.hidden, id])]
                    : s.hidden.filter((p) => p !== id),
                  focused: null,
                }))
              }
            >
              <Icon size={15} />
              <span>{panelLabels[id]}</span>
              {!visible.includes(id) && <Plus size={12} />}
            </button>
          );
        })}
      </div>
      <button
        className="layout-reset"
        aria-label="Layout zurücksetzen"
        title="Standardaufteilung wiederherstellen"
        onClick={() =>
          updateLayout((s) => ({ ...s, hidden: [], focused: null, weights: defaultLayout.weights }))
        }
      >
        <RotateCcw size={15} />
      </button>
    </div>
  );
}

function stopResizing() {
  document.body.classList.remove('layout-resizing');
  persistLayout();
}
export function SidebarResizeHandle() {
  const layout = useLayoutPreferences();
  const drag = useRef<{ x: number; width: number } | null>(null);
  useEffect(() => () => stopResizing(), []);
  function end() {
    if (!drag.current) return;
    drag.current = null;
    stopResizing();
  }
  return (
    <div
      className="sidebar-resize-handle"
      role="separator"
      aria-label="Navigationsbreite ändern"
      aria-controls="main-navigation"
      aria-orientation="vertical"
      aria-valuemin={176}
      aria-valuemax={340}
      aria-valuenow={Math.round(layout.sidebarWidth)}
      tabIndex={layout.sidebarCollapsed ? -1 : 0}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        drag.current = { x: e.clientX, width: layout.sidebarWidth };
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add('layout-resizing');
      }}
      onPointerMove={(e) => {
        if (drag.current) {
          const width = clamp(drag.current.width + e.clientX - drag.current.x, 176, 340);
          updateLayout((s) => ({ ...s, sidebarWidth: width }), false);
        }
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={() =>
        updateLayout((s) => ({ ...s, sidebarWidth: defaultLayout.sidebarWidth }))
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          updateLayout((s) => ({ ...s, sidebarCollapsed: true }));
          requestAnimationFrame(() =>
            document.querySelector<HTMLButtonElement>('.desktop-nav-toggle')?.focus(),
          );
          return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        updateLayout((s) => ({
          ...s,
          sidebarWidth:
            e.key === 'Home'
              ? 176
              : e.key === 'End'
                ? 340
                : clamp(s.sidebarWidth + (e.key === 'ArrowLeft' ? -16 : 16), 176, 340),
        }));
      }}
    />
  );
}

type PanelContextValue = {
  close: (id: PanelId) => void;
  focus: (id: PanelId) => void;
  focused: PanelId | null;
};
const PanelContext = createContext<PanelContextValue | null>(null);
export function PanelActions({ panel }: { panel: PanelId }) {
  const context = useContext(PanelContext);
  if (!context) return null;
  const focused = context.focused === panel;
  return (
    <div className="panel-actions">
      <button
        className="icon-button panel-focus"
        title={focused ? 'Mehrere Bereiche zeigen' : panelLabels[panel] + ' fokussieren'}
        aria-label={focused ? 'Mehrere Bereiche zeigen' : panelLabels[panel] + ' fokussieren'}
        onClick={() => context.focus(panel)}
      >
        {focused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
      <button
        className="icon-button"
        title={panelLabels[panel] + ' schließen'}
        aria-label={panelLabels[panel] + ' schließen'}
        onClick={() => context.close(panel)}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function WorkspacePanels({
  children,
  activeTab,
  onActiveTabChange,
}: {
  children: ReactNode;
  activeTab: PanelId;
  onActiveTabChange: (id: PanelId) => void;
}) {
  const layout = useLayoutPreferences();
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    left: PanelId;
    right: PanelId;
    x: number;
    leftWidth: number;
    rightWidth: number;
    combined: number;
    scale: number;
  } | null>(null);
  useEffect(() => () => stopResizing(), []);
  const visible = panelIds.filter(
    (id) => !layout.hidden.includes(id) && (!layout.focused || layout.focused === id),
  );
  const elements = Children.toArray(children);
  function close(id: PanelId) {
    updateLayout((s) => ({ ...s, hidden: [...new Set([...s.hidden, id])], focused: null }));
    if (activeTab === id)
      onActiveTabChange(panelIds.find((p) => p !== id && !layout.hidden.includes(p)) || 'chat');
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(
          window.matchMedia('(max-width: 800px)').matches
            ? `[data-tab="${id}"]`
            : `[data-toggle="${id}"]`,
        )
        ?.focus(),
    );
  }
  function open(id: PanelId) {
    updateLayout((s) => ({ ...s, hidden: s.hidden.filter((p) => p !== id), focused: null }));
    onActiveTabChange(id);
  }
  function focus(id: PanelId) {
    updateLayout((s) => ({ ...s, focused: s.focused === id ? null : id }));
  }
  function measure(left: PanelId, right: PanelId) {
    const el = grid.current;
    if (!el) return null;
    const leftWidth = el.querySelector(`[data-panel="${left}"]`)!.getBoundingClientRect().width;
    const rightWidth = el.querySelector(`[data-panel="${right}"]`)!.getBoundingClientRect().width;
    const available = el.getBoundingClientRect().width - Math.max(0, visible.length - 1) * 12;
    return {
      left,
      right,
      leftWidth,
      rightWidth,
      combined: layout.weights[left] + layout.weights[right],
      scale: Math.min(1, available / visible.reduce((sum, id) => sum + panelMinimums[id], 0)),
    };
  }
  function resize(info: NonNullable<ReturnType<typeof measure>>, delta: number, persist = true) {
    const [left, right] = resizePair(
      info.leftWidth,
      info.rightWidth,
      delta,
      panelMinimums[info.left] * info.scale,
      panelMinimums[info.right] * info.scale,
    );
    updateLayout(
      (s) => ({
        ...s,
        weights: {
          ...s.weights,
          [info.left]: (info.combined * left) / (left + right),
          [info.right]: (info.combined * right) / (left + right),
        },
      }),
      persist,
    );
  }
  function start(e: PointerEvent<HTMLDivElement>, left: PanelId, right: PanelId) {
    if (e.button !== 0) return;
    const info = measure(left, right);
    if (!info) return;
    e.preventDefault();
    drag.current = { ...info, x: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.classList.add('layout-resizing');
  }
  function end() {
    if (!drag.current) return;
    drag.current = null;
    stopResizing();
  }
  function keyboard(e: KeyboardEvent<HTMLDivElement>, left: PanelId, right: PanelId) {
    if (e.key === 'Enter') {
      e.preventDefault();
      close(left);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const info = measure(left, right);
    if (!info) return;
    e.preventDefault();
    resize(
      info,
      e.key === 'Home'
        ? -10000
        : e.key === 'End'
          ? 10000
          : (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 50 : 16),
    );
  }
  const columns = visible.map((id) => `minmax(0, ${layout.weights[id]}fr)`).join(' 12px ');
  return (
    <PanelContext.Provider value={{ close, focus, focused: layout.focused }}>
      <div className="workspace-layout">
        <div className="mobile-tabs" role="tablist" aria-label="Notebook-Bereiche">
          {panelIds.map((id) => {
            const Icon = { sources: FileText, chat: MessageCircle, studio: Sparkles }[id];
            return (
              <button
                key={id}
                role="tab"
                data-tab={id}
                aria-selected={activeTab === id && !layout.hidden.includes(id)}
                onClick={() => open(id)}
              >
                <Icon size={16} />
                {panelLabels[id]}
              </button>
            );
          })}
        </div>
        <div
          className="workspace-grid flexible-grid"
          ref={grid}
          style={{ '--panel-columns': columns } as CSSProperties}
        >
          {panelIds.map((id, i) => {
            const child = elements[i];
            if (!isValidElement(child)) return null;
            const element = child as ReactElement<{
              className: string;
              'data-panel'?: string;
              id?: string;
            }>;
            const index = visible.indexOf(id);
            return (
              <Fragment key={id}>
                {index > 0 && (
                  <div
                    className="panel-divider"
                    role="separator"
                    title="Ziehen oder Pfeiltasten zum Ändern · Eingabe zum Schließen · Doppelklick zum Zurücksetzen"
                    tabIndex={0}
                    aria-label={`Breite zwischen ${panelLabels[visible[index - 1]]} und ${panelLabels[id]} ändern`}
                    aria-controls={`panel-${visible[index - 1]} panel-${id}`}
                    aria-orientation="vertical"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(
                      (layout.weights[visible[index - 1]] /
                        (layout.weights[visible[index - 1]] + layout.weights[id])) *
                        100,
                    )}
                    onPointerDown={(e) => start(e, visible[index - 1], id)}
                    onPointerMove={(e) => {
                      if (drag.current) resize(drag.current, e.clientX - drag.current.x, false);
                    }}
                    onPointerUp={end}
                    onPointerCancel={end}
                    onLostPointerCapture={end}
                    onKeyDown={(e) => keyboard(e, visible[index - 1], id)}
                    onDoubleClick={() =>
                      updateLayout((s) => ({ ...s, weights: defaultLayout.weights }))
                    }
                  />
                )}
                {cloneElement(element, {
                  id: 'panel-' + id,
                  'data-panel': id,
                  className: `${element.props.className} ${index < 0 ? 'panel-hidden' : ''} ${layout.hidden.includes(id) ? 'panel-closed' : ''}`,
                })}
              </Fragment>
            );
          })}
          {visible.length === 0 && (
            <div className="empty-layout">
              <PanelsTopLeft size={35} />
              <h2>Platz für deine Gedanken.</h2>
              <p>Alle Bereiche sind ausgeblendet. Deine Inhalte bleiben gespeichert.</p>
              <button
                className="primary"
                onClick={() => {
                  updateLayout((s) => ({ ...s, hidden: [], focused: null }));
                  onActiveTabChange('chat');
                }}
              >
                Bereiche wieder öffnen
              </button>
            </div>
          )}
        </div>
      </div>
    </PanelContext.Provider>
  );
}
