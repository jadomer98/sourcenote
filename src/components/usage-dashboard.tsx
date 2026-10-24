'use client';
import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, LockKeyhole, ExternalLink } from 'lucide-react';
import type { UsageData } from '@/lib/types';
import { studioTools } from '@/lib/studio';
const number = (n: number) => new Intl.NumberFormat('de-DE').format(n);
const stamp = (s: string) => new Date(s).toLocaleString('de-DE');
export function UsageDashboard({ csrf }: { csrf: string }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [ownerToken, setOwnerToken] = useState('');
  const load = useCallback(
    async (token = '') => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/usage' + (token ? '/owner' : ''), {
          method: token ? 'POST' : 'GET',
          headers: { 'x-csrf-token': csrf, ...(token ? { 'x-usage-token': token } : {}) },
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Nutzung konnte nicht geladen werden.');
        setData(result);
        setOwnerToken(token);
        setInput('');
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [csrf],
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/usage', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Nutzung konnte nicht geladen werden.');
        setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="modal-body usage-dashboard">
      <div className="usage-intro">
        <div>
          <span className="eyebrow">DEIN KOSTENLOSER ARBEITSBEREICH</span>
          <h3>Wissen, was noch möglich ist.</h3>
          <p>Messwerte aus SourceNote. Dein API-Schlüssel bleibt auf dem Server.</p>
        </div>
        <Activity size={32} />
      </div>
      <div className="usage-toolbar">
        <strong>
          {data?.scope === 'project'
            ? 'Eigentümeransicht · gesamtes Projekt'
            : 'Dieser Gast-Arbeitsbereich'}
        </strong>
        <button className="secondary" disabled={loading} onClick={() => void load(ownerToken)}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Aktualisieren
        </button>
      </div>
      {error && (
        <p className="usage-error" role="alert">
          {error}
        </p>
      )}
      {!data && loading && <p role="status">Nutzung wird geladen …</p>}
      {data && (
        <>
          {data.testMode && (
            <p className="usage-notice">
              Testmodus: Diese Werte stammen aus simulierten Antworten, nicht von Groq.
            </p>
          )}
          <div className="usage-model">
            <span className="online-dot" />
            <strong>{data.provider === 'groq' ? 'Groq' : data.provider}</strong>
            <code>{data.model}</code>
            <span>{data.connected ? 'Verbunden' : 'Nicht verbunden'}</span>
          </div>
          <div className="usage-stats">
            <div>
              <span>Gemessene Tokens heute</span>
              <strong>{number(data.today.measured)}</strong>
              <small>
                Eingabe {number(data.today.input)} · Ausgabe {number(data.today.output)}*
              </small>
            </div>
            <div>
              <span>KI-Anfragen heute</span>
              <strong>
                {number(data.attempts)}
                {data.requestLimit ? <small> / {data.requestLimit}</small> : null}
              </strong>
              <small>
                {data.today.failed} fehlgeschlagen · {data.today.unknown} ohne Tokenmeldung
              </small>
            </div>
            <div>
              <span>Tokens im erfassten Verlauf</span>
              <strong>{number(data.today.lifetime)}</strong>
              <small>
                {data.today.since
                  ? 'Erster Datensatz: ' + stamp(data.today.since)
                  : 'Noch keine KI-Anfrage'}
              </small>
            </div>
          </div>
          {data.requestLimit && (
            <div className="usage-meter">
              <label htmlFor="request-meter">
                Verbleibende Anfragen heute: {Math.max(0, data.requestLimit - data.attempts)}
              </label>
              <progress id="request-meter" value={data.attempts} max={data.requestLimit} />
            </div>
          )}
          {data.budget && (
            <div className="usage-meter">
              <label htmlFor="budget-meter">
                Projekt-Tagesbudget: {number(data.budget.charged)} / {number(data.budget.limit)}{' '}
                Tokens belastet
              </label>
              <progress id="budget-meter" value={data.budget.charged} max={data.budget.limit} />
              <p>
                Enthält vorsichtige Reservierungen für laufende Anfragen oder fehlende
                Tokenmeldungen. Es ist kein gemessener Provider-Verbrauch.
              </p>
            </div>
          )}
          <p className="studio-footnote">
            Heute = {data.day}, UTC · Tageswechsel um 00:00 UTC. Tokens sind Textbausteine, keine
            Euro. *Eingabe/Ausgabe nur soweit gemeldet; ältere Datensätze können nur eine
            Gesamtsumme enthalten. Auch zurückgehaltene KI-Antworten können Tokens verbrauchen.
            Gelöschte Notebooks setzen den Zähler nicht zurück. Bereits vor Einführung der Erfassung
            gelöschte Anfragen sind nicht rekonstruierbar.
          </p>
          <section className="usage-section">
            <h3>Groq-Limits verstehen</h3>
            <p>
              Es gibt kein einmaliges Token-Guthaben. Minuten- und Tageslimits erneuern sich und
              gelten für deine gesamte Groq-Organisation, auch in anderen Apps. Die verbindlichen
              Kontolimits stehen in der{' '}
              <a
                href="https://console.groq.com/settings/limits"
                target="_blank"
                rel="noopener noreferrer"
              >
                Groq-Konsole <ExternalLink size={12} />
              </a>
              .
            </p>
            {data.providerSnapshot ? (
              <>
                <div className="provider-snapshot">
                  {[
                    ['limit-requests', 'Anfragen pro Tag'],
                    ['remaining-requests', 'Anfragen verbleibend (Tag)'],
                    ['limit-tokens', 'Tokens pro Minute'],
                    ['remaining-tokens', 'Tokens verbleibend (Minute)'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <strong>
                        {typeof data.providerSnapshot!.limits[key] === 'number'
                          ? number(data.providerSnapshot!.limits[key] as number)
                          : 'Nicht gemeldet'}
                      </strong>
                    </div>
                  ))}
                </div>
                <p className="studio-footnote">
                  Momentaufnahme der letzten Providerantwort vom {stamp(data.providerSnapshot.at)}.
                  Kein Live-Guthaben; spätere Aufrufe und automatische Resets verändern die Werte.
                  Groq meldet hier kein verbleibendes Tages-Tokenbudget.
                </p>
              </>
            ) : (
              <p className="usage-notice">
                Accountweite Provider-Momentaufnahmen sind nur in der Eigentümeransicht sichtbar.
                SourceNote zählt keine Aufrufe aus anderen Projekten.
              </p>
            )}
          </section>
          <section className="usage-section">
            <h3>Grenzen dieser Demo</h3>
            <div className="limits-grid">
              {[
                ['Notebooks', `${data.limits.notebooks} pro Gastbereich`],
                ['Quellen', `${data.limits.sources} pro Notebook`],
                ['Dateigröße', `${data.limits.fileMiB} MiB pro Datei`],
                ['PDF', `${data.limits.pdfPages} Seiten · Text-PDF, keine OCR`],
                ['Quelltext', `${number(data.limits.textChars)} Zeichen pro Quelle`],
                ['KI-Kontext', `${number(data.limits.evidenceTokens)} Quell-Tokens pro Anfrage`],
                ['KI-Antwort', `max. ${number(data.limits.outputTokens)} Tokens`],
                ['KI-Anfragen', `${data.limits.dailyRequests} pro Gastbereich / UTC-Tag`],
                ['Gastbereich', `${data.limits.retentionDays} Tage gespeichert`],
                ['Dateispeicher', `${data.limits.storageMiB} MiB Projekt-Schutzlimit`],
              ].map(([label, value]) => (
                <div key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <p className="studio-footnote">
              Zusätzlich begrenzt SourceNote parallele Anfragen und reserviert vorsichtig bis zu
              8.000 Tokens pro Minute. Weniger Quellen auswählen oder nach einem Limit kurz warten.
              Lernkarten wiederholen, Quiz spielen und Exporte brauchen keine weiteren KI-Tokens.
            </p>
          </section>
          <section className="usage-section">
            <h3>Letzte KI-Anfragen</h3>
            {!data.recent.length ? (
              <p>Noch keine Anfragen erfasst.</p>
            ) : (
              <div className="usage-history">
                {data.recent.map((r, i) => (
                  <div key={i}>
                    <span>
                      {studioTools.find((t) => t.kind === r.kind)?.title || 'Chat'}
                      <small>{stamp(r.created_at)}</small>
                    </span>
                    <span>
                      {r.state === 'succeeded'
                        ? 'Erstellt'
                        : r.state === 'pending'
                          ? 'Gestartet'
                          : 'Fehlgeschlagen'}
                    </span>
                    <strong>
                      {r.total_tokens === null ? 'Unbekannt' : number(r.total_tokens) + ' Tokens'}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
          <p className="studio-footnote">
            Neon- und Vercel-Kontingente werden hier nicht gemessen:{' '}
            <a href="https://console.neon.tech/" target="_blank" rel="noopener noreferrer">
              Neon-Konsole
            </a>{' '}
            ·{' '}
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
              Vercel-Dashboard
            </a>
            . Stand dieser Ansicht: {stamp(data.refreshAt)}.
          </p>
        </>
      )}
      <section className="usage-owner">
        <h3>
          <LockKeyhole size={16} /> Eigentümerzugang
        </h3>
        {ownerToken ? (
          <button className="secondary" disabled={loading} onClick={() => void load()}>
            Eigentümeransicht beenden
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(input);
            }}
          >
            <label className="field-label">
              Eigentümer-Zugangscode
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                required
                maxLength={256}
              />
            </label>
            <button className="primary" disabled={loading || !input}>
              Projektverbrauch anzeigen
            </button>
            <p className="studio-footnote">
              Separater Zugangscode, niemals dein Groq-API-Schlüssel. Bleibt nur bis zum Schließen
              dieser Ansicht im Arbeitsspeicher.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
