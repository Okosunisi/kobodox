import { addDays, parseISO, toISO, todayISO } from './dates';
import { formatMoney } from './currency';
import { saveBlob } from './files';
import { cloudOn, rest } from './cloud';
import { loadDraft } from './storage';

/** Sales and spending records. Kept in this browser for now (see load/save): one place to swap for Supabase later. */
export const PAYS = ['Cash', 'Bank Transfer', 'POS', 'Other'] as const;
export type Pay = (typeof PAYS)[number];
export const CATS = ['Transportation', 'Rent', 'Electricity and Utilities', 'Stock Purchases', 'Staff Salaries', 'Repairs and Maintenance', 'Internet and Phone Bills', 'Packaging', 'Other Expenses'];
export interface Sale { id: string; date: string; product: string; qty: number; price: number; total: number; pay: Pay; customer: string; notes: string }
export interface Expense { id: string; date: string; name: string; amount: number; category: string; pay: Pay; notes: string }
export interface Range { from: string; to: string }

const SALES_KEY = 'kobodox:sales:v1';
const EXP_KEY = 'kobodox:expenses:v1';
function load<T>(k: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function save(k: string, v: unknown[]): boolean {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
type Table = 'sales_transactions' | 'business_expenses';
const KEYS: Record<Table, string> = { sales_transactions: SALES_KEY, business_expenses: EXP_KEY };
const FULL = 'Could not save. Your browser storage may be full or blocked.';

/** Every read and write goes through these six functions: the database (Supabase) when it is set up, this device otherwise. */
async function list<T>(t: Table): Promise<T[]> {
  if (!cloudOn) return load<T>(KEYS[t]);
  const all: T[] = [];
  for (let off = 0; ; off += 1000) {
    const page = await rest<T[]>(`${t}?select=*&order=date.desc&limit=1000&offset=${off}`);
    all.push(...page);
    if (page.length < 1000) return all;
  }
}
async function put<T extends { id: string }>(t: Table, item: T) {
  if (cloudOn) return rest(`${t}?on_conflict=id`, { method: 'POST', body: item, upsert: true });
  const l = load<T>(KEYS[t]);
  const i = l.findIndex((x) => x.id === item.id);
  if (i < 0) l.push(item);
  else l[i] = item;
  if (!save(KEYS[t], l)) throw new Error(FULL);
}
async function drop(t: Table, id: string) {
  if (cloudOn) return rest(`${t}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!save(KEYS[t], load<{ id: string }>(KEYS[t]).filter((x) => x.id !== id))) throw new Error(FULL);
}
export const listSales = () => list<Sale>('sales_transactions');
export const putSale = (s: Sale) => put('sales_transactions', s);
export const dropSale = (id: string) => drop('sales_transactions', id);
export const listExpenses = () => list<Expense>('business_expenses');
export const putExpense = (e: Expense) => put('business_expenses', e);
export const dropExpense = (id: string) => drop('business_expenses', id);

/** Records typed before the database was switched on (they only exist in this browser). */
export const localCount = () => load(SALES_KEY).length + load(EXP_KEY).length;
export async function moveLocalToCloud() {
  for (const t of ['sales_transactions', 'business_expenses'] as Table[]) {
    const items = load<{ id: string }>(KEYS[t]);
    for (let i = 0; i < items.length; i += 200) await rest(`${t}?on_conflict=id`, { method: 'POST', body: items.slice(i, i + 200), upsert: true });
    save(KEYS[t], []);
  }
}
export const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const naira = (kobo: number) => formatMoney(kobo, 'NGN').replace(/\.00$/, '');
export const toKobo = (s: string) => Math.round(Number(String(s).replace(/,/g, '')) * 100);
export const isNum = (s: string) => s.trim() !== '' && Number.isFinite(Number(s.replace(/,/g, ''))) && Number(s.replace(/,/g, '')) >= 0;

/** Demonstration records. Built in memory only: never written to storage, never used by reports. */
export const SAMPLE_DATE = '2026-10-27';
export const sampleSales = (): Sale[] =>
  ([['Bread', 10, 1500, 'Cash'], ['Soft Drink', 12, 500, 'Bank Transfer'], ['Rice', 5, 2000, 'POS'], ['Eggs', 3, 4000, 'Bank Transfer'], ['Noodles', 20, 800, 'Cash']] as const).map(([product, qty, p, pay], i) => ({
    id: `sample-${i}`, date: SAMPLE_DATE, product, qty, price: p * 100, total: qty * p * 100, pay, customer: '', notes: '',
  }));
export const sampleExpenses = (): Expense[] =>
  ([['Transport', 'Transportation', 3000], ['Shop electricity', 'Electricity and Utilities', 5000], ['Packaging bags', 'Packaging', 2000], ['Shop cleaning', 'Other Expenses', 1000]] as const).map(([name, category, a], i) => ({
    id: `sample-${i}`, date: SAMPLE_DATE, name, category, amount: a * 100, pay: 'Cash' as Pay, notes: '',
  }));

export const inRange = (d: string, r: Range) => d >= r.from && d <= r.to;
export function weekRange(iso: string): Range {
  const d = parseISO(iso) ?? new Date();
  const from = addDays(toISO(d), -((d.getDay() + 6) % 7)); // weeks run Monday to Sunday
  return { from, to: addDays(from, 6) };
}
export function monthRange(iso: string): Range {
  const d = parseISO(iso) ?? new Date();
  return { from: toISO(new Date(d.getFullYear(), d.getMonth(), 1)), to: toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}
export const daysIn = (r: Range) => Number(r.to.slice(8)) - Number(r.from.slice(8)) + 1;
export function periodRange(p: 'today' | 'week' | 'month', anchor = todayISO()): Range {
  return p === 'today' ? { from: anchor, to: anchor } : p === 'week' ? weekRange(anchor) : monthRange(anchor);
}

export function totals(list: Sale[]) {
  const byPay = Object.fromEntries(PAYS.map((p) => [p, 0])) as Record<Pay, number>;
  let total = 0, qty = 0;
  for (const s of list) { total += s.total; qty += s.qty; byPay[s.pay] = (byPay[s.pay] ?? 0) + s.total; }
  return { total, qty, count: list.length, byPay };
}
export const sumExpenses = (list: Expense[]) => list.reduce((a, e) => a + e.amount, 0);
/** Sales grouped by product, biggest first. */
export function byProduct(list: Sale[]) {
  const m = new Map<string, { qty: number; total: number }>();
  for (const s of list) {
    const k = s.product.trim();
    const v = m.get(k) ?? { qty: 0, total: 0 };
    m.set(k, { qty: v.qty + s.qty, total: v.total + s.total });
  }
  return [...m.entries()].map(([product, v]) => ({ product, ...v })).sort((a, b) => b.total - a.total);
}
/** One total per day between two dates (days with no sales count as zero). */
export function perDay(list: Sale[], r: Range) {
  const out: Array<{ date: string; total: number }> = [];
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) out.push({ date: d, total: list.filter((s) => s.date === d).reduce((a, s) => a + s.total, 0) });
  return out;
}

export function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  saveBlob(new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
}
export const kobo2n = (k: number) => (k / 100).toFixed(2);

export interface PdfSection { head: string[]; rows: string[][]; foot?: string[] }
/** Makes a clean A4 PDF (with the ₦ sign) from tables of text. */
export async function makePdf(file: string, title: string, subtitle: string, sections: PdfSection[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const b64 = async (n: string) => {
    const b = new Uint8Array(await (await fetch(`/fonts/${n}.ttf?v=2`)).arrayBuffer());
    let bin = '';
    for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const [reg, bold] = await Promise.all([b64('SnapSans-Regular'), b64('SnapSans-Bold')]);
  const doc = new jsPDF({ orientation: sections.some((x) => x.head.length > 5) ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('SnapSans-Regular.ttf', reg);
  doc.addFont('SnapSans-Regular.ttf', 'SnapSans', 'normal');
  doc.addFileToVFS('SnapSans-Bold.ttf', bold);
  doc.addFont('SnapSans-Bold.ttf', 'SnapSans', 'bold');
  doc.setFont('SnapSans', 'bold').setFontSize(16).text((loadDraft('invoice')?.businessName ?? '').trim() || 'KoboDox', 14, 16);
  doc.setFontSize(12).text(title, 14, 23);
  doc.setFont('SnapSans', 'normal').setFontSize(9).setTextColor(90).text(`${subtitle ? subtitle + '   |   ' : ''}Created ${formatDateLong()}`, 14, 29).setTextColor(0);
  let y = 35;
  for (const sec of sections) {
    if (y > doc.internal.pageSize.getHeight() - 35) { doc.addPage(); y = 16; }
    autoTable(doc, {
      startY: y, head: [sec.head], body: sec.rows, foot: sec.foot ? [sec.foot] : undefined, margin: { left: 14, right: 14 },
      styles: { font: 'SnapSans', fontSize: 9 }, headStyles: { fillColor: [11, 107, 87], font: 'SnapSans', fontStyle: 'bold' },
      footStyles: { fillColor: [243, 248, 246], textColor: 20, font: 'SnapSans', fontStyle: 'bold' },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  saveBlob(doc.output('blob'), `${file}.pdf`);
}
const formatDateLong = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
