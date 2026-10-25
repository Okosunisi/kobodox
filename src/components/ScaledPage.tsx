import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Shows a fixed-size A4 page (210mm wide) shrunk to fit the space it is given,
 * so the very same document looks right on a phone and on a big monitor.
 */
export function ScaledPage({ children, maxScale = 1, maxHeight }: { children: ReactNode; maxScale?: number; maxHeight?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const iw = i.offsetWidth || 794;
      const s = Math.min(maxScale, o.clientWidth / iw);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div
      ref={outer}
      className="scaled-outer"
      style={{ height: maxHeight ? Math.min(height, maxHeight) : height }}
    >
      <div ref={inner} className="scaled-inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
