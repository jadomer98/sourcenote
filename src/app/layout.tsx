import type { Metadata } from 'next';
import './globals.css';
import './readability.css';
import './studio.css';
export const metadata: Metadata = {
  title: 'SourceNote — Deine Quellen. Klare Antworten.',
  description:
    'Dein persönlicher Recherchebereich: Quellen verstehen, belegte Antworten finden und Wissen festhalten. Ein unabhängiges NotebookLM-inspiriertes Projekt.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
