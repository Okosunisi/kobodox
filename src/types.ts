export type DocKind = 'invoice' | 'receipt' | 'quotation' | 'waybill';
export type TemplateId = 'classic' | 'minimal' | 'bold';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type AdjustMode = 'percent' | 'fixed';
export type ShipmentStatus = 'pending' | 'in-transit' | 'delivered';
export type FreightPayer = 'sender' | 'receiver' | 'prepaid';
/** Anything the status badge on a document can show. */
export type StatusKey = PaymentStatus | ShipmentStatus;

export interface Logo {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
}

export interface LineItem {
  id: string;
  description: string;
  details: string;
  qty: string;
  price: string;
  /** Waybills only: unit of the goods (pcs, bags, cartons...) */
  unit: string;
  /** Waybills only: total weight of this line in kg */
  weight: string;
}

export interface ExtraCharge {
  id: string;
  label: string;
  amount: string;
}

export interface DocData {
  kind: DocKind;
  template: TemplateId;

  businessName: string;
  logo: Logo | null;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;

  number: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (invoice due date, or quotation "valid until" date)
  currency: string; // ISO code, e.g. NGN

  items: LineItem[];
  discountMode: AdjustMode;
  discountValue: string;
  taxLabel: string;
  taxRate: string;
  charges: ExtraCharge[];

  status: PaymentStatus;
  amountPaid: string;

  paymentMethod: string; // receipts
  reference: string; // receipts

  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentInstructions: string;

  notes: string;
  terms: string;

  // ---- waybill only ----
  origin: string;
  destination: string;
  transportMode: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  expectedDate: string; // YYYY-MM-DD, optional
  shipmentStatus: ShipmentStatus;
  freightCharge: string;
  freightPayer: FreightPayer;
  declaredValue: string;
}

export interface Totals {
  lines: number[]; // cents per line item
  subtotal: number;
  discount: number;
  taxable: number;
  taxRate: number;
  tax: number;
  charges: number[]; // cents per extra charge
  chargesTotal: number;
  total: number;
  paid: number;
  balance: number;
}

export interface SummaryRow {
  kind: 'row' | 'grand' | 'balance';
  label: string;
  amount: number; // cents (always positive; `negative` controls the sign shown)
  negative?: boolean;
  /** When set, this text is shown instead of the money amount (used by waybills). */
  text?: string;
}

export type FieldErrors = Record<string, string>;
