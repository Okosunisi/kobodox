import type { DocData, DocKind, PaymentStatus, TemplateId } from '../types';
import { addDays, todayISO } from './dates';

/** Realistic demo content used on the homepage and by the "Fill with sample data" button. */
export function sampleDoc(kind: DocKind = 'invoice', template: TemplateId = 'classic', status: PaymentStatus = 'unpaid'): DocData {
  const today = todayISO();
  const isInvoice = kind === 'invoice';
  return {
    kind,
    template,
    businessName: 'Adaeze Interiors Ltd',
    logo: null,
    businessPhone: '+234 803 555 0142',
    businessEmail: 'billing@adaezeinteriors.ng',
    businessAddress: '14 Ogui Road, Independence Layout\nEnugu, Nigeria',

    customerName: 'Emeka Okafor Properties',
    customerPhone: '+234 809 555 0188',
    customerEmail: 'accounts@okaforproperties.ng',
    customerAddress: '27 Admiralty Way, Lekki Phase 1\nLagos, Nigeria',

    number: kind === 'waybill' ? 'WB-2026-0031' : kind === 'quotation' ? 'QTN-2026-0005' : isInvoice ? 'INV-2026-0012' : 'RCT-2026-0007',
    issueDate: today,
    dueDate: addDays(today, kind === 'quotation' ? 30 : 14),
    currency: 'NGN',

    items: [
      ...(kind === 'waybill'
        ? [
            { id: 's1', description: 'Custom 3-seater sofa', details: 'Wrapped and crated, handle with care', qty: '2', price: '', unit: 'crates', weight: '84' },
            { id: 's2', description: 'Curtains and rails', details: '', qty: '6', price: '', unit: 'cartons', weight: '36' },
            { id: 's3', description: 'Decorative lamps', details: 'Fragile', qty: '4', price: '', unit: 'boxes', weight: '18.5' },
          ]
        : [
            { id: 's1', description: 'Interior design consultation', details: 'Space planning and mood board for the main lounge', qty: '1', price: '150000', unit: '', weight: '' },
            { id: 's2', description: 'Custom 3-seater sofa', details: 'Premium fabric, delivered and installed', qty: '2', price: '325000', unit: '', weight: '' },
            { id: 's3', description: 'Curtains and rail installation', details: '', qty: '1', price: '85000', unit: '', weight: '' },
            { id: 's4', description: 'Project coordination (hours)', details: '', qty: '12', price: '7500', unit: '', weight: '' },
          ]),
    ],
    discountMode: 'percent',
    discountValue: '5',
    taxLabel: 'VAT',
    taxRate: '7.5',
    charges: [{ id: 'c1', label: 'Delivery', amount: '15000' }],

    status: kind === 'receipt' ? 'paid' : status,
    amountPaid: status === 'partial' ? '400000' : '',

    paymentMethod: 'Bank transfer',
    reference: 'TRF-88213045',

    bankName: 'Zenith Bank',
    accountName: 'Adaeze Interiors Ltd',
    accountNumber: '1012345678',
    paymentInstructions: kind === 'quotation' ? 'Pay the deposit into the account above and send us the receipt.' : 'Please use the invoice number as your payment reference.',

    notes:
      kind === 'waybill'
        ? 'Call the receiver 30 minutes before arrival. Deliver to the site manager.'
        : kind === 'quotation'
          ? 'Prices include delivery within Lagos. Installation can start within 7 days of acceptance.'
          : 'Thank you for choosing Adaeze Interiors. We enjoyed working on this project with you.',
    terms:
      kind === 'waybill'
        ? "Goods are carried at the owner's risk unless insured. The receiver must check the goods on delivery and note any damage or shortage on this waybill before signing."
        : kind === 'quotation'
          ? 'This quotation is valid until the date shown above. A 60% deposit confirms the order, with the balance due on delivery.'
          : 'Payment is due within 14 days of the issue date. Goods remain the property of the seller until paid in full.',

    origin: 'Enugu',
    destination: 'Lagos',
    transportMode: 'Road',
    vehicleNo: 'ENU 482 XA',
    driverName: 'Chukwudi Eze',
    driverPhone: '+234 802 555 0166',
    expectedDate: addDays(today, 2),
    shipmentStatus: 'in-transit',
    freightCharge: '45000',
    freightPayer: 'sender',
    declaredValue: '1200000',
  };
}
