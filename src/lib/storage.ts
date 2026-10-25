import type { DocData, DocKind, ExtraCharge, LineItem } from '../types';
import { DEFAULT_CURRENCY } from './currency';
import { addDays, todayISO } from './dates';

/**
 * Everything here stays on the person's own device (localStorage). Nothing is ever sent anywhere.
 * Every access is wrapped in try/catch because storage can be blocked (private mode, full disk, etc.).
 */

const DRAFT_KEY = (k: DocKind) => `snapbill:draft:v1:${k}`;
const COUNTER_KEY = 'snapbill:counter:v1';

export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newItem(partial: Partial<LineItem> = {}): LineItem {
  return { id: uid(), description: '', details: '', qty: '1', price: '', unit: '', weight: '', ...partial };
}

export function newCharge(partial: Partial<ExtraCharge> = {}): ExtraCharge {
  return { id: uid(), label: '', amount: '', ...partial };
}

type Counters = Record<DocKind, number>;

function readCounters(): Counters {
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Counters>;
      return {
        invoice: Number(p.invoice) || 0,
        receipt: Number(p.receipt) || 0,
        quotation: Number(p.quotation) || 0,
        waybill: Number(p.waybill) || 0,
      };
    }
  } catch {
    /* ignore */
  }
  return { invoice: 0, receipt: 0, quotation: 0, waybill: 0 };
}

function writeCounters(c: Counters): void {
  try {
    localStorage.setItem(COUNTER_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function formatNumber(kind: DocKind, n: number): string {
  const prefix = kind === 'invoice' ? 'INV' : kind === 'receipt' ? 'RCT' : kind === 'quotation' ? 'QTN' : 'WB';
  return `${prefix}-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

/** The next automatic number, e.g. INV-2026-0001. Does not consume it. */
export function peekNumber(kind: DocKind): string {
  return formatNumber(kind, readCounters()[kind] + 1);
}

/** Call after a successful export: if the number in use is the automatic one, move the counter on. */
export function commitNumber(kind: DocKind, used: string): void {
  const c = readCounters();
  if (used.trim() === formatNumber(kind, c[kind] + 1)) {
    c[kind] += 1;
    writeCounters(c);
  }
}

export const WAYBILL_TERMS =
  "Goods are carried at the owner's risk unless insured. The receiver must check the goods on delivery and note any damage or shortage on this waybill before signing.";

export const QUOTATION_TERMS =
  'This quotation is valid until the date shown above. Prices may change after that date. Work begins once the quotation is accepted and any agreed deposit is received.';

export function createDefaultDoc(kind: DocKind): DocData {
  const today = todayISO();
  return {
    kind,
    template: 'classic',
    businessName: '',
    logo: null,
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    number: peekNumber(kind),
    issueDate: today,
    dueDate: addDays(today, kind === 'quotation' ? 30 : 14),
    currency: DEFAULT_CURRENCY,
    items: [newItem(kind === 'waybill' ? { unit: 'pcs' } : {})],
    discountMode: 'percent',
    discountValue: '',
    taxLabel: 'VAT',
    taxRate: '',
    charges: [],
    status: 'unpaid',
    amountPaid: '',
    paymentMethod: 'Bank transfer',
    reference: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    paymentInstructions: '',
    notes: '',
    terms: kind === 'waybill' ? WAYBILL_TERMS : kind === 'quotation' ? QUOTATION_TERMS : '',
    origin: '',
    destination: '',
    transportMode: 'Road',
    vehicleNo: '',
    driverName: '',
    driverPhone: '',
    expectedDate: '',
    shipmentStatus: 'pending',
    freightCharge: '',
    freightPayer: 'sender',
    declaredValue: '',
  };
}

export function loadDraft(kind: DocKind): DocData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(kind));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DocData>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return null;
    // Merge over defaults so older drafts never miss newly added fields.
    const merged: DocData = { ...createDefaultDoc(kind), ...parsed, kind };
    merged.items = merged.items.length ? merged.items.map((it) => ({ ...newItem(), ...it })) : [newItem()];
    return merged;
  } catch {
    return null;
  }
}

export function saveDraft(d: DocData): void {
  try {
    localStorage.setItem(DRAFT_KEY(d.kind), JSON.stringify(d));
  } catch {
    /* storage full or blocked: the draft just won't be remembered */
  }
}

export function clearDraft(kind: DocKind): void {
  try {
    localStorage.removeItem(DRAFT_KEY(kind));
  } catch {
    /* ignore */
  }
}

/** A brand-new document that re-uses the business details from another kind's saved draft. */
export function createSeededDoc(kind: DocKind): DocData {
  const base = createDefaultDoc(kind);
  const kinds: DocKind[] = ['invoice', 'receipt', 'quotation', 'waybill'];
  let other: DocData | null = null;
  for (const k of kinds) {
    if (k === kind) continue;
    other = loadDraft(k);
    if (other) break;
  }
  if (!other) return base;
  return {
    ...base,
    template: other.template,
    businessName: other.businessName,
    logo: other.logo,
    businessPhone: other.businessPhone,
    businessEmail: other.businessEmail,
    businessAddress: other.businessAddress,
    currency: other.currency,
    taxLabel: other.taxLabel,
    bankName: other.bankName,
    accountName: other.accountName,
    accountNumber: other.accountNumber,
  };
}
