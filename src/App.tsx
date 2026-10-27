import { useEffect, useState } from 'react';
import type { DocKind, TemplateId } from './types';
import { Editor } from './components/Editor';
import { Home, SiteHeader } from './components/Home';
import { KIND_COPY, KIND_ORDER } from './lib/kinds';

interface Route {
  page: 'home' | DocKind;
  template?: TemplateId;
}

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const t = new URLSearchParams(query).get('t');
  const template = t === 'classic' || t === 'minimal' || t === 'bold' ? t : undefined;
  const segment = path.replace(/^\/+/, '').split('/')[0];
  const kind = KIND_ORDER.find((k) => KIND_COPY[k].path === segment);
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

function pageTitle(page: Route['page']): string {
  if (page === 'home') return 'KoboDox - Professional Invoices. Made Simple.';
  const noun = KIND_COPY[page].noun;
  return `Create ${/^[aeiou]/.test(noun) ? 'an' : 'a'} ${noun} - KoboDox`;
}

export default function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = pageTitle(route.page);
    window.scrollTo(0, 0);
  }, [route.page, route.key]);

  if (route.page === 'home') return <Home />;

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
