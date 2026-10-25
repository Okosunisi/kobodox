import type { Logo } from '../types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 600; // px, plenty for a crisp logo on A4 and keeps the PDF small
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be opened. Try a PNG or JPG file.'));
    img.src = src;
  });
}

/** Validates, downsizes and normalises an uploaded logo entirely in the browser. */
export async function processLogoFile(file: File): Promise<Logo> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Please choose a PNG, JPG, WebP, GIF or SVG image.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('That image is larger than 5 MB. Please choose a smaller one.');
  }

  const src = await readAsDataURL(file);
  const img = await loadImage(src);

  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) {
    // Some SVGs have no intrinsic size.
    w = 400;
    h = 400;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');

  const isJpeg = file.type === 'image/jpeg';
  if (isJpeg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.drawImage(img, 0, 0, cw, ch);

  const dataUrl = isJpeg ? canvas.toDataURL('image/jpeg', 0.92) : canvas.toDataURL('image/png');
  return { dataUrl, width: cw, height: ch, format: isJpeg ? 'JPEG' : 'PNG' };
}
