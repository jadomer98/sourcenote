import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="fatal">
      <h1>Hier ist noch kein Wissen.</h1>
      <p>Diese Seite wurde nicht gefunden.</p>
      <Link href="/" className="primary">
        Zu deinen Notebooks
      </Link>
    </main>
  );
}
