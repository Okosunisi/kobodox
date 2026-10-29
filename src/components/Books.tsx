import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Input, Modal, Segmented, Select, Textarea } from './ui';
import { addDays, formatDate, parseISO, toISO, todayISO } from '../lib/dates';
import {
  CATS, PAYS, dropExpense, dropSale, listExpenses, listSales, localCount, makePdf, moveLocalToCloud, putExpense, putSale, SAMPLE_DATE, byProduct, daysIn, downloadCsv, inRange, isNum, kobo2n, monthRange, naira, newId,
  perDay, periodRange, sampleExpenses, sampleSales, sumExpenses, toKobo, totals, weekRange,
} from '../lib/books';
import type { Expense, Pay, PdfSection, Range, Sale } from '../lib/books';
import { cloudOn, sessionEmail, signIn, signOut, signUp } from '../lib/cloud';

type Msg = { ok: boolean; text: string } | null;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayName = (iso: string) => DAYS[(((parseISO(iso) ?? new Date()).getDay() + 6) % 7)];
const payOpts = PAYS.map((p) => ({ value: p, label: p }));

function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="container bk-page">
      <h1 className="bk-title">{title}</h1>
      <p className="muted">{intro}</p>
      {children}
    </main>
  );
}
const Banner = ({ ok, children }: { ok?: boolean; children: ReactNode }) => <div className={`bk-banner ${ok === false ? 'err' : ok ? 'ok' : ''}`} role="status">{children}</div>;
const Cards = ({ items }: { items: Array<[string, string]> }) => (
  <div className="bk-cards">{items.map(([k, v]) => <div key={k} className="bk-card"><span>{k}</span><b>{v}</b></div>)}</div>
);
function Table({ head, rows, foot, empty }: { head: string[]; rows: ReactNode[][]; foot?: ReactNode[]; empty: string }) {
  if (!rows.length) return <p className="bk-empty">{empty}</p>;
  return (
    <div className="bk-table-wrap">
      <table className="bk-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        {foot && <tfoot><tr>{foot.map((c, j) => <td key={j}>{c}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}
function Bars({ items }: { items: Array<[string, number]> }) {
  const max = Math.max(1, ...items.map((i) => i[1]));
  return (
    <div className="bk-bars" role="img" aria-label="Sales chart">
      {items.map(([l, v], i) => (
        <div key={i} className="bk-bar" title={`${l}: ${naira(v)}`}>
          <i style={{ height: `${(v / max) * 100}%` }} />
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}
function Confirm({ what, onYes, onNo }: { what: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal open onClose={onNo} title={`Delete this ${what}?`}>
      <p>This cannot be undone.</p>
      <div className="grid-2">
        <button type="button" className="btn outline" onClick={onNo}>Cancel</button>
        <button type="button" className="btn primary" onClick={onYes}>Delete</button>
      </div>
    </Modal>
  );
}
function Actions({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  return (
    <span className="bk-actions">
      {onEdit && <button type="button" className="btn outline sm" onClick={onEdit} aria-label="Edit"><Pencil size={14} /></button>}
      <button type="button" className="btn outline sm" onClick={onDelete} aria-label="Delete"><Trash2 size={14} /></button>
    </span>
  );
}

/* ------------------------------------------------------------------ forms */
function SaleForm({ initial, onSave, onClose }: { initial: Sale | null; onSave: (s: Sale) => void; onClose: () => void }) {
  const [f, setF] = useState({
    date: initial?.date ?? todayISO(), product: initial?.product ?? '', qty: initial ? String(initial.qty) : '1', price: initial ? kobo2n(initial.price) : '',
    pay: (initial?.pay ?? 'Cash') as Pay, customer: initial?.customer ?? '', notes: initial?.notes ?? '',
  });
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }));
  const qtyOk = isNum(f.qty) && Number(f.qty) > 0;
  const err = {
    date: parseISO(f.date) ? '' : 'Pick a valid date.',
    product: f.product.trim() ? '' : 'Enter the product or service.',
    qty: qtyOk ? '' : 'Enter a quantity above 0 (no negative numbers).',
    price: isNum(f.price) ? '' : 'Enter a price of 0 or more.',
  };
  const total = qtyOk && isNum(f.price) ? Math.round(Number(f.qty) * toKobo(f.price)) : 0;
  const submit = () => {
    setTried(true);
    if (Object.values(err).some(Boolean)) return;
    onSave({ id: initial?.id ?? newId(), date: f.date, product: f.product.trim(), qty: Number(f.qty), price: toKobo(f.price), total, pay: f.pay, customer: f.customer.trim(), notes: f.notes.trim() });
  };
  const e = (k: keyof typeof err) => (tried ? err[k] : undefined);
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit transaction' : 'Add transaction'}>
      <Input label="Date" type="date" required value={f.date} onChange={set('date')} error={e('date')} />
      <Input label="Product or service name" required value={f.product} onChange={set('product')} error={e('product')} placeholder="e.g. Bread" />
      <div className="grid-2">
        <Input label="Quantity sold" required inputMode="decimal" value={f.qty} onChange={set('qty')} error={e('qty')} />
        <Input label="Unit price (₦)" required inputMode="decimal" value={f.price} onChange={set('price')} error={e('price')} placeholder="0.00" />
      </div>
      <div className="bk-total">Total amount <b>{naira(total)}</b></div>
      <Select label="Payment method" value={f.pay} onChange={set('pay')} options={payOpts} />
      <Input label="Customer name (optional)" value={f.customer} onChange={set('customer')} />
      <Textarea label="Notes (optional)" rows={2} value={f.notes} onChange={set('notes')} />
      <button type="button" className="btn primary lg full" onClick={submit}>Save transaction</button>
    </Modal>
  );
}
function ExpenseForm({ initial, onSave, onClose }: { initial: Expense | null; onSave: (x: Expense) => void; onClose: () => void }) {
  const [f, setF] = useState({
    date: initial?.date ?? todayISO(), name: initial?.name ?? '', amount: initial ? kobo2n(initial.amount) : '', category: initial?.category ?? CATS[0],
    pay: (initial?.pay ?? 'Cash') as Pay, notes: initial?.notes ?? '',
  });
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }));
  const err = { date: parseISO(f.date) ? '' : 'Pick a valid date.', name: f.name.trim() ? '' : 'Enter what you spent money on.', amount: isNum(f.amount) && toKobo(f.amount) > 0 ? '' : 'Enter an amount above 0.' };
  const submit = () => {
    setTried(true);
    if (Object.values(err).some(Boolean)) return;
    onSave({ id: initial?.id ?? newId(), date: f.date, name: f.name.trim(), amount: toKobo(f.amount), category: f.category, pay: f.pay, notes: f.notes.trim() });
  };
  const e = (k: keyof typeof err) => (tried ? err[k] : undefined);
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit expense' : 'Add expense'}>
      <Input label="Date" type="date" required value={f.date} onChange={set('date')} error={e('date')} />
      <Input label="Expense name" required value={f.name} onChange={set('name')} error={e('name')} placeholder="e.g. Shop electricity" />
      <Input label="Amount spent (₦)" required inputMode="decimal" value={f.amount} onChange={set('amount')} error={e('amount')} placeholder="0.00" />
      <Select label="Expense category" value={f.category} onChange={set('category')} options={CATS.map((c) => ({ value: c, label: c }))} />
      <Select label="Payment method" value={f.pay} onChange={set('pay')} options={payOpts} />
      <Textarea label="Description or notes (optional)" rows={2} value={f.notes} onChange={set('notes')} />
      <button type="button" className="btn primary lg full" onClick={submit}>Save expense</button>
    </Modal>
  );
}

