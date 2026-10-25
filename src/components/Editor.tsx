import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { DocData, DocKind, ExtraCharge, LineItem, TemplateId } from '../types';
import { computeTotals, lineTotal } from '../lib/calc';
import { CURRENCIES, formatMoney } from '../lib/currency';
import { FREIGHT_PAYER_OPTIONS, SHIPMENT_STATUS_OPTIONS } from '../lib/docModel';
import { fileBase, fileName, saveBlob } from '../lib/files';
import { KIND_COPY } from '../lib/kinds';
import { processLogoFile } from '../lib/logo';
import { sampleDoc } from '../lib/sample';
import { canShareFiles, defaultMessage, whatsappLink, whatsappNumber } from '../lib/share';
import { clearDraft, commitNumber, createDefaultDoc, createSeededDoc, loadDraft, newCharge, newItem, peekNumber, saveDraft } from '../lib/storage';
import { TEMPLATE_ORDER, THEMES } from '../lib/theme';
import { validate } from '../lib/validate';
import { InvoiceDocument } from './InvoiceDocument';
import { ScaledPage } from './ScaledPage';
import { Input, Modal, NumInput, Segmented, Select, Textarea } from './ui';

type Dialog = null | 'ready' | 'whatsapp' | 'reset';
type Toast = { msg: string; kind: 'ok' | 'error' } | null;

function initialDoc(kind: DocKind, template?: TemplateId): DocData {
  const d = loadDraft(kind) ?? createSeededDoc(kind);
  return template ? { ...d, template } : d;
}

