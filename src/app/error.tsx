'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>Ein kurzer Zwischenstopp.</h1>
      <p>Die Seite konnte nicht geladen werden. Deine gespeicherten Inhalte bleiben erhalten.</p>
      <button className="primary" onClick={reset}>
        Erneut versuchen
      </button>
    </main>
  );
}