/* ------------------------------------------------------------ Sales page */
const saleRows = (list: Sale[], actions: (s: Sale) => ReactNode): ReactNode[][] =>
  list.map((s) => [formatDate(s.date), s.product, s.qty, naira(s.price), naira(s.total), s.pay, s.customer || '—', actions(s)]);
const SALE_HEAD = ['Date', 'Product / service', 'Quantity', 'Unit price', 'Total amount', 'Payment', 'Customer', 'Actions'];

function SalesPage() {
  const [real, setReal] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState(false);
  const [demo, setDemo] = useState(sampleSales);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'date' | 'range'>('today');
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('all');
  const [edit, setEdit] = useState<Sale | 'new' | null>(null);
  const [del, setDel] = useState<Sale | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const data = sample ? demo : real;
  const range: Range = period === 'today' ? { from: todayISO(), to: todayISO() } : period === 'yesterday' ? { from: addDays(todayISO(), -1), to: addDays(todayISO(), -1) } : period === 'date' ? { from: date, to: date } : { from, to };
  const inPeriod = data.filter((s) => inRange(s.date, range));
  const t = totals(inPeriod);
  const shown = inPeriod.filter((s) => (pay === 'all' || s.pay === pay) && (!q.trim() || `${s.product} ${s.customer}`.toLowerCase().includes(q.trim().toLowerCase())));

  useEffect(() => {
    listSales().then(setReal).catch((e: Error) => setMsg({ ok: false, text: e.message })).finally(() => setLoading(false));
  }, []);
  const commit = async (next: Sale[], op: () => Promise<void>, ok: string) => {
    try { await op(); setReal(next); setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  const startSample = () => { setSample(true); setDemo(sampleSales()); setPeriod('date'); setDate(SAMPLE_DATE); setQ(''); setPay('all'); };
  const exitSample = () => { setSample(false); setPeriod('today'); setMsg(null); };
  const first = !sample && !loading && real.length === 0;

  return (
    <Page title="Sales Management" intro="Your digital sales book. Record every sale and see your totals automatically.">
      {msg && <Banner ok={msg.ok}>{msg.text}</Banner>}
      {loading && !sample && <p className="bk-empty">Loading your records...</p>}
      {sample && (
        <Banner>
          <b>Sample records, for demonstration only.</b> Abraham's Provision Store, 27 October 2026. Nothing here is saved or counted in your reports.
          <div className="bk-row">
            <button type="button" className="btn outline sm" onClick={startSample}>Reset sample</button>
            <button type="button" className="btn outline sm" onClick={exitSample}>Exit sample</button>
            <button type="button" className="btn primary sm" onClick={() => { exitSample(); setEdit('new'); }}>Start recording real transactions</button>
          </div>
        </Banner>
      )}
      {first && (
        <div className="card bk-first">
          <h2>No sales recorded yet</h2>
          <p className="muted">Add your first sale, or look at an example first.</p>
          <div className="bk-row">
            <button type="button" className="btn primary lg" onClick={() => setEdit('new')}><Plus size={18} /> Add My First Transaction</button>
            <button type="button" className="btn outline lg" onClick={startSample}>Try Sample Data</button>
          </div>
        </div>
      )}
      {!first && (!loading || sample) && (
        <>
          <div className="bk-row">
            <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: 'date', label: 'A date' }, { value: 'range', label: 'Date range' }]} />
          </div>
          {period === 'date' && <Input label="Date" type="date" value={date} onChange={setDate} />}
          {period === 'range' && (
            <div className="grid-2"><Input label="From" type="date" value={from} onChange={setFrom} /><Input label="To" type="date" value={to} onChange={setTo} /></div>
          )}
          <Cards items={[['Total sales', naira(t.total)], ['Transactions', String(t.count)], ['Total quantity sold', String(t.qty)], ...PAYS.map((p) => [`${p} sales`, naira(t.byPay[p])] as [string, string])]} />
          <div className="bk-row">
            {!sample && <button type="button" className="btn primary" onClick={() => setEdit('new')}><Plus size={17} /> Add Transaction</button>}
            <button type="button" className="btn outline" disabled={!shown.length || sample} onClick={() => downloadCsv('sales', [['Date', 'Product', 'Quantity', 'Unit price', 'Total', 'Payment', 'Customer', 'Notes'], ...shown.map((s) => [s.date, s.product, s.qty, kobo2n(s.price), kobo2n(s.total), s.pay, s.customer, s.notes])])}><Download size={16} /> Export CSV</button>
            <button type="button" className="btn outline" disabled={!shown.length || sample} onClick={() => void pagePdf('sales', 'Sales Record', period === 'range' ? `${formatDate(from)} to ${formatDate(to)}` : formatDate(range.from)).catch(() => setMsg({ ok: false, text: 'Could not make the PDF. Please try again.' }))}><Download size={16} /> Export PDF</button>
          </div>
          <div className="grid-2">
            <Input label="Search product or customer" value={q} onChange={setQ} />
            <Select label="Payment method" value={pay} onChange={setPay} options={[{ value: 'all', label: 'All payment methods' }, ...payOpts]} />
          </div>
          <Table
            head={SALE_HEAD}
            rows={saleRows(shown, (s) => <Actions onEdit={sample ? undefined : () => setEdit(s)} onDelete={() => setDel(s)} />)}
            foot={shown.length ? ['TOTAL', '', String(totals(shown).qty), '', naira(totals(shown).total), '', '', ''] : undefined}
            empty={inPeriod.length ? 'No transactions match your search.' : 'No transactions for this period.'}
          />
        </>
      )}
      {edit && (
        <SaleForm
          initial={edit === 'new' ? null : edit}
          onClose={() => setEdit(null)}
          onSave={(s) => { void commit(edit === 'new' ? [...real, s] : real.map((x) => (x.id === s.id ? s : x)), () => putSale(s), 'Transaction saved.'); setEdit(null); }}
        />
      )}
      {del && <Confirm what="transaction" onNo={() => setDel(null)} onYes={() => { if (sample) setDemo(demo.filter((x) => x.id !== del.id)); else void commit(real.filter((x) => x.id !== del.id), () => dropSale(del.id), 'Transaction deleted.'); setDel(null); }} />}
    </Page>
  );
}