export function Editor({ kind, template }: { kind: DocKind; template?: TemplateId }) {
  const isInvoice = kind === 'invoice';
  const isReceipt = kind === 'receipt';
  const isQuote = kind === 'quotation';
  const isWaybill = kind === 'waybill';
  const priced = !isWaybill; // waybills list goods, not prices
  const copy = KIND_COPY[kind];
  const [data, setData] = useState<DocData>(() => initialDoc(kind, template));
  const [attempted, setAttempted] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [logoError, setLogoError] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waMsg, setWaMsg] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const errors = useMemo(() => validate(data), [data]);
  const shown = attempted ? errors : {};
  const errorCount = Object.keys(errors).length;
  const totals = useMemo(() => computeTotals(data), [data]);
  const money = (c: number) => formatMoney(c, data.currency);

  // Remember the draft on this device only (debounced).
  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(data), 500);
    return () => window.clearTimeout(t);
  }, [data]);

  // Warm up the PDF engine and fonts so the first download is instant.
  useEffect(() => {
    const t = window.setTimeout(() => {
      import('../pdf/buildPdf').then((m) => m.warmUp()).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = useCallback((msg: string, k: 'ok' | 'error' = 'ok') => {
    setToast({ msg, kind: k });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  function set<K extends keyof DocData>(key: K, value: DocData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setData((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const removeItem = (id: string) => setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));
  const addItem = () => setData((d) => ({ ...d, items: [...d.items, newItem()] }));
  const updateCharge = (id: string, patch: Partial<ExtraCharge>) =>
    setData((d) => ({ ...d, charges: d.charges.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const removeCharge = (id: string) => setData((d) => ({ ...d, charges: d.charges.filter((c) => c.id !== id) }));
  const addCharge = () => setData((d) => ({ ...d, charges: [...d.charges, newCharge()] }));

  async function onLogoChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError('');
    try {
      const logo = await processLogoFile(file);
      set('logo', logo);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'That image could not be used.');
    }
  }

  function focusFirstError() {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]') ?? document.querySelector<HTMLElement>('[data-error-block]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => el.focus?.({ preventScroll: true }), 250);
  }

  function onGenerate() {
    setAttempted(true);
    if (Object.keys(validate(data)).length > 0) {
      setTab('edit');
      window.setTimeout(focusFirstError, 60);
      return;
    }
    setDialog('ready');
  }

  async function makePdfBlob(): Promise<Blob> {
    const { buildPdf } = await import('../pdf/buildPdf');
    return buildPdf(data);
  }

  async function onDownload() {
    setBusy('download');
    try {
      const blob = await makePdfBlob();
      saveBlob(blob, fileName(data));
      commitNumber(kind, data.number);
      showToast('PDF downloaded. Check your downloads folder.');
    } catch (err) {
      console.error(err);
      showToast("We couldn't create the PDF. Please check your connection once and try again.", 'error');
    } finally {
      setBusy(null);
    }
  }

  async function onPrint() {
    setDialog(null);
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
    const previousTitle = document.title;
    document.title = fileBase(data);
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.setTimeout(restore, 120_000);
    commitNumber(kind, data.number);
    window.setTimeout(() => window.print(), 200);
  }

  function openWhatsApp() {
    setWaPhone(whatsappNumber(data.customerPhone, data.currency));
    setWaMsg(defaultMessage(data, totals));
    setDialog('whatsapp');
  }

  async function onSharePdf() {
    setBusy('share');
    try {
      const blob = await makePdfBlob();
      const file = new File([blob], fileName(data), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileBase(data), text: waMsg });
        commitNumber(kind, data.number);
      } else {
        saveBlob(blob, fileName(data));
        showToast('Your phone cannot share files from here, so the PDF was downloaded instead.');
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error(err);
        showToast("We couldn't share the PDF. Try downloading it instead.", 'error');
      }
    } finally {
      setBusy(null);
    }
  }

  function onReset() {
    clearDraft(kind);
    setData(createDefaultDoc(kind));
    setAttempted(false);
    setLogoError('');
    setDialog(null);
    showToast(`Started a fresh ${copy.noun}.`);
  }

  function onSample() {
    setData((d) => ({ ...sampleDoc(kind, d.template, 'partial'), logo: d.logo, number: d.number }));
    setAttempted(false);
    showToast('Sample details added. Replace them with your own.');
  }

  const waDigits = waPhone.replace(/\D/g, '');
  const canShare = useMemo(() => canShareFiles(), []);
  const docWord = copy.noun;
  let stepNo = 0;
  const nextStep = () => ++stepNo;

  return (
    <>
      <div className="app-shell editor-page">
        <div className="editor-toolbar">
          <div>
            <h1>Create {copy.noun}</h1>
            <p className="muted">Fill in the details. The preview updates as you type.</p>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="btn ghost sm" onClick={onSample}>
              <Sparkles size={16} /> Fill with sample
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setDialog('reset')}>
              <RotateCcw size={16} /> Start over
            </button>
          </div>
        </div>

        <div className="editor-grid" data-tab={tab}>
          {/* ------------------------------ FORM ------------------------------ */}
          <div className="form-col">
            <section className="card">
              <h2 className="card-title">
                <span className="step">{nextStep()}</span> {copy.businessTitle}
              </h2>
              <Input label="Business name" required value={data.businessName} onChange={(v) => set('businessName', v)} error={shown.businessName} placeholder="e.g. Adaeze Interiors Ltd" autoComplete="organization" />
              <div className="logo-row">
                <div className="logo-box">
                  {data.logo ? <img src={data.logo.dataUrl} alt="Your logo" /> : <ImagePlus size={22} aria-hidden="true" />}
                </div>
                <div className="logo-actions">
                  <span className="label-like">Business logo</span>
                  <div className="row">
                    <button type="button" className="btn outline sm" onClick={() => fileInput.current?.click()}>
                      {data.logo ? 'Change logo' : 'Upload logo'}
                    </button>
                    {data.logo && (
                      <button type="button" className="btn ghost sm" onClick={() => set('logo', null)}>
                        Remove
                      </button>
                    )}
                  </div>
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={onLogoChosen} />
                  {logoError ? (
                    <p className="err" role="alert">
                      {logoError}
                    </p>
                  ) : (
                    <p className="hint">PNG or JPG, up to 5 MB. It never leaves your device.</p>
                  )}
                </div>
              </div>
              <div className="grid-2">
                <Input label="Phone number" type="tel" value={data.businessPhone} onChange={(v) => set('businessPhone', v)} placeholder="+234 803 000 0000" autoComplete="tel" />
                <Input label="Email" type="email" value={data.businessEmail} onChange={(v) => set('businessEmail', v)} error={shown.businessEmail} placeholder="you@business.com" autoComplete="email" />
              </div>
              <Textarea label="Address" rows={2} value={data.businessAddress} onChange={(v) => set('businessAddress', v)} placeholder={'Street, area\nCity, State'} />
            </section>

            <section className="card">
              <h2 className="card-title">
                <span className="step">{nextStep()}</span> {copy.partyTitle}
              </h2>
              <Input label={copy.partyNameLabel} required value={data.customerName} onChange={(v) => set('customerName', v)} error={shown.customerName} placeholder={copy.partyNamePlaceholder} />
              <div className="grid-2">
                <Input label="Phone number" type="tel" value={data.customerPhone} onChange={(v) => set('customerPhone', v)} placeholder="+234 809 000 0000" />
                <Input label="Email" type="email" value={data.customerEmail} onChange={(v) => set('customerEmail', v)} error={shown.customerEmail} placeholder="customer@email.com" />
              </div>
              <Textarea label="Address" rows={2} value={data.customerAddress} onChange={(v) => set('customerAddress', v)} placeholder={'Street, area\nCity, State'} />
            </section>

            <section className="card">
              <h2 className="card-title">
                <span className="step">{nextStep()}</span> {copy.Noun} details
              </h2>
              <div className="number-row">
                <Input label={copy.numberLabel} required value={data.number} onChange={(v) => set('number', v)} error={shown.number} />
                <button type="button" className="btn outline sm" onClick={() => set('number', peekNumber(kind))} title="Generate the next number automatically">
                  <RefreshCw size={15} /> Auto
                </button>
              </div>
              <div className="grid-2">
                <Input label={copy.dateLabel} type="date" required value={data.issueDate} onChange={(v) => set('issueDate', v)} error={shown.issueDate} />
                {(isInvoice || isQuote) && (
                  <Input label={isQuote ? 'Valid until' : 'Due date'} type="date" required value={data.dueDate} onChange={(v) => set('dueDate', v)} error={shown.dueDate} />
                )}
                {isWaybill && <Input label="Expected delivery (optional)" type="date" value={data.expectedDate} onChange={(v) => set('expectedDate', v)} error={shown.expectedDate} />}
                {isReceipt && (
                  <Select
                    label="Payment method"
                    value={data.paymentMethod}
                    onChange={(v) => set('paymentMethod', v)}
                    options={['Cash', 'Bank transfer', 'POS / Card', 'Cheque', 'Mobile money', 'Other'].map((m) => ({ value: m, label: m }))}
                  />
                )}
              </div>
              {isWaybill && (
                <div className="grid-2">
                  <Input label="From (pick-up town / city)" required value={data.origin} onChange={(v) => set('origin', v)} error={shown.origin} placeholder="e.g. Enugu" />
                  <Input label="To (delivery town / city)" required value={data.destination} onChange={(v) => set('destination', v)} error={shown.destination} placeholder="e.g. Lagos" />
                </div>
              )}
              {isReceipt && <Input label="Payment reference (optional)" value={data.reference} onChange={(v) => set('reference', v)} placeholder="e.g. transfer reference or invoice number" />}
              <Select label="Currency" value={data.currency} onChange={(v) => set('currency', v)} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))} />
            </section>

            {isWaybill && (
              <section className="card">
                <h2 className="card-title">
                  <span className="step">{nextStep()}</span> Transport
                </h2>
                <div className="grid-2">
                  <Select
                    label="Mode of transport"
                    value={data.transportMode}
                    onChange={(v) => set('transportMode', v)}
                    options={['Road', 'Rail', 'Air', 'Sea', 'Courier / dispatch rider', 'Other'].map((m) => ({ value: m, label: m }))}
                  />
                  <Select
                    label="Shipment status"
                    value={data.shipmentStatus}
                    onChange={(v) => set('shipmentStatus', v as DocData['shipmentStatus'])}
                    options={SHIPMENT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                </div>
                <div className="grid-2">
                  <Input label="Vehicle number (optional)" value={data.vehicleNo} onChange={(v) => set('vehicleNo', v)} placeholder="e.g. ENU 482 XA" />
                  <Input label="Driver name (optional)" value={data.driverName} onChange={(v) => set('driverName', v)} />
                </div>
                <Input label="Driver phone (optional)" type="tel" value={data.driverPhone} onChange={(v) => set('driverPhone', v)} placeholder="+234 802 000 0000" />
              </section>
            )}

            <section className="card" data-error-block={shown.items ? 'true' : undefined} tabIndex={-1}>
              <h2 className="card-title">
                <span className="step">{nextStep()}</span> {isWaybill ? 'Goods being sent' : 'Items & services'}
              </h2>
              {shown.items && (
                <p className="err banner-err" role="alert">
                  <AlertCircle size={16} /> {shown.items}
                </p>
              )}
              {data.items.map((it, i) => (
                <div className="item-card" key={it.id}>
                  <div className="item-head">
                    <span className="item-n">Item {i + 1}</span>
                    <button type="button" className="icon-btn danger" onClick={() => removeItem(it.id)} disabled={data.items.length === 1} aria-label={`Remove item ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Input
                    label="Description"
                    required
                    value={it.description}
                    onChange={(v) => updateItem(it.id, { description: v })}
                    error={shown[`item-${it.id}-description`]}
                    placeholder={isWaybill ? 'What goods are being sent?' : 'What are you charging for?'}
                  />
                  <Input
                    label="Extra details (optional)"
                    value={it.details}
                    onChange={(v) => updateItem(it.id, { details: v })}
                    placeholder={isWaybill ? 'Packaging, condition, handling notes...' : 'Size, colour, scope of work...'}
                  />
                  {isWaybill ? (
                    <div className="grid-3">
                      <NumInput label="Quantity" required value={it.qty} onChange={(v) => updateItem(it.id, { qty: v })} error={shown[`item-${it.id}-qty`]} />
                      <Input label="Unit" value={it.unit} onChange={(v) => updateItem(it.id, { unit: v })} placeholder="bags, cartons..." />
                      <NumInput label="Weight kg (optional)" value={it.weight} onChange={(v) => updateItem(it.id, { weight: v })} error={shown[`item-${it.id}-weight`]} placeholder="0" />
                    </div>
                  ) : (
                    <div className="grid-3">
                      <NumInput label="Quantity" required value={it.qty} onChange={(v) => updateItem(it.id, { qty: v })} error={shown[`item-${it.id}-qty`]} />
                      <NumInput label="Unit price" required value={it.price} onChange={(v) => updateItem(it.id, { price: v })} error={shown[`item-${it.id}-price`]} placeholder="0.00" />
                      <div className="line-total">
                        <span>Amount</span>
                        <strong>{money(lineTotal(it))}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className="btn outline full" onClick={addItem}>
                <Plus size={16} /> Add another item
              </button>
            </section>

            {priced && (
            <section className="card">
              <h2 className="card-title">
                <span className="step">{nextStep()}</span> Discount, tax &amp; charges
              </h2>
              <div className="adjust">
                <div className="adjust-head">
                  <span className="label-like">Discount</span>
                  <Segmented
                    label="Discount type"
                    value={data.discountMode}
                    onChange={(v) => set('discountMode', v)}
                    options={[
                      { value: 'percent', label: '%' },
                      { value: 'fixed', label: data.currency },
                    ]}
                  />
                </div>
                <NumInput label={data.discountMode === 'percent' ? 'Discount (%)' : 'Discount amount'} value={data.discountValue} onChange={(v) => set('discountValue', v)} error={shown.discountValue} placeholder="0" />
              </div>
              <div className="grid-2">
                <Input label="Tax name" value={data.taxLabel} onChange={(v) => set('taxLabel', v)} placeholder="VAT" />
                <NumInput label="Tax rate (%)" value={data.taxRate} onChange={(v) => set('taxRate', v)} error={shown.taxRate} placeholder="7.5" />
              </div>
              <div className="charges">
                <span className="label-like">Additional charges (delivery, installation...)</span>
                {data.charges.map((c) => (
                  <div className="charge-row" key={c.id}>
                    <Input label="Charge name" value={c.label} onChange={(v) => updateCharge(c.id, { label: v })} error={shown[`charge-${c.id}-label`]} placeholder="Delivery" />
                    <NumInput label="Amount" value={c.amount} onChange={(v) => updateCharge(c.id, { amount: v })} error={shown[`charge-${c.id}-amount`]} placeholder="0.00" />
                    <button type="button" className="icon-btn danger" onClick={() => removeCharge(c.id)} aria-label="Remove charge">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn outline sm" onClick={addCharge}>
                  <Plus size={15} /> Add a charge
                </button>
              </div>
              <div className="calc-box" aria-live="polite">
                <div>
                  <span>Subtotal</span>
                  <b>{money(totals.subtotal)}</b>
                </div>
                <div className="total">
                  <span>Total</span>
                  <b>{money(totals.total)}</b>
                </div>
              </div>
            </section>
            )}

            {isWaybill && (
              <section className="card">
                <h2 className="card-title">
                  <span className="step">{nextStep()}</span> Freight &amp; value (optional)
                </h2>
                <div className="grid-2">
                  <NumInput label="Freight charge" value={data.freightCharge} onChange={(v) => set('freightCharge', v)} error={shown.freightCharge} placeholder="0.00" />
                  <Select
                    label="Freight paid by"
                    value={data.freightPayer}
                    onChange={(v) => set('freightPayer', v as DocData['freightPayer'])}
                    options={FREIGHT_PAYER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                </div>
                <NumInput label="Declared value of goods" value={data.declaredValue} onChange={(v) => set('declaredValue', v)} error={shown.declaredValue} placeholder="0.00" />
                <p className="hint">Amounts are shown in the currency chosen above. Leave them empty to hide them on the waybill.</p>
              </section>
            )}

            {(isInvoice || isQuote) && (
              <section className="card">
                <h2 className="card-title">
                  <span className="step">{nextStep()}</span> {isInvoice ? 'Payment' : 'Payment details (optional)'}
                </h2>
                {isInvoice && (
                  <>
                    <span className="label-like">Payment status</span>
                    <Segmented
                      label="Payment status"
                      value={data.status}
                      onChange={(v) => set('status', v)}
                      options={[
                        { value: 'unpaid', label: 'Unpaid' },
                        { value: 'partial', label: 'Partially paid' },
                        { value: 'paid', label: 'Paid' },
                      ]}
                    />
                    {data.status === 'partial' && (
                      <div className="partial-box">
                        <NumInput label="Amount already paid" required value={data.amountPaid} onChange={(v) => set('amountPaid', v)} error={shown.amountPaid} placeholder="0.00" />
                        <p className="hint">Balance due: {money(totals.balance)}</p>
                      </div>
                    )}
                  </>
                )}
                <div className="grid-2">
                  <Input label="Bank name" value={data.bankName} onChange={(v) => set('bankName', v)} placeholder="e.g. Zenith Bank" />
                  <Input label="Account name" value={data.accountName} onChange={(v) => set('accountName', v)} />
                </div>
                <Input label="Account number" inputMode="numeric" value={data.accountNumber} onChange={(v) => set('accountNumber', v)} placeholder="10 digits" />
                <Textarea label="Payment instructions" rows={2} value={data.paymentInstructions} onChange={(v) => set('paymentInstructions', v)} placeholder={isQuote ? 'e.g. Pay the deposit into this account to confirm the order.' : 'e.g. Please use the invoice number as your transfer reference.'} />
              </section>
            )}

            <section className="card">
              <h2 className="card-title">
                <span className="step">{nextStep()}</span> {isReceipt ? 'Notes' : isWaybill ? 'Instructions & terms' : 'Notes & terms'}
              </h2>
              <Textarea
                label={isWaybill ? 'Special instructions' : 'Notes'}
                rows={3}
                value={data.notes}
                onChange={(v) => set('notes', v)}
                placeholder={isWaybill ? 'e.g. Call the receiver before arrival. Handle with care.' : 'A thank-you message or anything the customer should know.'}
              />
              {!isReceipt && (
                <Textarea
                  label="Terms & conditions"
                  rows={3}
                  value={data.terms}
                  onChange={(v) => set('terms', v)}
                  placeholder={isQuote ? 'Validity, deposit, delivery time...' : isWaybill ? 'Liability, inspection on delivery...' : 'Late payment, refunds, delivery terms...'}
                />
              )}
            </section>

            <div className="generate-card">
              {attempted && errorCount > 0 && (
                <div className="error-summary" role="alert">
                  <AlertCircle size={18} />
                  <div>
                    <strong>
                      Please fix {errorCount} {errorCount === 1 ? 'thing' : 'things'} first:
                    </strong>
                    <ul>
                      {Object.values(errors)
                        .slice(0, 4)
                        .map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      {errorCount > 4 && <li>...and {errorCount - 4} more</li>}
                    </ul>
                  </div>
                </div>
              )}
              <button type="button" className="btn primary lg full" onClick={onGenerate}>
                <FileText size={18} /> Generate {docWord}
              </button>
              <p className="hint center">You'll confirm before anything is downloaded.</p>
            </div>
          </div>

          {/* ----------------------------- PREVIEW ----------------------------- */}
          <aside className="preview-col">
            <div className="preview-sticky">
              <div className="template-tabs" role="tablist" aria-label="Choose a template">
                {TEMPLATE_ORDER.map((id) => (
                  <button key={id} type="button" role="tab" aria-selected={data.template === id} className={data.template === id ? 'on' : ''} onClick={() => set('template', id)}>
                    <i style={{ background: THEMES[id].accent }} aria-hidden="true" />
                    <span>{THEMES[id].name}</span>
                  </button>
                ))}
              </div>
              <div className="preview-paper">
                <ScaledPage>
                  <InvoiceDocument data={data} />
                </ScaledPage>
              </div>
              <button type="button" className="btn primary full desktop-only" onClick={onGenerate}>
                <FileText size={17} /> Generate {docWord}
              </button>
            </div>
          </aside>
        </div>

        {/* Mobile bottom bar */}
        <div className="mobile-bar">
          <div className="segmented small" role="tablist" aria-label="Switch view">
            <button type="button" role="tab" aria-selected={tab === 'edit'} className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>
              <Pencil size={15} /> Edit
            </button>
            <button type="button" role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>
              <Eye size={15} /> Preview
            </button>
          </div>
          <button type="button" className="btn primary" onClick={onGenerate}>
            Generate
          </button>
        </div>

        {/* ------------------------------ DIALOGS ------------------------------ */}
        <Modal open={dialog === 'ready'} onClose={() => setDialog(null)} title={`Your ${docWord} is ready`}>
          <div className="ready-summary">
            <div>
              <span>{copy.Noun} no.</span>
              <b>{data.number}</b>
            </div>
            <div>
              <span>{copy.partyShort}</span>
              <b>{data.customerName}</b>
            </div>
            {isWaybill ? (
              <div>
                <span>Route</span>
                <b>
                  {data.origin} → {data.destination}
                </b>
              </div>
            ) : (
              <div>
                <span>{isReceipt ? 'Amount received' : isInvoice && data.status === 'partial' ? 'Balance due' : 'Total'}</span>
                <b>{money(isInvoice && data.status === 'partial' ? totals.balance : totals.total)}</b>
              </div>
            )}
          </div>
          <p className="muted">Everything is created on your device. Choose what you'd like to do:</p>
          <div className="stack">
            <button type="button" className="btn primary lg full" onClick={onDownload} disabled={busy !== null}>
              {busy === 'download' ? <Loader2 size={18} className="spin" /> : <Download size={18} />} Download PDF
            </button>
            <div className="grid-2">
              <button type="button" className="btn outline full" onClick={onPrint}>
                <Printer size={17} /> Print
              </button>
              <button type="button" className="btn outline full" onClick={openWhatsApp}>
                <MessageCircle size={17} /> WhatsApp
              </button>
            </div>
            <button type="button" className="btn ghost full" onClick={() => setDialog(null)}>
              Keep editing
            </button>
          </div>
        </Modal>

        <Modal open={dialog === 'whatsapp'} onClose={() => setDialog(null)} title="Share on WhatsApp">
          <Input label="Customer's WhatsApp number (optional)" type="tel" inputMode="tel" value={waPhone} onChange={setWaPhone} hint="With country code, e.g. 2348031234567. Leave empty to pick a chat in WhatsApp." />
          <Textarea label="Message" rows={6} value={waMsg} onChange={setWaMsg} />
          <div className="stack">
            {canShare && (
              <button type="button" className="btn primary lg full" onClick={onSharePdf} disabled={busy !== null}>
                {busy === 'share' ? <Loader2 size={18} className="spin" /> : <Share2 size={18} />} Share the PDF (choose WhatsApp)
              </button>
            )}
            <a
              className={`btn ${canShare ? 'outline' : 'primary lg'} full`}
              href={whatsappLink(waDigits, waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => commitNumber(kind, data.number)}
            >
              <MessageCircle size={18} /> Open WhatsApp with this message
            </a>
            <button type="button" className="btn outline full" onClick={onDownload} disabled={busy !== null}>
              {busy === 'download' ? <Loader2 size={17} className="spin" /> : <Download size={17} />} Download the PDF to attach
            </button>
          </div>
          <p className="hint">
            {canShare
              ? 'Tip: "Share the PDF" sends the real file. The message button only opens a chat with text.'
              : 'WhatsApp links cannot attach files by themselves. Download the PDF first, then attach it in the chat.'}
          </p>
          <button type="button" className="btn ghost full" onClick={() => setDialog('ready')}>
            Back
          </button>
        </Modal>

        <Modal open={dialog === 'reset'} onClose={() => setDialog(null)} title="Start over?">
          <p>This clears everything you've typed for this {docWord}, including your logo. This can't be undone.</p>
          <div className="grid-2">
            <button type="button" className="btn outline full" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button type="button" className="btn danger full" onClick={onReset}>
              Yes, clear it
            </button>
          </div>
        </Modal>

        {toast && (
          <div className={`toast ${toast.kind}`} role="status" aria-live="polite">
            {toast.kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.msg}</span>
            <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setToast(null)}>
              <Check size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Only this is shown when printing. */}
      <div className="print-only">
        <InvoiceDocument data={data} />
      </div>
    </>
  );
}
