import { describe, it, expect } from 'vitest';
import { findFreeSpot } from './placement';
import { isPointInCluster, segmentIntersectsRect } from './geometry';
import type { NodeModel, EdgeModel } from '../types/store';

const person = (id: string, x: number, y: number): NodeModel => ({
  id, type: 'individual', data: { visualPosition: { x, y }, identity: { givenName: id } }
});

describe('findFreeSpot', () => {
  it('devuelve el centro si está libre', () => {
    const r = findFreeSpot({ x: 0, y: 0 }, [], []);
    expect(r).toEqual({ x: 0, y: 0, moved: false });
  });

  it('esquiva un nodo que ocupa el centro', () => {
    const r = findFreeSpot({ x: 40, y: 40 }, [person('a', 0, 0)], []);
    expect(r.moved).toBe(true);
    expect(Math.hypot(r.x - 40, r.y - 40)).toBeGreaterThan(80);
  });

  it('esquiva una arista que cruza el centro', () => {
    const nodes = [person('a', -400, 0), person('b', 400, 0)];
    const edges: EdgeModel[] = [{ id: 'e', sourceNodeId: 'a', targetNodeId: 'b', semanticRelationshipType: 'Amigo' }];
    const r = findFreeSpot({ x: 0, y: 40 }, nodes, edges);
    expect(r.moved).toBe(true);
  });

  it('esquiva un grupo (forma circular) que contiene el centro', () => {
    const cluster: NodeModel = {
      id: 'c', type: 'cluster',
      data: { visualPosition: { x: -200, y: -200 }, visualDimensions: { width: 400, height: 400 }, biographicalAttributes: { shape: 'circle' } }
    };
    const r = findFreeSpot({ x: 0, y: 0 }, [cluster], []);
    expect(r.moved).toBe(true);
    expect(isPointInCluster(r.x, r.y, { x: -200, y: -200, width: 400, height: 400, shape: 'circle' })).toBe(false);
  });
});

describe('geometry', () => {
  it('la hitbox de un círculo no incluye las esquinas de su rectángulo', () => {
    const c = { x: 0, y: 0, width: 400, height: 400, shape: 'circle' };
    expect(isPointInCluster(200, 200, c)).toBe(true);
    expect(isPointInCluster(10, 10, c)).toBe(false);
  });

  it('segmentIntersectsRect', () => {
    const r = { x: 0, y: 0, w: 10, h: 10 };
    expect(segmentIntersectsRect(-5, 5, 15, 5, r)).toBe(true);
    expect(segmentIntersectsRect(-5, 20, 15, 20, r)).toBe(false);
  });
});
