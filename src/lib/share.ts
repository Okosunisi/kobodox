import type { DocData, Totals } from '../types';
import { formatMoney } from './currency';
import { formatDate } from './dates';
import { KIND_COPY } from './kinds';

/** Turns a phone number into the digits-only international format WhatsApp expects. */
export function whatsappNumber(raw: string, currency: string): string {
  let digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  const hadPlus = digits.startsWith('+');
  digits = digits.replace(/\+/g, '');
  if (hadPlus) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  // Local Nigerian format: 0803... -> 234803...
  if (digits.startsWith('0') && currency === 'NGN') return `234${digits.slice(1)}`;
  return digits;
}

export function defaultMessage(d: DocData, t: Totals): string {
  const isInvoice = d.kind === 'invoice';
  const who = d.customerName.trim();
  const biz = d.businessName.trim();
  const lines: string[] = [];
  lines.push(who ? `Hello ${who},` : 'Hello,');
  lines.push('');
  if (d.kind === 'waybill') {
    lines.push(`Here is waybill ${d.number} from ${biz || 'us'}.`);
    if (d.origin.trim() || d.destination.trim()) lines.push(`Route: ${d.origin.trim() || '—'} to ${d.destination.trim() || '—'}`);
    if (d.driverName.trim()) lines.push(`Driver: ${d.driverName.trim()}${d.driverPhone.trim() ? ` (${d.driverPhone.trim()})` : ''}`);
    if (d.vehicleNo.trim()) lines.push(`Vehicle: ${d.vehicleNo.trim().toUpperCase()}`);
    if (d.expectedDate) lines.push(`Expected delivery: ${formatDate(d.expectedDate)}`);
  } else if (d.kind === 'quotation') {
    lines.push(`Here is quotation ${d.number} from ${biz || 'us'}.`);
    lines.push(`Total: ${formatMoney(t.total, d.currency)}`);
    if (d.dueDate) lines.push(`Valid until: ${formatDate(d.dueDate)}`);
    lines.push('Please let us know if you would like to go ahead.');
  } else if (isInvoice) {
    const amount = d.status === 'partial' ? t.balance : t.total;
    const label = d.status === 'paid' ? 'Total' : d.status === 'partial' ? 'Balance due' : 'Amount due';
    lines.push(`Here is invoice ${d.number} from ${biz || 'us'}.`);
    lines.push(`${label}: ${formatMoney(amount, d.currency)}`);
    if (d.status !== 'paid' && d.dueDate) lines.push(`Due date: ${formatDate(d.dueDate)}`);
  } else if (d.kind === 'sales-order' || d.kind === 'purchase-order') {
    lines.push(`Here is ${KIND_COPY[d.kind].noun} ${d.number} from ${biz || 'us'}.`);
    lines.push(`Order total: ${formatMoney(t.total, d.currency)}`);
    if (d.dueDate) lines.push(`Delivery date: ${formatDate(d.dueDate)}`);
    lines.push(d.kind === 'sales-order' ? 'Please confirm the order.' : 'Please confirm that you received this order.');
  } else if (d.kind === 'payment-voucher') {
    lines.push(`Here is payment voucher ${d.number} from ${biz || 'us'}.`);
    lines.push(`Amount: ${formatMoney(t.total, d.currency)}`);
    if (d.paymentMethod.trim()) lines.push(`Method: ${d.paymentMethod.trim()}`);
  } else if (d.kind === 'credit-note' || d.kind === 'debit-note') {
    const credit = d.kind === 'credit-note';
    lines.push(`Here is ${credit ? 'credit' : 'debit'} note ${d.number} from ${biz || 'us'}.`);
    lines.push(`${credit ? 'Credit' : 'Amount due'}: ${formatMoney(t.total, d.currency)}`);
    if (d.reference.trim()) lines.push(`Related invoice: ${d.reference.trim()}`);
    if (!credit && d.dueDate) lines.push(`Due date: ${formatDate(d.dueDate)}`);
  } else {
    lines.push(`Here is your receipt ${d.number} from ${biz || 'us'}.`);
    lines.push(`Amount received: ${formatMoney(t.total, d.currency)}`);
    lines.push('Thank you for your payment.');
  }
  lines.push('');
  lines.push('The PDF is attached.');
  return lines.join('\n');
}

export function whatsappLink(phoneDigits: string, message: string): string {
  const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

/** True when the browser can share a PDF file through the system share sheet (most Android phones). */
export function canShareFiles(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      return false;
    }
    const probe = new File([new Blob(['x'], { type: 'application/pdf' })], 'probe.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}
