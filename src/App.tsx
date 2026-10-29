import { useEffect, useState } from 'react';
import type { DocKind, TemplateId } from './types';
import { Editor } from './components/Editor';
import { Home, SiteHeader } from './components/Home';
import { Reports, Sales } from './components/Books';
import { KIND_COPY, KIND_ORDER } from './lib/kinds';

interface Route {
  page: 'home' | 'sales' | 'reports' | DocKind;
  template?: TemplateId;
}

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const t = new URLSearchParams(query).get('t');
  const template = t === 'classic' || t === 'minimal' || t === 'bold' ? t : undefined;
  if (path === '/sales') return { page: 'sales' };
  if (path === '/reports') return { page: 'reports' };
  const kind = KIND_ORDER.find((k) => path.startsWith(`/${KIND_COPY[k].path}`));
  if (kind) return { page: kind, template };
  return { page: 'home' };
}

function useRoute(): Route & { key: string } {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return { ...parseHash(hash), key: hash };
}

const homeTitle = 'KoboDox - Simple Bookkeeping for Business Owners';
const pageTitle = (page: Route['page']) =>
  page === 'home' ? homeTitle : page === 'sales' ? 'Sales Management - KoboDox' : page === 'reports' ? 'Business Reports - KoboDox' : `Create a ${KIND_COPY[page].noun} - KoboDox`;

export default function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = pageTitle(route.page);
    window.scrollTo(0, 0);
  }, [route.page, route.key]);

  if (route.page === 'home') return <Home />;
  if (route.page === 'sales' || route.page === 'reports') {
    return (
      <>
        <div className="app-shell top-shell">
          <SiteHeader current={route.page} />
        </div>
        {route.page === 'sales' ? <Sales /> : <Reports />}
      </>
    );
  }

  return (
    <>
      <div className="app-shell top-shell">
        <SiteHeader current={route.page} />
      </div>
      {/* key = page + template so switching between document types starts a fresh editor */}
      <Editor key={`${route.page}-${route.template ?? ''}`} kind={route.page} template={route.template} />
    </>
  );
}
