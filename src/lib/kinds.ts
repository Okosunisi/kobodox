import type { DocKind } from '../types';

/** Wording and behaviour that changes from one document type to the next. Used by the editor, the homepage and the maths. */
export interface KindCopy {
  /** lower case: "invoice" */
  noun: string;
  /** capitalised: "Invoice" */
  Noun: string;
  numberLabel: string;
  dateLabel: string;
  businessTitle: string;
  partyTitle: string;
  partyNameLabel: string;
  partyNamePlaceholder: string;
  /** "Billed to" style label used in the confirmation window */
  partyShort: string;
  /** Route / hash name, e.g. #/invoice */
  path: string;
  /** Prefix of the automatic number, e.g. INV */
  prefix: string;
  /** Error shown when the second party's name is empty */
  partyError: string;
  /** The second date on the document (due date, valid until, delivery date). null = none. */
  due: { label: string; what: string; days: number } | null;
  /** Shows the payment method dropdown (receipts, vouchers) */
  payMethod: boolean;
  /** Shows a reference field (payment reference, related invoice number) */
  reference: { label: string; placeholder: string } | null;
  /** Shows a reason field (credit and debit notes) */
  reason: { label: string; placeholder: string } | null;
  /** Which payment card the form shows */
  payBlock: 'invoice' | 'bank' | 'payee' | 'terms' | 'none';
  hasTerms: boolean;
  notesPlaceholder: string;
  /** Label of the big total line for documents without a payment status */
  grandLabel: string;
}

const THANKS_NOTE = 'A thank-you message or anything the customer should know.';