/* ---------------------------------------------------------- Reports page */
type Tab = 'daily' | 'weekly' | 'monthly' | 'spending' | 'history' | 'summary';
const TITLES: Record<string, string> = { daily: 'Daily Sales Report', weekly: 'Weekly Sales Report', monthly: 'Monthly Sales Report', spending: 'Business Spending Records', history: 'Transaction History', summary: 'Business Summary' };
/** Builds the PDF from the tables and cards currently on the screen, so it always matches what the person sees. */
function pagePdf(file: string, title: string, subtitle: string) {
  const sections: PdfSection[] = [];
  const cards = [...document.querySelectorAll('.bk-page .bk-card')].map((c) => [c.querySelector('span')?.textContent ?? '', c.querySelector('b')?.textContent ?? '']);
  if (cards.length) sections.push({ head: ['Summary', ''], rows: cards });
  document.querySelectorAll('.bk-page .bk-table').forEach((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((h) => h.textContent ?? '');
    const keep = heads.map((h, i) => (h === 'Actions' ? -1 : i)).filter((i) => i >= 0);
    const pick = (tr: Element) => keep.map((i) => tr.children[i]?.textContent ?? '');
    const foot = t.querySelector('tfoot tr');
    sections.push({ head: keep.map((i) => heads[i]), rows: [...t.querySelectorAll('tbody tr')].map(pick), foot: foot ? pick(foot) : undefined });
  });
  return makePdf(file, title, subtitle, sections);
}
const csvBtn = (onClick: () => void, disabled = false) => (
  <button type="button" className="btn outline sm" onClick={onClick} disabled={disabled}><Download size={15} /> Export CSV</button>
);

