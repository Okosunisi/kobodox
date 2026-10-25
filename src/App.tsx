import { useEffect, useState } from 'react';
import type { DocKind, TemplateId } from './types';
import { Editor } from './components/Editor';
import { Home, SiteHeader } from './components/Home';

interface Route {
  page: 'home' | DocKind;
  template?: TemplateId;
}

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const t = new URLSearchParams(query).get('t');
  const template = t === 'classic' || t === 'minimal' || t === 'bold' ? t : undefined;
  if (path.startsWith('/invoice')) return { page: 'invoice', template };
  if (path.startsWith('/receipt')) return { page: 'receipt', template };
  if (path.startsWith('/quotation')) return { page: 'quotation', template };
  if (path.startsWith('/waybill')) return { page: 'waybill', template };
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

const TITLES = {
  home: 'SNAP BILL - Professional Invoices. Made Simple.',
  invoice: 'Create an invoice - SNAP BILL',
  receipt: 'Create a receipt - SNAP BILL',
  quotation: 'Create a quotation - SNAP BILL',
  waybill: 'Create a waybill - SNAP BILL',
};

export default function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = TITLES[route.page];
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
