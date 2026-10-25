import type { DocKind } from '../types';

/** Wording that changes from one document type to the next. Used by the editor and the homepage. */
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
}

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
  },
};

export const KIND_ORDER: DocKind[] = ['invoice', 'receipt', 'quotation', 'waybill'];
