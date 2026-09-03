import type { Metadata } from 'next';
import Link from 'next/link';
import BibleReader from '../bible-reader';
import RefreshButton from '../refresh-button';

export const metadata: Metadata = {
  title: 'Biblia digital | Iglesia San Agustín',
  description: 'Lee, guarda y comparte la Biblia Reina-Valera 1909 desde la aplicación de Iglesia San Agustín.',
};

export default function BiblePage() {
  return (
    <main className="bible-page">
      <nav className="nav bible-nav" aria-label="Navegación de la Biblia">
        <Link className="brand" href="/" aria-label="Volver al inicio de Iglesia San Agustín">
          <span className="brand-mark" aria-hidden="true">✝</span>
          <span><strong>San Agustín</strong><small>Comunidad de fe</small></span>
        </Link>
        <div className="nav-links bible-nav-links">
          <Link href="/">Inicio</Link>
          <Link className="is-active" href="/biblia" aria-current="page">Biblia</Link>
          <Link href="/#oracion">Oración</Link>
          <Link href="/#misa-en-vivo">En vivo</Link>
        </div>
        <div className="nav-actions">
          <RefreshButton />
          <Link className="nav-cta bible-back" href="/">← Inicio</Link>
        </div>
      </nav>

      <BibleReader />

      <footer className="bible-footer">
        <p>© 2026 Iglesia San Agustín · Reina‑Valera 1909</p>
        <Link href="/">Volver a la página principal</Link>
      </footer>
    </main>
  );
}
