import { useRef, type ReactNode } from 'react';
import { useUI } from '../../store/useUI';

/**
 * Hoja inferior de propiedades para móvil. Dos alturas (mitad / completa) para poder
 * editar viendo el lienzo; se arrastra por el asa: arriba = ampliar, abajo = reducir/cerrar.
 * En mitad de altura no hay telón: el lienzo sigue siendo interactivo.
 */
export default function PropertiesSheet({ children }: { children: ReactNode }) {
  const sheet = useUI(s => s.sheet);
  const setSheet = useUI(s => s.setSheet);
  const startY = useRef<number | null>(null);
  const open = sheet !== 'closed';

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (Math.abs(dy) < 8) setSheet(sheet === 'half' ? 'full' : 'half');
    else if (dy > 60) setSheet(sheet === 'full' ? 'half' : 'closed');
    else if (dy < -60) setSheet('full');
  };

  return (
    <>
      {sheet === 'full' && (
        <div className="fixed inset-0 z-[55] bg-gray-900/40" onClick={() => setSheet('half')} />
      )}
      <div
        {...(open ? { 'data-bottom-ui': true } : {})}
        className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col transition-all duration-300 ease-out"
        style={{
          height: sheet === 'full' ? '92dvh' : '52dvh',
          transform: open ? 'translateY(0)' : 'translateY(105%)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        aria-hidden={!open}
      >
        <div
          className="shrink-0 flex items-center justify-center h-9 touch-none select-none"
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => { startY.current = null; }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        <div className="flex-1 min-h-0">{open ? children : null}</div>
      </div>
    </>
  );
}