function ReportsPage() {
  const [tab, setTab] = useState<Tab>('daily');
  const [sales, setSales] = useState<Sale[]>([]); // read-only here: edits are made in Sales Management
  const [exps, setExps] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState(todayISO());
  const [msg, setMsg] = useState<Msg>(null);
  const [view, setView] = useState<Sale | null>(null);
  const [eEdit, setEEdit] = useState<Expense | 'new' | null>(null);
  const [eDel, setEDel] = useState<Expense | null>(null);
  const [demo, setDemo] = useState(false);
  // filters shared by history / spending / summary
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('all');
  const [cat, setCat] = useState('all');
  const [sumP, setSumP] = useState<'today' | 'week' | 'month' | 'custom'>('month');

  const today = todayISO();
  const sel = (r: Range) => sales.filter((s) => inRange(s.date, r));
  useEffect(() => {
    Promise.all([listSales(), listExpenses()]).then(([a, b]) => { setSales(a); setExps(b); }).catch((e: Error) => setMsg({ ok: false, text: e.message })).finally(() => setLoading(false));
  }, []);
  const commitE = async (next: Expense[], op: () => Promise<void>, ok: string) => {
    try { await op(); setExps(next); setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  let sub = '';
  const exportBtn = (csv: () => void, disabled = false) => (
    <div className="bk-row">
      {csvBtn(csv, disabled)}
      <button type="button" className="btn outline sm" disabled={disabled} onClick={() => void pagePdf(`${tab}-report`, TITLES[tab], sub).catch(() => setMsg({ ok: false, text: 'Could not make the PDF. Please try again.' }))}><Download size={15} /> Export PDF</button>
    </div>
  );
  const go = (step: number, kind: 'day' | 'week' | 'month') => {
    const d = parseISO(anchor) ?? new Date();
    setAnchor(kind === 'month' ? toISO(new Date(d.getFullYear(), d.getMonth() + step, 1)) : addDays(anchor, step * (kind === 'week' ? 7 : 1)));
  };
  const pager = (kind: 'day' | 'week' | 'month', label: string) => (
    <div className="bk-row bk-pager">
      <button type="button" className="btn outline sm" onClick={() => go(-1, kind)}>Previous</button>
      <b>{label}</b>
      <button type="button" className="btn outline sm" onClick={() => go(1, kind)}>Next</button>
      <Input label="Go to date" type="date" value={anchor} onChange={(v) => parseISO(v) && setAnchor(v)} />
    </div>
  );
  const noSales = (what: string) => <p className="bk-empty">No sales recorded {what}. Add sales in Sales Management and they will appear here.</p>;

  let body: ReactNode = null;

  if (tab === 'daily') {
    const list = sel({ from: anchor, to: anchor });
    const t = totals(list);
    const prod = byProduct(list);
    sub = formatDate(anchor);
    body = (
      <>
        {pager('day', formatDate(anchor))}
        {!list.length ? noSales('on this day') : (
          <>
            <Table head={['Report item', 'Result']} empty="" rows={[['Total sales', naira(t.total)], ['Number of transactions', t.count], ['Total quantity sold', t.qty], ['Cash sales recorded', naira(t.byPay.Cash)], ['Bank transfer sales recorded', naira(t.byPay['Bank Transfer'])], ['POS sales recorded', naira(t.byPay.POS)], ['Other sales recorded', naira(t.byPay.Other)]]} />
            <h3>Product breakdown</h3>
            <Table head={['Product', 'Quantity sold', 'Total sales']} empty="" rows={prod.map((p) => [p.product, p.qty, naira(p.total)])} foot={['TOTAL', String(t.qty), naira(t.total)]} />
            {exportBtn(() => downloadCsv(`daily-report-${anchor}`, [['Product', 'Quantity sold', 'Total sales'], ...prod.map((p) => [p.product, p.qty, kobo2n(p.total)]), ['TOTAL', t.qty, kobo2n(t.total)]]))}
          </>
        )}
      </>
    );
  } else if (tab === 'weekly') {
    const r = weekRange(anchor);
    const days = perDay(sel(r), r);
    const t = totals(sel(r));
    sub = `${formatDate(r.from)} to ${formatDate(r.to)}`;
    const hi = t.total ? days.reduce((a, b) => (b.total > a.total ? b : a)) : null;
    const lo = t.total ? days.reduce((a, b) => (b.total < a.total ? b : a)) : null;
    body = (
      <>
        {pager('week', `${formatDate(r.from)} to ${formatDate(r.to)}`)}
        <Cards items={[['Total weekly sales', naira(t.total)], ['Total transactions', String(t.count)], ['Average daily sales', naira(Math.round(t.total / 7))], ['Highest sales day', hi ? dayName(hi.date) : '—'], ['Lowest sales day', lo ? dayName(lo.date) : '—']]} />
        <Bars items={days.map((d) => [dayName(d.date).slice(0, 3), d.total])} />
        <Table head={['Day', 'Total sales']} empty="" rows={days.map((d) => [`${dayName(d.date)} (${formatDate(d.date)})`, naira(d.total)])} foot={['WEEKLY TOTAL', naira(t.total)]} />
        {exportBtn(() => downloadCsv(`weekly-report-${r.from}`, [['Day', 'Date', 'Total sales'], ...days.map((d) => [dayName(d.date), d.date, kobo2n(d.total)]), ['WEEKLY TOTAL', '', kobo2n(t.total)]]))}
      </>
    );
  } else if (tab === 'monthly') {
    const r = monthRange(anchor);
    const n = daysIn(r);
    const days = perDay(sel(r), r);
    const t = totals(sel(r));
    const weeks = Array.from({ length: Math.ceil(n / 7) }, (_, i) => ({ label: i < 4 ? `Week ${i + 1}` : 'Week 5 and remaining days', total: days.slice(i * 7, i * 7 + 7).reduce((a, d) => a + d.total, 0) }));
    sub = (parseISO(r.from) ?? new Date()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const hi = t.total ? weeks.reduce((a, b) => (b.total > a.total ? b : a)) : null;
    const lo = t.total ? weeks.reduce((a, b) => (b.total < a.total ? b : a)) : null;
    body = (
      <>
        {pager('month', (parseISO(r.from) ?? new Date()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}
        <Cards items={[['Total monthly sales', naira(t.total)], ['Total transactions', String(t.count)], [`Average daily sales (${n} days)`, naira(Math.round(t.total / n))], ['Highest sales week', hi ? hi.label : '—'], ['Lowest sales week', lo ? lo.label : '—']]} />
        <Bars items={days.map((d) => [String(Number(d.date.slice(8))), d.total])} />
        <Table head={['Period', 'Total sales']} empty="" rows={weeks.map((w) => [w.label, naira(w.total)])} foot={['MONTHLY TOTAL', naira(t.total)]} />
        {exportBtn(() => downloadCsv(`monthly-report-${r.from.slice(0, 7)}`, [['Period', 'Total sales'], ...weeks.map((w) => [w.label, kobo2n(w.total)]), ['MONTHLY TOTAL', kobo2n(t.total)]]))}
      </>
    );
  } else if (tab === 'history') {
    const list = sales
      .filter((s) => (!from || s.date >= from) && (!to || s.date <= to) && (pay === 'all' || s.pay === pay) && (!q.trim() || s.product.toLowerCase().includes(q.trim().toLowerCase())))
      .sort((a, b) => b.date.localeCompare(a.date));
    body = (
      <>
        <div className="grid-2"><Input label="From" type="date" value={from} onChange={setFrom} /><Input label="To" type="date" value={to} onChange={setTo} /></div>
        <div className="grid-2">
          <Input label="Search product or service" value={q} onChange={setQ} />
          <Select label="Payment method" value={pay} onChange={setPay} options={[{ value: 'all', label: 'All payment methods' }, ...payOpts]} />
        </div>
        <Table head={SALE_HEAD} empty={sales.length ? 'No transactions match these filters.' : 'No sales recorded yet.'} rows={saleRows(list, (s) => <button type="button" className="btn outline sm" onClick={() => setView(s)}>View</button>)} foot={list.length ? ['TOTAL', '', String(totals(list).qty), '', naira(totals(list).total), '', '', ''] : undefined} />
        {exportBtn(() => downloadCsv('transaction-history', [['Date', 'Product', 'Quantity', 'Unit price', 'Total', 'Payment', 'Customer', 'Notes'], ...list.map((s) => [s.date, s.product, s.qty, kobo2n(s.price), kobo2n(s.total), s.pay, s.customer, s.notes])]), !list.length)}
      </>
    );
  } else if (tab === 'spending') {
    const all = demo ? sampleExpenses() : exps;
    const list = all
      .filter((e) => (!from || e.date >= from) && (!to || e.date <= to) && (cat === 'all' || e.category === cat) && (!q.trim() || `${e.name} ${e.notes}`.toLowerCase().includes(q.trim().toLowerCase())))
      .sort((a, b) => b.date.localeCompare(a.date));
    body = (
      <>
        {demo && (
          <Banner>
            <b>Sample spending, for demonstration only.</b> These are not saved and not counted anywhere.
            <div className="bk-row"><button type="button" className="btn outline sm" onClick={() => setDemo(false)}>Back to my real spending</button></div>
          </Banner>
        )}
        <Cards items={[['Spent today', naira(sumExpenses(all.filter((e) => inRange(e.date, { from: demo ? '2026-10-27' : today, to: demo ? '2026-10-27' : today }))))], ['Spent this week', naira(sumExpenses(all.filter((e) => inRange(e.date, weekRange(demo ? '2026-10-27' : today)))))], ['Spent this month', naira(sumExpenses(all.filter((e) => inRange(e.date, monthRange(demo ? '2026-10-27' : today)))))], [from || to ? 'Spent in chosen dates' : 'Total spent', naira(sumExpenses(list))]]} />
        <div className="bk-row">
          {!demo && <button type="button" className="btn primary" onClick={() => setEEdit('new')}><Plus size={17} /> Add Expense</button>}
          {!demo && !exps.length && <button type="button" className="btn outline" onClick={() => setDemo(true)}>See an example</button>}
          {exportBtn(() => downloadCsv('business-spending', [['Date', 'Expense', 'Category', 'Amount', 'Payment', 'Notes'], ...list.map((e) => [e.date, e.name, e.category, kobo2n(e.amount), e.pay, e.notes])]), !list.length || demo)}
        </div>
        <div className="grid-2"><Input label="From" type="date" value={from} onChange={setFrom} /><Input label="To" type="date" value={to} onChange={setTo} /></div>
        <div className="grid-2">
          <Input label="Search expenses" value={q} onChange={setQ} />
          <Select label="Category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All categories' }, ...CATS.map((c) => ({ value: c, label: c }))]} />
        </div>
        <Table head={['Date', 'Expense', 'Category', 'Amount', 'Payment', 'Actions']} empty={all.length ? 'No expenses match these filters.' : 'No business spending recorded yet. Tap Add Expense to start.'} rows={list.map((e) => [formatDate(e.date), e.name, e.category, naira(e.amount), e.pay, demo ? '—' : <Actions onEdit={() => setEEdit(e)} onDelete={() => setEDel(e)} />])} foot={list.length ? ['TOTAL SPENT', '', '', naira(sumExpenses(list)), '', ''] : undefined} />
      </>
    );
  } else {
    const r: Range = sumP === 'custom' ? { from: from || today, to: to || today } : periodRange(sumP, today);
    sub = `${formatDate(r.from)} to ${formatDate(r.to)}`;
    const sTot = totals(sel(r)).total;
    const eTot = sumExpenses(exps.filter((e) => inRange(e.date, r)));
    const diff = sTot - eTot;
    body = (
      <>
        <Segmented label="Period" value={sumP} onChange={setSumP} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }, { value: 'custom', label: 'Custom' }]} />
        {sumP === 'custom' && <div className="grid-2"><Input label="From" type="date" value={from} onChange={setFrom} /><Input label="To" type="date" value={to} onChange={setTo} /></div>}
        <p className="muted">{formatDate(r.from)} to {formatDate(r.to)}</p>
        <Table head={['Financial summary', 'Amount']} empty="" rows={[['Total sales', naira(sTot)], ['Total recorded expenses', naira(eTot)], ['Difference between sales and recorded expenses', `${diff < 0 ? '-' : ''}${naira(Math.abs(diff))}`]]} />
        <p className="hint">This is not your profit. A customer may still owe you for some sales, and stock you bought may not be sold yet. KoboDox counts every recorded sale as a sale, whether or not the money has been collected.</p>
        {exportBtn(() => downloadCsv(`business-summary-${r.from}-to-${r.to}`, [['Period start', 'Period end', 'Total sales', 'Total recorded expenses', 'Difference'], [r.from, r.to, kobo2n(sTot), kobo2n(eTot), kobo2n(diff)]]))}
      </>
    );
  }

  return (
    <Page title="Business Reports" intro="Reports are made automatically from the sales and spending you have recorded on this device.">
      {msg && <Banner ok={msg.ok}>{msg.text}</Banner>}
      <div className="bk-tabs">
        <Segmented label="Report" value={tab} onChange={(v) => { setTab(v); setFrom(''); setTo(''); setQ(''); setPay('all'); setCat('all'); setMsg(null); }} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'spending', label: 'Record Business Spending' }, { value: 'history', label: 'Transaction History' }, { value: 'summary', label: 'Business Summary' }]} />
      </div>
      {loading ? <p className="bk-empty">Loading your records...</p> : body}
      {view && (
        <Modal open onClose={() => setView(null)} title="Transaction details">
          <Table head={['Item', 'Detail']} empty="" rows={[['Date', formatDate(view.date)], ['Product / service', view.product], ['Quantity', view.qty], ['Unit price', naira(view.price)], ['Total amount', naira(view.total)], ['Payment', view.pay], ['Customer', view.customer || '—'], ['Notes', view.notes || '—']]} />
        </Modal>
      )}
      {eEdit && <ExpenseForm initial={eEdit === 'new' ? null : eEdit} onClose={() => setEEdit(null)} onSave={(x) => { void commitE(eEdit === 'new' ? [...exps, x] : exps.map((e) => (e.id === x.id ? x : e)), () => putExpense(x), 'Expense saved.'); setEEdit(null); }} />}
      {eDel && <Confirm what="expense" onNo={() => setEDel(null)} onYes={() => { void commitE(exps.filter((e) => e.id !== eDel.id), () => dropExpense(eDel.id), 'Expense deleted.'); setEDel(null); }} />}
    </Page>
  );
}

