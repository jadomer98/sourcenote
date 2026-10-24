'use client';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  RotateCcw,
  Download,
  Layers,
  GitBranch,
} from 'lucide-react';
import type { Entry } from '@/lib/types';
import { csvCell } from '@/lib/studio';

function download(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function StudioContent({
  entry,
  renderBlock,
  citations,
}: {
  entry: Entry;
  renderBlock: (i: number, withCitations?: boolean) => ReactNode;
  citations: (i: number) => ReactNode;
}) {
  const [index, setIndex] = useState(() => {
    try {
      const value = Number(localStorage.getItem('sourcenote:learning-position:' + entry.id));
      return Number.isInteger(value) && value >= 0 && value < (entry.body?.blocks.length || 0)
        ? value
        : 0;
    } catch {
      return 0;
    }
  });
  const [flipped, setFlipped] = useState(false);
  const [collapsed, setCollapsed] = useState<number[]>([]);
  const storageKey = 'sourcenote:learning:' + entry.id;
  const [progress, setProgress] = useState<Record<number, number>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const max = entry.body?.format === 'quiz' ? 3 : 1;
      return Object.fromEntries(
        (entry.body?.blocks || []).flatMap((_, i) =>
          Number.isInteger(parsed[i]) && parsed[i] >= 0 && parsed[i] <= max ? [[i, parsed[i]]] : [],
        ),
      );
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
      localStorage.setItem('sourcenote:learning-position:' + entry.id, String(index));
    } catch {
      /* Learning remains usable without local storage. */
    }
  }, [progress, storageKey, index, entry.id]);
  const body = entry.body;
  if (!body || !body.format || body.outcome === 'insufficient')
    return (
      <>
        {body?.blocks.map((_, i) => (
          <div key={i}>{renderBlock(i)}</div>
        ))}
      </>
    );
  const blocks = body.blocks;
  const move = (step: number) => {
    setIndex((index + step + blocks.length) % blocks.length);
    setFlipped(false);
  };
  const reset = () => {
    setProgress({});
    setIndex(0);
    setFlipped(false);
  };
  if (body.format === 'flashcards') {
    const correct = blocks.filter((_, i) => progress[i] === 1).length;
    const wrong = blocks.filter((_, i) => progress[i] === 0).length;
    const grade = (value: number) => {
      setProgress((old) => ({ ...old, [index]: value }));
      if (index < blocks.length - 1) move(1);
    };
    return (
      <div className="learning-view">
        <div className="learning-meta">
          <span>
            <Layers size={16} /> Karte {index + 1} von {blocks.length}
          </span>
          <span aria-live="polite">
            {correct + wrong} von {blocks.length} bewertet
          </span>
        </div>
        <button
          className="flashcard"
          aria-label={flipped ? 'Frage zeigen' : 'Antwort aufdecken'}
          aria-pressed={flipped}
          onClick={() => setFlipped(!flipped)}
        >
          <span className="eyebrow">{flipped ? 'DIE ANTWORT' : 'EINE FRAGE AN DICH'}</span>
          {flipped ? (
            <div className="flashcard-answer">{renderBlock(index, false)}</div>
          ) : (
            <h3>{blocks[index].question}</h3>
          )}
          <span className="flashcard-hint">{flipped ? 'Frage zeigen' : 'Antwort aufdecken'}</span>
        </button>
        {flipped && (
          <div className="flashcard-citations" aria-label="Belege zur Antwort">
            {citations(index)}
          </div>
        )}
        <div className="learning-controls flashcard-controls">
          <button className="secondary" aria-label="Vorherige Karte" onClick={() => move(-1)}>
            <ArrowLeft size={17} />
          </button>
          <button
            className="grade-button wrong"
            disabled={!flipped}
            aria-label={`Falsch · ${wrong}`}
            aria-pressed={progress[index] === 0}
            onClick={() => grade(0)}
          >
            <X size={19} />
            <span>Falsch</span>
            <strong>{wrong}</strong>
          </button>
          <button
            className="grade-button correct"
            disabled={!flipped}
            aria-label={`Richtig · ${correct}`}
            aria-pressed={progress[index] === 1}
            onClick={() => grade(1)}
          >
            <Check size={19} />
            <span>Richtig</span>
            <strong>{correct}</strong>
          </button>
          <button className="secondary" aria-label="Nächste Karte" onClick={() => move(1)}>
            <ArrowRight size={17} />
          </button>
        </div>
        {correct + wrong === blocks.length && (
          <p className="flashcard-result" role="status">
            Alle Karten bewertet: {correct} richtig · {wrong} falsch. Du kannst jede Bewertung beim
            Wiederholen ändern.
          </p>
        )}
        <button className="text-link" onClick={reset}>
          <RotateCcw size={14} /> Lernstand zurücksetzen
        </button>
        <p className="studio-footnote">
          Klicke irgendwo auf die Karte oder nutze Enter/Leertaste. Aufdecken, dann selbst bewerten.
          Bewertung und Position bleiben in diesem Browser gespeichert. Wiederholen kostet keine
          KI-Tokens.
        </p>
      </div>
    );
  }
  if (body.format === 'quiz') {
    const chosen = progress[index];
    const answered = Number.isInteger(chosen) && chosen >= 0 && chosen < 4;
    const complete = blocks.every(
      (_, i) => Number.isInteger(progress[i]) && progress[i] >= 0 && progress[i] < 4,
    );
    const score = blocks.filter((b, i) => progress[i] === b.correct).length;
    return (
      <div className="learning-view">
        <div className="learning-meta">
          <span>
            Frage {index + 1} von {blocks.length}
          </span>
          <span>{Object.keys(progress).length} beantwortet</span>
        </div>
        <progress
          value={Object.keys(progress).length}
          max={blocks.length}
          aria-label="Quizfortschritt"
        />
        <h3 className="quiz-question">{blocks[index].question}</h3>
        <div className="quiz-options">
          {blocks[index].options!.map((option, i) => (
            <button
              key={i}
              disabled={answered}
              className={`quiz-option ${answered && i === blocks[index].correct ? 'correct' : ''} ${answered && i === chosen && i !== blocks[index].correct ? 'incorrect' : ''}`}
              onClick={() => setProgress((old) => ({ ...old, [index]: i }))}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {option}
              {answered && i === blocks[index].correct && <Check size={18} />}
            </button>
          ))}
        </div>
        {answered && (
          <div className="quiz-feedback" role="status">
            <strong>{chosen === blocks[index].correct ? 'Richtig!' : 'Noch nicht ganz.'}</strong>
            {renderBlock(index)}
          </div>
        )}
        {complete && (
          <div className="quiz-score" role="status">
            <strong>
              {score} von {blocks.length} richtig
            </strong>
            <span>Prüfe die Belege und versuche es noch einmal.</span>
          </div>
        )}
        <div className="learning-controls">
          <button className="secondary" disabled={index === 0} onClick={() => move(-1)}>
            <ArrowLeft size={16} /> Zurück
          </button>
          <button
            className="primary"
            disabled={!answered || index === blocks.length - 1}
            onClick={() => move(1)}
          >
            Nächste Frage <ArrowRight size={16} />
          </button>
        </div>
        <button className="text-link" onClick={reset}>
          <RotateCcw size={14} /> Quiz neu starten
        </button>
        <p className="studio-footnote">
          Fortschritt wird in diesem Browser gespeichert. Ein neuer Versuch braucht keinen
          KI-Aufruf.
        </p>
      </div>
    );
  }
  if (body.format === 'mindmap') {
    const node = (i: number): ReactNode => {
      const children = blocks.map((b, j) => (b.parent === i ? j : -1)).filter((j) => j >= 0);
      const closed = collapsed.includes(i);
      return (
        <li key={i}>
          <div className={`mind-node ${i === 0 ? 'root' : ''}`}>
            {children.length ? (
              <button
                className="mind-label"
                aria-expanded={!closed}
                onClick={() =>
                  setCollapsed((old) => (closed ? old.filter((j) => j !== i) : [...old, i]))
                }
              >
                <GitBranch size={15} />
                {blocks[i].text}
                <span>{closed ? '+' : '−'}</span>
              </button>
            ) : (
              <strong>{blocks[i].text}</strong>
            )}
            <div>{citations(i)}</div>
          </div>
          {children.length > 0 && !closed && <ul>{children.map(node)}</ul>}
        </li>
      );
    };
    const svg = () => {
      const esc = (s: string) =>
        s.replace(
          /[&<>"']/g,
          (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
        );
      const depths: number[] = [];
      const lines = blocks.map((b) => b.text.match(/.{1,38}(?:\s|$)|.{1,38}/g) || [b.text]);
      let nextY = 30;
      const positions = blocks.map((b, i) => {
        depths[i] = i ? depths[b.parent!] + 1 : 0;
        const height = Math.max(70, lines[i].length * 17 + 24);
        const position = { x: 25 + depths[i] * 370, y: nextY, height };
        nextY += height + 25;
        return position;
      });
      const width = Math.max(...positions.map((p) => p.x)) + 360;
      const content = blocks
        .map((b, i) => {
          const p = positions[i];
          const parent = positions[b.parent!];
          return (
            (i
              ? `<path d="M${parent.x + 330},${parent.y + parent.height / 2}H${p.x - 16}V${p.y + p.height / 2}H${p.x}" fill="none" stroke="#7f907d"/>`
              : '') +
            `<rect x="${p.x}" y="${p.y}" width="330" height="${p.height}" rx="12" fill="${i ? '#fffefa' : '#e5eddf'}" stroke="#7f907d"/><text x="${p.x + 12}" y="${p.y + 22}" font-family="sans-serif" font-size="13" fill="#24352b">${lines[i].map((w, j) => `<tspan x="${p.x + 12}" dy="${j ? 17 : 0}">${esc(w)}</tspan>`).join('')}</text>`
          );
        })
        .join('');
      const sources = [...new Set(entry.citations.map((c) => c.title))].join('; ');
      download(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${nextY + 75}" width="${width}" height="${nextY + 75}"><title>SourceNote Mindmap</title><desc>${esc(sources)}</desc><rect width="100%" height="100%" fill="#f6f4ed"/>${content}<text x="25" y="${nextY + 35}" font-family="sans-serif" font-size="12" fill="#58685b">Quellen: ${esc(sources)}</text></svg>`,
        'sourcenote-mindmap.svg',
        'image/svg+xml',
      );
    };
    return (
      <div>
        <div className="learning-controls">
          <button className="secondary" onClick={() => setCollapsed([])}>
            Alle aufklappen
          </button>
          <button className="secondary" onClick={svg}>
            <Download size={16} /> SVG exportieren
          </button>
        </div>
        <div className="mindmap">
          <ul>{node(0)}</ul>
        </div>
        <p className="studio-footnote">
          Knoten mit Verzweigung lassen sich einklappen. Die Belege bleiben direkt erreichbar.
        </p>
      </div>
    );
  }
  if (body.format === 'table') {
    const exportCsv = () => {
      const rows = [
        [...body.columns!, 'Quellen'],
        ...blocks.map((b, i) => [
          ...b.cells!,
          entry.citations
            .filter((c) => c.block_no === i)
            .map((c) => c.title + (c.page_no ? ` · S. ${c.page_no}` : ''))
            .join('; '),
        ]),
      ];
      download(
        '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'),
        'sourcenote-tabelle.csv',
        'text/csv;charset=utf-8',
      );
    };
    return (
      <div>
        <div className="learning-controls">
          <span className="muted">
            {blocks.length} Zeilen · {body.columns!.length} Spalten
          </span>
          <button className="secondary" onClick={exportCsv}>
            <Download size={16} /> CSV exportieren
          </button>
        </div>
        <div
          className="data-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Quellenbasierte Datentabelle"
        >
          <table className="data-table">
            <thead>
              <tr>
                {body.columns!.map((c, i) => (
                  <th scope="col" key={i}>
                    {c}
                  </th>
                ))}
                <th scope="col">Belege</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b, i) => (
                <tr key={i}>
                  {b.cells!.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                  <td>{citations(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="studio-footnote">
          KI-extrahierte Werte vor der Weiterverwendung an den Belegen prüfen. CSV enthält die
          Quellennamen.
        </p>
      </div>
    );
  }
  return (
    <article className="report-content">
      {blocks.map((_, i) => (
        <section key={i}>{renderBlock(i)}</section>
      ))}
    </article>
  );
}
