import type { DocData, FieldErrors } from '../types';
import { computeTotals, isValidNumber, parseNum, toCents } from './calc';
import { parseISO } from './dates';
import { KIND_COPY } from './kinds';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_QTY = 1_000_000;
const MAX_PRICE = 1_000_000_000_000;

/**
 * Returns a map of field key -> message. An empty object means the document is valid.
 * Keys: businessName, customerName, number, issueDate, dueDate, businessEmail, customerEmail,
 * items, item-<id>-description|qty|price|weight, discountValue, taxRate, charge-<id>-label|amount,
 * amountPaid, origin, destination, expectedDate, freightCharge, declaredValue
 */
export function validate(d: DocData): FieldErrors {
  const e: FieldErrors = {};
  const isInvoice = d.kind === 'invoice';
  const isWaybill = d.kind === 'waybill';
  const copy = KIND_COPY[d.kind];

  if (!d.businessName.trim()) e.businessName = isWaybill ? 'Enter the sender or business name.' : 'Enter your business name.';
  if (!d.customerName.trim()) e.customerName = copy.partyError;
  if (!d.number.trim()) e.number = `Enter ${/^[aeiou]/.test(copy.noun) ? 'an' : 'a'} ${copy.noun} number.`;

  if (!parseISO(d.issueDate)) e.issueDate = 'Pick a valid date.';
  if (copy.due) {
    if (!parseISO(d.dueDate)) e.dueDate = `Pick a valid ${copy.due.what}.`;
    else if (parseISO(d.issueDate) && d.dueDate < d.issueDate) {
      e.dueDate = `The ${copy.due.what} cannot be before the ${copy.dateLabel.toLowerCase()}.`;
    }
  }

  if (d.businessEmail.trim() && !EMAIL_RE.test(d.businessEmail.trim())) e.businessEmail = 'Enter a valid email address.';
  if (d.customerEmail.trim() && !EMAIL_RE.test(d.customerEmail.trim())) e.customerEmail = 'Enter a valid email address.';

  if (d.items.length === 0) e.items = 'Add at least one item.';
  d.items.forEach((it) => {
    if (!it.description.trim()) e[`item-${it.id}-description`] = 'Describe the item.';
    if (!isValidNumber(it.qty) || parseNum(it.qty) <= 0) e[`item-${it.id}-qty`] = 'Enter a quantity above 0.';
    else if (parseNum(it.qty) > MAX_QTY) e[`item-${it.id}-qty`] = 'Quantity is too large.';
    if (isWaybill) {
      if (it.weight.trim() && (!isValidNumber(it.weight) || parseNum(it.weight) > MAX_QTY)) {
        e[`item-${it.id}-weight`] = 'Enter a valid weight in kg.';
      }
    } else if (!isValidNumber(it.price)) e[`item-${it.id}-price`] = 'Enter a price (0 or more).';
    else if (parseNum(it.price) > MAX_PRICE) e[`item-${it.id}-price`] = 'Price is too large.';
  });

  if (isWaybill) {
    if (!d.origin.trim()) e.origin = 'Enter where the goods are coming from.';
    if (!d.destination.trim()) e.destination = 'Enter where the goods are going.';
    if (d.expectedDate.trim()) {
      if (!parseISO(d.expectedDate)) e.expectedDate = 'Pick a valid date.';
      else if (parseISO(d.issueDate) && d.expectedDate < d.issueDate) e.expectedDate = 'Cannot be before the dispatch date.';
    }
    if (d.freightCharge.trim() && !isValidNumber(d.freightCharge)) e.freightCharge = 'Enter a valid amount.';
    if (d.declaredValue.trim() && !isValidNumber(d.declaredValue)) e.declaredValue = 'Enter a valid amount.';
    return e;
  }

  const totals = computeTotals(d);

  if (d.discountValue.trim()) {
    if (!isValidNumber(d.discountValue)) e.discountValue = 'Enter a valid discount.';
    else if (d.discountMode === 'percent' && parseNum(d.discountValue) > 100) e.discountValue = 'Discount cannot exceed 100%.';
    else if (d.discountMode === 'fixed' && toCents(d.discountValue) > totals.subtotal) e.discountValue = 'Discount cannot be more than the subtotal.';
  }

  if (d.taxRate.trim()) {
    if (!isValidNumber(d.taxRate) || parseNum(d.taxRate) > 100) e.taxRate = 'Enter a tax rate between 0 and 100.';
  }

  d.charges.forEach((c) => {
    if (c.amount.trim() && !isValidNumber(c.amount)) e[`charge-${c.id}-amount`] = 'Enter a valid amount.';
    if (isValidNumber(c.amount) && parseNum(c.amount) > 0 && !c.label.trim()) e[`charge-${c.id}-label`] = 'Name this charge.';
  });

  if (!e.items && d.items.length > 0 && !Object.keys(e).some((k) => k.startsWith('item-')) && totals.total <= 0) {
    e.items = 'The total must be greater than zero.';
  }

  if (isInvoice && d.status === 'partial') {
    const paid = toCents(d.amountPaid);
    if (!isValidNumber(d.amountPaid) || paid <= 0) e.amountPaid = 'Enter the amount already paid.';
    else if (totals.total > 0 && paid >= totals.total) e.amountPaid = 'For a partial payment, the amount must be less than the total.';
  }

  return e;
}
