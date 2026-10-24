'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Focus, Minus, Plus, LoaderCircle } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask, TextLayer } from 'pdfjs-dist';
import { findTextRange, pageText, type PdfTextItem } from '@/lib/pdf-text';

export type PdfExcerpt = { text: string; page: number; start: number; precise: boolean };
function scrollToHighlight(viewport: HTMLDivElement | null, layer: HTMLDivElement | null) {
  const mark = layer?.querySelector('mark');
  if (!viewport || !mark) return;
  const rect = mark.getBoundingClientRect();
  const frame = viewport.getBoundingClientRect();
  viewport.scrollTo({
    top: Math.max(
      0,
      viewport.scrollTop + rect.top - frame.top - viewport.clientHeight / 2 + rect.height / 2,
    ),
    left: Math.max(
      0,
      viewport.scrollLeft + rect.left - frame.left - viewport.clientWidth / 2 + rect.width / 2,
    ),
  });
}
export function PdfReader({ url, excerpt }: { url: string; excerpt?: PdfExcerpt }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(excerpt?.page || 1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('PDF wird geladen …');
  const [ready, setReady] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width - 24)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let disposed = false;
    let task: ReturnType<typeof import('pdfjs-dist').getDocument> | undefined;
    const abort = new AbortController();
    async function load() {
      try {
        const lib = await import('pdfjs-dist');
        lib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const response = await fetch(url, { credentials: 'same-origin', signal: abort.signal });
        if (!response.ok) throw new Error('PDF unavailable');
        const data = new Uint8Array(await response.arrayBuffer());
        if (disposed) return;
        task = lib.getDocument({ data, enableXfa: false, verbosity: 0 });
        const document = await task.promise;
        if (disposed) {
          await task.destroy();
          return;
        }
        setPdf(document);
      } catch {
        if (!disposed)
          setError(
            'Die Original-PDF konnte nicht angezeigt werden. Nutze den Textauszug oder lade das Original herunter.',
          );
      }
    }
    void load();
    return () => {
      disposed = true;
      abort.abort();
      void task?.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!pdf) return;
    let disposed = false;
    let renderTask: RenderTask | undefined;
    let textLayer: TextLayer | undefined;
    async function render() {
      setReady(false);
      setStatus('Seite wird dargestellt …');
      try {
        const lib = await import('pdfjs-dist');
        const documentPage = await pdf!.getPage(page);
        const canvas = canvasRef.current;
        const layer = layerRef.current;
        const container = pageRef.current;
        if (disposed || !canvas || !layer || !container) return;
        const base = documentPage.getViewport({ scale: 1 });
        const scale = Math.min(width / base.width, 1.7) * zoom;
        const viewport = documentPage.getViewport({ scale });
        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(12_000_000 / (viewport.width * viewport.height)),
        );
        container.style.width = viewport.width + 'px';
        container.style.height = viewport.height + 'px';
        container.style.setProperty('--total-scale-factor', String(scale));
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        layer.replaceChildren();
        renderTask = documentPage.render({
          canvas,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
        if (disposed) return;
        const content = await documentPage.getTextContent();
        if (disposed) return;
        textLayer = new lib.TextLayer({ textContentSource: content, container: layer, viewport });
        await textLayer.render();
        if (disposed) return;
        let highlighted = false;
        if (excerpt && page === excerpt.page) {
          const items = content.items.filter(
            (item): item is typeof item & PdfTextItem => 'str' in item,
          );
          const mapped = pageText(items);
          const range = findTextRange(mapped.text, excerpt.text, excerpt.start);
          if (range) {
            mapped.ranges.forEach((item, i) => {
              const start = Math.max(range.start, item.start) - item.start;
              const end = Math.min(range.end, item.end) - item.start;
              const span = textLayer!.textDivs[i];
              const text = items[i].str.replace(/\r/g, '');
              if (!span || start >= end || !text.slice(start, end).trim()) return;
              const mark = document.createElement('mark');
              mark.className = 'pdf-evidence-highlight';
              mark.textContent = text.slice(start, end);
              span.replaceChildren(
                document.createTextNode(text.slice(0, start)),
                mark,
                document.createTextNode(text.slice(end)),
              );
              highlighted = true;
            });
          }
          setStatus(
            highlighted
              ? excerpt.precise
                ? 'Zitierte Textstelle im Original hervorgehoben.'
                : 'Verwendeter Belegabschnitt im Original hervorgehoben.'
              : 'Die Textstelle ließ sich auf dieser Seite nicht eindeutig markieren. Der überprüfte Textauszug bleibt verfügbar.',
          );
        } else
          setStatus(
            excerpt
              ? 'Andere PDF-Seite. „Zum Beleg“ führt zur zitierten Stelle.'
              : 'Original-PDF · Text ist auswählbar.',
          );
        setReady(true);
        if (highlighted)
          requestAnimationFrame(() => {
            if (!disposed) scrollToHighlight(viewportRef.current, layer);
          });
      } catch (e) {
        if (!disposed && !(e instanceof Error && e.name === 'RenderingCancelledException')) {
          setError(
            'Diese Seite konnte nicht dargestellt werden. Textauszug und Original-Download bleiben verfügbar.',
          );
        }
      }
    }
    void render();
    return () => {
      disposed = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, page, width, zoom, excerpt]);
  return (
    <div className="pdf-reader">
      <div className="pdf-toolbar" aria-label="PDF-Steuerung">
        <button
          className="icon-button"
          disabled={!pdf || page <= 1}
          aria-label="Vorherige PDF-Seite"
          onClick={() => setPage(page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <label>
          Seite{' '}
          <select
            aria-label="PDF-Seite"
            value={page}
            disabled={!pdf}
            onChange={(event) => setPage(Number(event.target.value))}
          >
            {Array.from({ length: pdf?.numPages || page }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>{' '}
          von {pdf?.numPages || '…'}
        </label>
        <button
          className="icon-button"
          disabled={!pdf || page >= pdf.numPages}
          aria-label="Nächste PDF-Seite"
          onClick={() => setPage(page + 1)}
        >
          <ArrowRight size={17} />
        </button>
        <span className="pdf-toolbar-spacer" />
        <button
          className="icon-button"
          aria-label="PDF verkleinern"
          disabled={zoom <= 0.5}
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
        >
          <Minus size={16} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          className="icon-button"
          aria-label="PDF vergrößern"
          disabled={zoom >= 2}
          onClick={() => setZoom(Math.min(2, zoom + 0.25))}
        >
          <Plus size={16} />
        </button>
        {excerpt && (
          <button
            className="pdf-jump"
            onClick={() => {
              setPage(excerpt.page);
              scrollToHighlight(viewportRef.current, layerRef.current);
            }}
          >
            <Focus size={15} /> Zum Beleg
          </button>
        )}
      </div>
      <p className="pdf-status" role="status">
        {error || status}
      </p>
      <div className="pdf-viewport" ref={viewportRef} aria-busy={!ready && !error}>
        {!ready && !error && (
          <span className="pdf-loading">
            <LoaderCircle size={20} className="spin" /> PDF wird dargestellt …
          </span>
        )}
        <div
          ref={pageRef}
          className="pdf-page"
          data-ready={ready}
          aria-label={`Original-PDF, Seite ${page}`}
        >
          <canvas ref={canvasRef} aria-label={`Gerenderte Originalseite ${page}`} />
          <div className="pdf-text-layer" ref={layerRef} />
        </div>
      </div>
    </div>
  );
}
