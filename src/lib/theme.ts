import type { StatusKey, TemplateId } from '../types';

export interface Theme {
  id: TemplateId;
  name: string;
  tagline: string;
  font: 'SnapSerif' | 'SnapSans';
  ink: string; // headings / strong
  text: string; // body
  muted: string; // labels
  accent: string;
  rule: string; // hairlines
  soft: string; // light fills
}

export const THEMES: Record<TemplateId, Theme> = {
  classic: {
    id: 'classic',
    name: 'Classic Corporate',
    tagline: 'Elegant and established',
    font: 'SnapSerif',
    ink: '#1b2438',
    text: '#2d3344',
    muted: '#6b7280',
    accent: '#8a6d2f',
    rule: '#cdd2db',
    soft: '#f6f4ee',
  },
  minimal: {
    id: 'minimal',
    name: 'Modern Minimal',
    tagline: 'Clean, simple, stylish',
    font: 'SnapSans',
    ink: '#111827',
    text: '#374151',
    muted: '#8b93a1',
    accent: '#0b6b57',
    rule: '#e5e7eb',
    soft: '#f6f7f9',
  },
  bold: {
    id: 'bold',
    name: 'Bold Business',
    tagline: 'Distinctive and confident',
    font: 'SnapSans',
    ink: '#0f172a',
    text: '#1f2937',
    muted: '#64748b',
    accent: '#1d4ed8',
    rule: '#dbe0e8',
    soft: '#f1f4f9',
  },
};

export const TEMPLATE_ORDER: TemplateId[] = ['classic', 'minimal', 'bold'];

export const STATUS_COLORS: Record<StatusKey, { fg: string; bg: string }> = {
  paid: { fg: '#15803d', bg: '#e6f4ea' },
  partial: { fg: '#b45309', bg: '#fdf1dc' },
  unpaid: { fg: '#b91c1c', bg: '#fdebeb' },
  // waybill statuses
  pending: { fg: '#b45309', bg: '#fdf1dc' },
  'in-transit': { fg: '#1d4ed8', bg: '#e8effd' },
  delivered: { fg: '#15803d', bg: '#e6f4ea' },
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
