import type { DocData } from '../types';

/** "Invoice INV-2026-0001" style name used for the PDF file and the print title. */
export function fileBase(d: DocData): string {
  const kind = d.kind === 'invoice' ? 'Invoice' : d.kind === 'receipt' ? 'Receipt' : d.kind === 'quotation' ? 'Quotation' : 'Waybill';
  const num = d.number.trim() || 'draft';
  return `${kind} ${num}`.replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-');
}

export function fileName(d: DocData): string {
  return `${fileBase(d)}.pdf`;
}

/** Starts a normal browser download for a Blob. Works fully offline. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
