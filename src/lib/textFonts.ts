import type { CSSProperties } from 'react';

/** Tipografías disponibles para los textos libres (compartidas por el nodo y el editor táctil). */
export interface TextFont { id: string; name: string; className: string; style?: CSSProperties }

export const TEXT_FONTS: TextFont[] = [
  { id: 'sans', name: 'Clásica', className: 'font-sans' },
  { id: 'serif', name: 'Serif', className: 'font-serif italic' },
  { id: 'mono', name: 'Mono', className: 'font-mono' },
  { id: 'display', name: 'TITULAR', className: 'font-sans uppercase tracking-widest', style: { fontWeight: 900 } },
  { id: 'hand', name: 'Mano', className: '', style: { fontFamily: '"Segoe Print","Bradley Hand","Comic Sans MS",cursive' } },
];

export const textFont = (id?: string): TextFont => TEXT_FONTS.find(f => f.id === id) || TEXT_FONTS[0];

/** text-shadow según el efecto elegido. */
export function effectShadow(effect: string | undefined, hasBackground: boolean): string | undefined {
  switch (effect) {
    case 'shadow': return '0 3px 8px rgba(0,0,0,0.55)';
    case 'outline': return '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000';
    case 'glow': return '0 0 8px currentColor, 0 0 18px currentColor';
    case 'none': return undefined;
    default: return hasBackground ? undefined : '0 2px 8px rgba(0,0,0,0.3)';
  }
}