export const KIND_COPY: Record<DocKind, KindCopy> = {
  invoice: {
    noun: 'invoice',
    Noun: 'Invoice',
    numberLabel: 'Invoice number',
    dateLabel: 'Issue date',
    businessTitle: 'Your business',
    partyTitle: 'Customer',
    partyNameLabel: 'Customer name',
    partyNamePlaceholder: 'e.g. Emeka Okafor',
    partyShort: 'Billed to',
    path: 'invoice',
    prefix: 'INV',
    partyError: 'Enter the customer name.',
    due: { label: 'Due date', what: 'due date', days: 14 },
    payMethod: false,
    reference: null,
    reason: null,
    payBlock: 'invoice',
    hasTerms: true,
    notesPlaceholder: THANKS_NOTE,
    grandLabel: 'Total due',
  },
  receipt: {
    noun: 'receipt',
    Noun: 'Receipt',
    numberLabel: 'Receipt number',
    dateLabel: 'Date',
    businessTitle: 'Your business',
    partyTitle: 'Received from',
    partyNameLabel: 'Name of payer',
    partyNamePlaceholder: 'Who paid you?',
    partyShort: 'Received from',
    path: 'receipt',
    prefix: 'RCT',
    partyError: 'Enter who the payment was received from.',
    due: null,
    payMethod: true,
    reference: { label: 'Payment reference (optional)', placeholder: 'e.g. transfer reference or invoice number' },
    reason: null,
    payBlock: 'none',
    hasTerms: false,
    notesPlaceholder: THANKS_NOTE,
    grandLabel: 'Amount received',
  },
  quotation: {
    noun: 'quotation',
    Noun: 'Quotation',
    numberLabel: 'Quotation number',
    dateLabel: 'Issue date',
    businessTitle: 'Your business',
    partyTitle: 'Customer',
    partyNameLabel: 'Customer name',
    partyNamePlaceholder: 'Who is this quote for?',
    partyShort: 'Prepared for',
    path: 'quotation',
    prefix: 'QTN',
    partyError: 'Enter the customer name.',
    due: { label: 'Valid until', what: 'valid-until date', days: 30 },
    payMethod: false,
    reference: null,
    reason: null,
    payBlock: 'bank',
    hasTerms: true,
    notesPlaceholder: THANKS_NOTE,
    grandLabel: 'Quotation total',
  },
  'sales-order': {
    noun: 'sales order',
    Noun: 'Sales order',
    numberLabel: 'Sales order number',
    dateLabel: 'Order date',
    businessTitle: 'Your business',
    partyTitle: 'Customer',
    partyNameLabel: 'Customer name',
    partyNamePlaceholder: 'Who placed the order?',
    partyShort: 'Customer',
    path: 'sales-order',
    prefix: 'SO',
    partyError: 'Enter the customer name.',
    due: { label: 'Delivery date', what: 'delivery date', days: 7 },
    payMethod: false,
    reference: null,
    reason: null,
    payBlock: 'bank',
    hasTerms: true,
    notesPlaceholder: 'Delivery address, packaging, or anything the customer asked for.',
    grandLabel: 'Order total',
  },
  'purchase-order': {
    noun: 'purchase order',
    Noun: 'Purchase order',
    numberLabel: 'Purchase order number',
    dateLabel: 'Order date',
    businessTitle: 'Your business (buyer)',
    partyTitle: 'Supplier',
    partyNameLabel: 'Supplier name',
    partyNamePlaceholder: 'Who are you ordering from?',
    partyShort: 'Supplier',
    path: 'purchase-order',
    prefix: 'PO',
    partyError: 'Enter the supplier name.',
    due: { label: 'Delivery date', what: 'delivery date', days: 7 },
    payMethod: false,
    reference: null,
    reason: null,
    payBlock: 'terms',
    hasTerms: true,
    notesPlaceholder: 'Delivery address, contact person or special instructions.',
    grandLabel: 'Order total',
  },
  'payment-voucher': {
    noun: 'payment voucher',
    Noun: 'Payment voucher',
    numberLabel: 'Voucher number',
    dateLabel: 'Payment date',
    businessTitle: 'Your business (payer)',
    partyTitle: 'Payee',
    partyNameLabel: 'Payee name',
    partyNamePlaceholder: 'Who are you paying?',
    partyShort: 'Paid to',
    path: 'payment-voucher',
    prefix: 'PV',
    partyError: 'Enter who you are paying (the payee).',
    due: null,
    payMethod: true,
    reference: { label: 'Payment reference (optional)', placeholder: 'e.g. cheque number or transfer reference' },
    reason: null,
    payBlock: 'payee',
    hasTerms: false,
    notesPlaceholder: 'What the payment is for, or approval notes.',
    grandLabel: 'Total payable',
  },
  'credit-note': {
    noun: 'credit note',
    Noun: 'Credit note',
    numberLabel: 'Credit note number',
    dateLabel: 'Issue date',
    businessTitle: 'Your business',
    partyTitle: 'Customer',
    partyNameLabel: 'Customer name',
    partyNamePlaceholder: 'Who is receiving the credit?',
    partyShort: 'Credit to',
    path: 'credit-note',
    prefix: 'CN',
    partyError: 'Enter the customer name.',
    due: null,
    payMethod: false,
    reference: { label: 'Related invoice number (optional)', placeholder: 'e.g. INV-2026-0001' },
    reason: { label: 'Reason for the credit (optional)', placeholder: 'e.g. Returned goods or a pricing correction' },
    payBlock: 'none',
    hasTerms: true,
    notesPlaceholder: 'Anything the customer should know about this credit.',
    grandLabel: 'Total credit',
  },
  'debit-note': {
    noun: 'debit note',
    Noun: 'Debit note',
    numberLabel: 'Debit note number',
    dateLabel: 'Issue date',
    businessTitle: 'Your business',
    partyTitle: 'Customer',
    partyNameLabel: 'Customer name',
    partyNamePlaceholder: 'Who is being debited?',
    partyShort: 'Debit to',
    path: 'debit-note',
    prefix: 'DN',
    partyError: 'Enter the customer name.',
    due: { label: 'Due date', what: 'due date', days: 14 },
    payMethod: false,
    reference: { label: 'Related invoice number (optional)', placeholder: 'e.g. INV-2026-0001' },
    reason: { label: 'Reason for the debit (optional)', placeholder: 'e.g. Extra charges or under-charged items' },
    payBlock: 'bank',
    hasTerms: true,
    notesPlaceholder: 'Anything the customer should know about this debit.',
    grandLabel: 'Total debit',
  },
  waybill: {
    noun: 'waybill',
    Noun: 'Waybill',
    numberLabel: 'Waybill number',
    dateLabel: 'Dispatch date',
    businessTitle: 'Sender (your business)',
    partyTitle: 'Receiver',
    partyNameLabel: 'Receiver name',
    partyNamePlaceholder: 'Who will receive the goods?',
    partyShort: 'Receiver',
    path: 'waybill',
    prefix: 'WB',
    partyError: 'Enter the receiver name.',
    due: null,
    payMethod: false,
    reference: null,
    reason: null,
    payBlock: 'none',
    hasTerms: true,
    notesPlaceholder: 'e.g. Call the receiver before arrival. Handle with care.',
    grandLabel: 'Freight charge',
  },
};

export const KIND_ORDER: DocKind[] = [
  'invoice',
  'receipt',
  'quotation',
  'sales-order',
  'purchase-order',
  'payment-voucher',
  'credit-note',
  'debit-note',
  'waybill',
];
