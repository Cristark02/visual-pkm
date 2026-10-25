import { forwardRef, useEffect, useRef } from 'react';
import type { NodeData } from '../types/store';
import { textFont, effectShadow } from '../lib/textFonts';

type SC = NonNullable<NodeData['styleConfig']>;

export interface TextEdit {
  /** Recibe el elemento editable (para enfocarlo). */
  editRef?: React.MutableRefObject<HTMLElement | null>;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  placeholder?: string;
}

interface Props {
  text: string;
  sc: SC;
  /** Tamaño de letra en px (en pantalla o en unidades de flujo, según dónde se pinte). */
  fontPx: number;
  /** Si se pasa, el propio texto es editable. */
  edit?: TextEdit;
  className?: string;
}

/** Enfoca un elemento editable dejando el cursor al final. */
export function focusEnd(el: HTMLElement | null) {
  if (!el) return;
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}

/**
 * Texto con el aspecto de las historias: cada línea lleva su propio fondo redondeado (resaltado),
 * se ajusta a un ancho máximo en em y escala entero con el tamaño de letra.
 * Lo usan el nodo del lienzo y el editor táctil, para que lo que ves sea lo que queda.
 * Al editar, el propio texto es el campo (contentEditable): cursor, selección y saltos de línea nativos.
 */
const TextBlock = forwardRef<HTMLDivElement, Props>(({ text, sc, fontPx, edit, className = '' }, ref) => {
  const font = textFont(sc.fontFamily);
  const showBg = sc.showBackground !== false && (sc.highlightStyle || 'pill') !== 'transparent';
  const round = (sc.highlightStyle || 'pill') !== 'solid';
  const color = sc.textColor || '#1e293b';
  const bg = sc.bgColor || '#ffffff';
  const align = sc.textAlign || 'center';
  const wrap = !!(sc.wrapEm && sc.wrapEm > 0);
  const editorRef = useRef<HTMLSpanElement | null>(null);

  // El contenido editable no es "controlado": se vuelca el texto una vez al entrar a editar
  const editing = !!edit;
  useEffect(() => {
    if (editing && editorRef.current) {
      editorRef.current.textContent = text;
      if (edit?.editRef) edit.editRef.current = editorRef.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const flow: React.CSSProperties = wrap
    ? { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: `${sc.wrapEm}em`, width: 'max-content' }
    : { whiteSpace: 'pre', width: 'max-content' };

  const highlight: React.CSSProperties = {
    ...(showBg
      ? { backgroundColor: bg, padding: '0.06em 0.3em', borderRadius: round ? '0.3em' : '0.04em' }
      : { padding: '0.06em 0.3em' }),
    WebkitBoxDecorationBreak: 'clone',
    boxDecorationBreak: 'clone',
    textShadow: effectShadow(sc.textEffect, showBg),
  };

  return (
    <div
      ref={ref}
      className={`relative font-bold ${font.className} ${className}`}
      style={{ fontSize: `${fontPx}px`, lineHeight: 1.3, textAlign: align, color, padding: '0.1em 0.1em', minWidth: '1.5em', ...flow, ...font.style }}
    >
      {edit ? (
        <span
          ref={editorRef}
          contentEditable={('plaintext-only' as unknown) as boolean}
          suppressContentEditableWarning
          data-placeholder={edit.placeholder}
          className="tb-edit nodrag nopan"
          style={{ ...highlight, outline: 'none', caretColor: color, display: 'inline', minWidth: '1ch' }}
          onInput={e => edit.onChange((e.currentTarget.innerText || '').replace(/​/g, '').replace(/\n$/, ''))}
          onBlur={edit.onBlur}
          onKeyDown={edit.onKeyDown}
          spellCheck={false}
          autoCapitalize="sentences"
        />
      ) : (
        <span style={highlight}>{text}{'​'}</span>
      )}
    </div>
  );
});
TextBlock.displayName = 'TextBlock';
export default TextBlock;