/** With Supabase on, people must sign in first. Without it, the pages open straight away. */
function Gate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState(sessionEmail());
  const [f, setF] = useState({ email: '', pw: '' });
  const [up, setUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [local, setLocal] = useState(localCount());
  const [k, setK] = useState(0);
  if (!cloudOn) return <>{children}</>;
  const submit = async () => {
    if (!f.email.includes('@') || f.pw.length < 6) return setMsg({ ok: false, text: 'Enter your email and a password of at least 6 characters.' });
    setBusy(true);
    try {
      if (up && !(await signUp(f.email.trim(), f.pw))) setMsg({ ok: true, text: 'Account created. Check your email and tap the confirmation link, then sign in here.' });
      else { if (!up) await signIn(f.email.trim(), f.pw); setEmail(sessionEmail()); setMsg(null); }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };
  if (!email) {
    return (
      <Page title={up ? 'Create your account' : 'Sign in'} intro="Your sales and spending are saved in your own account, so they are safe on any phone or computer.">
        {msg && <Banner ok={msg.ok}>{msg.text}</Banner>}
        <Input label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
        <Input label="Password" type="password" value={f.pw} onChange={(v) => setF({ ...f, pw: v })} hint="At least 6 characters" />
        <button type="button" className="btn primary lg full" disabled={busy} onClick={() => void submit()}>{busy ? 'Please wait...' : up ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="btn ghost full" onClick={() => { setUp(!up); setMsg(null); }}>{up ? 'I already have an account' : 'New here? Create an account'}</button>
      </Page>
    );
  }
  return (
    <>
      <div className="container bk-account">
        <span>Signed in as <b>{email}</b></span>
        <button type="button" className="btn outline sm" onClick={() => { signOut(); setEmail(null); }}>Sign out</button>
      </div>
      {local > 0 && (
        <div className="container">
          <Banner>
            You have {local} record{local === 1 ? '' : 's'} saved only on this device.
            <div className="bk-row">
              <button type="button" className="btn primary sm" onClick={() => void moveLocalToCloud().then(() => { setLocal(0); setK(k + 1); }).catch((e: Error) => setMsg({ ok: false, text: e.message }))}>Move them to my account</button>
            </div>
          </Banner>
        </div>
      )}
      <div key={k}>{children}</div>
    </>
  );
}
export const Sales = () => <Gate><SalesPage /></Gate>;
export const Reports = () => <Gate><ReportsPage /></Gate>;
