import type { DocData, StatusKey, Totals } from '../types';
import { formatWeight, parseNum, statusLabel, toCents } from './calc';
import { formatMoney, formatQty } from './currency';
import { formatDate } from './dates';

export interface PayRow {
  label: string;
  value: string;
  strong?: boolean;
}

export interface DocModel {
  title: 'INVOICE' | 'RECEIPT' | 'QUOTATION' | 'WAYBILL';
  /** Label/value pairs shown in the header. The first one is always the document number. */
  fields: Array<[string, string]>;
  /** null = this kind of document has no status badge (quotations). */
  statusKey: StatusKey | null;
  statusText: string;
  fromLabel: string;
  toLabel: string;
  /** Placeholder shown while the second party's name is still empty. */
  toPlaceholder: string;
  /** Headings of the three right-hand table columns (after "Description"). */
  columns: [string, string, string];
  /** Waybills: the origin -> destination strip. */
  route: null | { from: string; to: string };
  pay: null | { title: string; rows: PayRow[]; note: string };
  notesLabel: string;
  notes: string;
  terms: string;
  /** Waybills: signature boxes drawn at the bottom. */
  signatures: string[];
  footer: string;
}

const dash = (s: string) => (s.trim() ? s : '—');

const FREIGHT_PAYER_TEXT = {
  sender: 'Paid by sender',
  receiver: 'Payable by receiver',
  prepaid: 'Prepaid',
} as const;

export const SHIPMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
] as const;

export const FREIGHT_PAYER_OPTIONS = [
  { value: 'sender', label: FREIGHT_PAYER_TEXT.sender },
  { value: 'receiver', label: FREIGHT_PAYER_TEXT.receiver },
  { value: 'prepaid', label: FREIGHT_PAYER_TEXT.prepaid },
] as const;

/**
 * Decides WHAT goes on the document. The on-screen preview, the printout and the PDF
 * all read from this one function so they always agree with each other.
 */
export function buildModel(d: DocData): DocModel {
  const issue = dash(formatDate(d.issueDate));

  if (d.kind === 'quotation') {
    const rows: PayRow[] = [];
    if (d.bankName.trim()) rows.push({ label: 'Bank', value: d.bankName.trim() });
    if (d.accountName.trim()) rows.push({ label: 'Account name', value: d.accountName.trim() });
    if (d.accountNumber.trim()) rows.push({ label: 'Account no.', value: d.accountNumber.trim(), strong: true });
    const note = d.paymentInstructions.trim();
    return {
      title: 'QUOTATION',
      fields: [
        ['Quotation no.', dash(d.number)],
        ['Issue date', issue],
        ['Valid until', dash(formatDate(d.dueDate))],
      ],
      statusKey: null,
      statusText: '',
      fromLabel: 'From',
      toLabel: 'Prepared for',
      toPlaceholder: 'Customer name',
      columns: ['Qty', 'Unit price', 'Amount'],
      route: null,
      pay: rows.length || note ? { title: 'Payment details', rows, note } : null,
      notesLabel: 'Notes',
      notes: d.notes.trim(),
      terms: d.terms.trim(),
      signatures: ['Prepared by', 'Accepted by customer'],
      footer: 'We look forward to working with you.',
    };
  }

  if (d.kind === 'waybill') {
    const rows: PayRow[] = [{ label: 'Transport', value: dash(d.transportMode) }];
    if (d.vehicleNo.trim()) rows.push({ label: 'Vehicle no.', value: d.vehicleNo.trim().toUpperCase(), strong: true });
    if (d.driverName.trim()) rows.push({ label: 'Driver', value: d.driverName.trim() });
    if (d.driverPhone.trim()) rows.push({ label: 'Driver phone', value: d.driverPhone.trim() });
    rows.push({ label: 'Freight', value: FREIGHT_PAYER_TEXT[d.freightPayer] });

    return {
      title: 'WAYBILL',
      fields: [
        ['Waybill no.', dash(d.number)],
        ['Dispatch date', issue],
        ['Expected delivery', dash(formatDate(d.expectedDate))],
      ],
      statusKey: d.shipmentStatus,
      statusText: statusLabel(d),
      fromLabel: 'Sender',
      toLabel: 'Receiver',
      toPlaceholder: 'Receiver name',
      columns: ['Qty', 'Unit', 'Weight (kg)'],
      route: { from: dash(d.origin), to: dash(d.destination) },
      pay: { title: 'Delivery details', rows, note: '' },
      notesLabel: 'Special instructions',
      notes: d.notes.trim(),
      terms: d.terms.trim(),
      signatures: ['Sender', 'Driver', 'Receiver'],
      footer: 'Thank you for choosing our delivery service.',
    };
  }

  const isInvoice = d.kind === 'invoice';

  const fields: Array<[string, string]> = isInvoice
    ? [
        ['Invoice no.', dash(d.number)],
        ['Issue date', issue],
        ['Due date', dash(formatDate(d.dueDate))],
      ]
    : [
        ['Receipt no.', dash(d.number)],
        ['Date', issue],
      ];

  let pay: DocModel['pay'] = null;
  if (isInvoice) {
    const rows: PayRow[] = [];
    if (d.bankName.trim()) rows.push({ label: 'Bank', value: d.bankName.trim() });
    if (d.accountName.trim()) rows.push({ label: 'Account name', value: d.accountName.trim() });
    if (d.accountNumber.trim()) rows.push({ label: 'Account no.', value: d.accountNumber.trim(), strong: true });
    const note = d.paymentInstructions.trim();
    if (rows.length || note) pay = { title: 'Payment details', rows, note };
  } else {
    const rows: PayRow[] = [{ label: 'Method', value: dash(d.paymentMethod) }];
    if (d.reference.trim()) rows.push({ label: 'Reference', value: d.reference.trim() });
    rows.push({ label: 'Date paid', value: issue });
    pay = { title: 'Payment received', rows, note: '' };
  }

  return {
    title: isInvoice ? 'INVOICE' : 'RECEIPT',
    fields,
    statusKey: isInvoice ? d.status : 'paid',
    statusText: statusLabel(d),
    fromLabel: 'From',
    toLabel: isInvoice ? 'Bill to' : 'Received from',
    toPlaceholder: 'Customer name',
    columns: ['Qty', 'Unit price', 'Amount'],
    route: null,
    pay,
    notesLabel: 'Notes',
    notes: d.notes.trim(),
    terms: d.terms.trim(),
    signatures: [],
    footer: isInvoice ? 'Thank you for your business.' : 'Thank you for your payment.',
  };
}

/** The three right-hand cells of an item row (matches `DocModel.columns`). */
export function itemCells(d: DocData, t: Totals, i: number): [string, string, string] {
  const it = d.items[i];
  if (d.kind === 'waybill') {
    const w = parseNum(it.weight);
    return [formatQty(it.qty), it.unit.trim() || '—', w > 0 ? formatWeight(w) : '—'];
  }
  return [formatQty(it.qty), formatMoney(toCents(it.price), d.currency), formatMoney(t.lines[i] ?? 0, d.currency)];
}
