import type { ReactFlowInstance } from 'reactflow';
import type { NodeType } from '../types/store';
import { useStore } from '../store/useStore';
import { findFreeSpot } from './placement';

let flow: ReactFlowInstance | null = null;

/** GraphCanvas registra aquí la instancia de React Flow para poder colocar nodos desde cualquier botón. */
export function registerFlowInstance(instance: ReactFlowInstance | null) {
  flow = instance;
}

/** Centro del viewport visible (el panel del lienzo, no la ventana entera) en coordenadas de flujo. */
export function getViewportCenter(): { x: number; y: number } {
  if (!flow) return { x: 0, y: 0 };
  const el = document.querySelector('.react-flow') as HTMLElement | null;
  const rect = el?.getBoundingClientRect();
  const sx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const sy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  try {
    return flow.screenToFlowPosition({ x: sx, y: sy });
  } catch {
    const vp = flow.getViewport();
    return { x: (sx - vp.x) / (vp.zoom || 1), y: (sy - vp.y) / (vp.zoom || 1) };
  }
}

/**
 * Crea un nodo donde mira el usuario. Si el centro está ocupado por nodos, aristas
 * o grupos, busca un hueco libre, crea ahí el nodo y desplaza la vista con animación.
 */
export function placeNode(type: NodeType) {
  const center = getViewportCenter();
  const { nodes, edges, addNode } = useStore.getState();

  if (type === 'cluster') {
    // Los grupos son grandes y pueden solaparse a propósito: se colocan en el centro.
    addNode(type, { x: Math.round(center.x), y: Math.round(center.y) });
    return;
  }

  const size = type === 'individual' ? 80 : type === 'arrowAnnotation' ? 60 : 200;
  const spot = findFreeSpot(center, nodes, edges, size);
  addNode(type, { x: Math.round(spot.x), y: Math.round(spot.y) });

  if (spot.moved && flow) {
    flow.setCenter(spot.x, spot.y, { zoom: flow.getZoom(), duration: 600 });
  }
}
