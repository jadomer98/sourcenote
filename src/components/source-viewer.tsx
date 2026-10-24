'use client';
import { useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import type { Source } from '@/lib/types';
import { PdfReader, type PdfExcerpt } from './pdf-reader';

export function SourceViewer({
  source,
  text,
  page,
  chunks,
  excerpt,
  onBack,
}: {
  source?: Source;
  text?: string;
  page?: number | null;
  chunks?: { text: string; page_no: number | null }[];
  excerpt?: PdfExcerpt;
  onBack?: () => void;
}) {
  const isPdf = source?.mime === 'application/pdf';
  const [mode, setMode] = useState(isPdf ? 'pdf' : 'text');
  const url = source && `/api/notebooks/${source.notebook_id}/sources/${source.id}`;
  const textView = text ? (
    <>
      <p className="excerpt-location">{page ? 'Seite ' + page : 'Textquelle · Originalauszug'}</p>
      <blockquote className="source-excerpt">{text}</blockquote>
    </>
  ) : (
    chunks?.map((chunk, i) => (
      <section className="source-chunk" key={i}>
        {chunk.page_no && <span>Seite {chunk.page_no}</span>}
        <p>{chunk.text}</p>
      </section>
    ))
  );
  return (
    <div className={`modal-body source-viewer ${isPdf ? 'has-pdf' : ''}`}>
      {onBack && (
        <button className="text-link viewer-back" onClick={onBack}>
          <ArrowLeft size={15} /> Zurück zum Lerninhalt
        </button>
      )}
      <div className="viewer-meta">
        {isPdf ? (
          <div className="viewer-modes" role="group" aria-label="Quellenansicht">
            <button aria-pressed={mode === 'pdf'} onClick={() => setMode('pdf')}>
              Original-PDF
            </button>
            <button aria-pressed={mode === 'text'} onClick={() => setMode('text')}>
              Textauszug
            </button>
          </div>
        ) : (
          <span className="pill">
            <FileText size={13} />
            {text ? 'Zitierter Originalauszug' : 'Extrahierter Quelltext'}
          </span>
        )}
        {url && (
          <a className="text-link" href={url + '/download'}>
            <Download size={14} /> Original herunterladen
          </a>
        )}
      </div>
      {isPdf && mode === 'pdf' ? (
        <>
          <PdfReader url={url + '/file'} excerpt={excerpt} />
          {text && (
            <details className="pdf-cited-text">
              <summary>Überprüften Textauszug lesen</summary>
              {textView}
            </details>
          )}
        </>
      ) : (
        textView
      )}
    </div>
  );
}
