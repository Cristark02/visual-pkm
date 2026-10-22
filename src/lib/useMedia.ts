import { useEffect, useState } from 'react';

export function useMedia(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export type UIMode = 'phone' | 'tablet' | 'desktop';

/** phone: <768px · tablet: puntero táctil ≥768px · desktop: ratón. */
export function useUIMode(): UIMode {
  const coarse = useMedia('(pointer: coarse)');
  const narrow = useMedia('(max-width: 767px)');
  if (narrow) return 'phone';
  return coarse ? 'tablet' : 'desktop';
}
