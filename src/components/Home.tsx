import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, FileText, Lock, Receipt, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import type { DocKind, TemplateId } from '../types';
import { KIND_COPY, KIND_ORDER } from '../lib/kinds';
import { sampleDoc } from '../lib/sample';
import { TEMPLATE_ORDER, THEMES } from '../lib/theme';
import { InvoiceDocument } from './InvoiceDocument';
import { ScaledPage } from './ScaledPage';
import { Brand } from './ui';

/** Every document type except the two big buttons in the hero. */
const MORE_KINDS = KIND_ORDER.filter((k) => k !== 'invoice' && k !== 'receipt');

export function SiteHeader({ current }: { current: 'home' | DocKind }) {
  // With nine document types the switcher scrolls sideways, so keep the current one in view.
  useEffect(() => {
    document.querySelector('.doc-switch a[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [current]);

  return (
    <header className="site-header">
      <div className="container bar">
        <a href="#/" className="brand-link" aria-label="KoboDox home">
          <Brand />
        </a>
        {current === 'home' ? (
          <nav className="nav" aria-label="Main">
            <button
              type="button"
              className="nav-link"
              onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How it works
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Templates
            </button>
            <a className="btn ghost sm hide-xs" href="#/receipt">
              Create Receipt
            </a>
            <a className="btn primary sm" href="#/invoice">
              Create Invoice
            </a>
          </nav>
        ) : (
          <nav className="nav" aria-label="Document type">
            <div className="segmented small doc-switch">
              {KIND_ORDER.map((k) => (
                <a key={k} href={`#/${KIND_COPY[k].path}`} className={current === k ? 'on' : ''} aria-current={current === k ? 'page' : undefined}>
                  {KIND_COPY[k].Noun}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export function Home() {
  const [tpl, setTpl] = useState<TemplateId>('classic');
  const heroDoc = useMemo(() => sampleDoc('invoice', tpl, 'unpaid'), [tpl]);
  const classicDoc = useMemo(() => sampleDoc('invoice', 'classic', 'unpaid'), []);
  const minimalDoc = useMemo(() => sampleDoc('invoice', 'minimal', 'unpaid'), []);
  const boldDoc = useMemo(() => sampleDoc('invoice', 'bold', 'unpaid'), []);
  const docs = { classic: classicDoc, minimal: minimalDoc, bold: boldDoc };

  return (
    <div className="app-shell home">
      <SiteHeader current="home" />

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="pill">
                <Lock size={14} /> No account. No sign-up. 100% private.
              </span>
              <h1>
                Professional Invoices. <span className="accent">Made Simple.</span>
              </h1>
              <p className="lead">Create beautiful invoices and receipts in seconds. No account required.</p>
              <div className="cta-row">
                <a className="btn primary lg" href="#/invoice">
                  <FileText size={19} /> Create Invoice <ArrowRight size={18} />
                </a>
                <a className="btn outline lg" href="#/receipt">
                  <Receipt size={19} /> Create Receipt
                </a>
              </div>
              <p className="more-docs">
                Also make a{' '}
                {MORE_KINDS.map((k, i) => (
                  <span key={k}>
                    <a href={`#/${KIND_COPY[k].path}`}>{KIND_COPY[k].Noun}</a>
                    {i < MORE_KINDS.length - 2 ? ', ' : i === MORE_KINDS.length - 2 ? ' or ' : ''}
                  </span>
                ))}
                .
              </p>
              <ul className="trust">
                <li>
                  <ShieldCheck size={17} /> Your data never leaves your device
                </li>
                <li>
                  <Smartphone size={17} /> Works on phone, tablet and computer
                </li>
                <li>
                  <Download size={17} /> Clean A4 PDF, ready to send
                </li>
              </ul>
            </div>

            <div className="hero-visual">
              <div className="hero-glow" aria-hidden="true" />
              <div className="hero-paper" aria-label="Preview of a professionally designed invoice">
                <ScaledPage maxHeight={620}>
                  <InvoiceDocument data={heroDoc} />
                </ScaledPage>
              </div>
              <div className="hero-chips" role="tablist" aria-label="Preview a template">
                {TEMPLATE_ORDER.map((id) => (
                  <button key={id} type="button" role="tab" aria-selected={tpl === id} className={tpl === id ? 'on' : ''} onClick={() => setTpl(id)}>
                    <i style={{ background: THEMES[id].accent }} aria-hidden="true" />
                    {THEMES[id].name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="container">
            <div className="section-head">
              <h2>How it works</h2>
              <p>Three quick steps from blank page to a bill you're proud to send.</p>
            </div>
            <ol className="steps">
              <li>
                <span className="step-icon">
                  <FileText size={22} />
                </span>
                <h3>1. Fill in the details</h3>
                <p>Add your business, your customer and the items. Totals, discounts and tax are worked out for you.</p>
              </li>
              <li>
                <span className="step-icon">
                  <Zap size={22} />
                </span>
                <h3>2. Pick a template</h3>
                <p>Switch between three professional designs and watch the invoice update instantly.</p>
              </li>
              <li>
                <span className="step-icon">
                  <Download size={22} />
                </span>
                <h3>3. Download, print or share</h3>
                <p>Get a crisp A4 PDF, print it, or send it to your customer on WhatsApp.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section alt" id="templates">
          <div className="container">
            <div className="section-head">
              <h2>Three designs. One look: professional.</h2>
              <p>Pick the style that fits your brand. Tap a design to start with it.</p>
            </div>
            <div className="tpl-grid">
              {TEMPLATE_ORDER.map((id) => (
                <a key={id} className="tpl-card" href={`#/invoice?t=${id}`}>
                  <div className="tpl-thumb">
                    <ScaledPage maxHeight={360}>
                      <InvoiceDocument data={docs[id]} />
                    </ScaledPage>
                  </div>
                  <div className="tpl-meta">
                    <strong>{THEMES[id].name}</strong>
                    <span>{THEMES[id].tagline}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container final-cta">
            <h2>Ready when you are.</h2>
            <p>No account to create and nothing to install. Just open it and start.</p>
            <div className="cta-row center">
              <a className="btn primary lg" href="#/invoice">
                Create Invoice <ArrowRight size={18} />
              </a>
              <a className="btn outline lg" href="#/receipt">
                Create Receipt
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container foot-grid">
          <div>
            <Brand small />
            <p className="muted">Free invoices, receipts, quotations, orders, vouchers, credit and debit notes, and waybills for vendors, freelancers and small businesses.</p>
          </div>
          <div>
            <strong>Create</strong>
            {KIND_ORDER.map((k) => (
              <a key={k} href={`#/${KIND_COPY[k].path}`}>
                {KIND_COPY[k].Noun}
              </a>
            ))}
          </div>
          <div>
            <strong>Privacy</strong>
            <p className="muted">Everything is made in your browser. We don't collect, store or send your business or customer details.</p>
          </div>
        </div>
        <div className="container foot-base">© {new Date().getFullYear()} KoboDox. Made for small businesses.</div>
      </footer>
    </div>
  );
}
