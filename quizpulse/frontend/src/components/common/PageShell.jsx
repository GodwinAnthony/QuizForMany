import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

/**
 * Simple full-height page shell with an optional top nav.
 * Keeps consistent padding and max-width across pages.
 */
export default function PageShell({ children, showNav = true, right = null }) {
  return (
    <div className="min-h-full flex flex-col">
      {showNav && (
        <header className="px-4 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="focus:outline-none">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">{right}</div>
        </header>
      )}
      <main className="flex-1 px-4 md:px-8 pb-10">{children}</main>
    </div>
  );
}
