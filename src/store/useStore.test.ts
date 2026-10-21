import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.getState().clearDocument();
  });

  it('debería inicializar vacío', () => {
    const state = useStore.getState();
    expect(state.nodes).toHaveLength(0);
    expect(state.edges).toHaveLength(0);
    expect(state.metadata).toBeNull();
  });

  it('debería añadir un nodo individual correctamente', () => {
    useStore.getState().addNode('individual');
    const state = useStore.getState();
    
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].type).toBe('individual');
    expect(state.nodes[0].data.identity?.givenName).toBe('Tú');
    expect(state.nodes[0].data.biographicalAttributes?.shape).toBe('circle');
    
    // Debería auto-seleccionar el nodo creado
    expect(state.selectedEntityId).toBe(state.nodes[0].id);
    expect(state.selectedEntityType).toBe('node');
  });

  it('debería añadir un clúster correctamente', () => {
    useStore.getState().addNode('cluster');
    const state = useStore.getState();
    
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].type).toBe('cluster');
    expect(state.nodes[0].data.semanticLabel).toBe('Nuevo Grupo');
  });

  it('debería actualizar los datos de un nodo', () => {
    useStore.getState().addNode('individual');
    const nodeId = useStore.getState().nodes[0].id;

    useStore.getState().updateNodeData(nodeId, {
      identity: { givenName: 'Test', familyName: 'Update' }
    });

    const node = useStore.getState().nodes[0];
    expect(node.data.identity?.givenName).toBe('Test');
    expect(node.data.identity?.familyName).toBe('Update');
  });

  it('debería añadir una arista correctamente', () => {
    useStore.getState().addEdge('node-1', 'node-2');
    const state = useStore.getState();
    
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].sourceNodeId).toBe('node-1');
    expect(state.edges[0].targetNodeId).toBe('node-2');
    expect(state.edges[0].semanticRelationshipType).toBe('Conexión');
  });

  it('debería actualizar notas de un nodo', () => {
    useStore.getState().addNode('individual');
    const nodeId = useStore.getState().nodes[0].id;

    useStore.getState().updateNodeNotes(nodeId, '# Hola Mundo');
    const node = useStore.getState().nodes[0];
    expect(node.data.historicalNotes).toBe('# Hola Mundo');
  });

  it('debería soportar Deshacer (Undo) y Rehacer (Redo)', () => {
    // 1. Añadimos un nodo
    useStore.getState().addNode('individual');
    expect(useStore.getState().nodes).toHaveLength(1);

    // 2. Añadimos un segundo nodo
    useStore.getState().addNode('cluster');
    expect(useStore.getState().nodes).toHaveLength(2);

    // 3. Deshacer último nodo
    useStore.getState().undo();
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().nodes[0].type).toBe('individual');

    // 4. Rehacer
    useStore.getState().redo();
    expect(useStore.getState().nodes).toHaveLength(2);
    expect(useStore.getState().nodes[1].type).toBe('cluster');
  });
});

describe('historial y filtros', () => {
  beforeEach(() => { useStore.getState().clearDocument(); });

  it('los cambios de datos entran en el historial y se agrupan por ráfaga', () => {
    useStore.getState().addNode('individual');
    const id = useStore.getState().nodes[0].id;
    const base = useStore.getState().past.length;

    useStore.getState().updateNodeData(id, { description: 'a' });
    useStore.getState().updateNodeData(id, { description: 'ab' });
    useStore.getState().updateNodeData(id, { description: 'abc' });
    expect(useStore.getState().past.length).toBe(base + 1); // una sola ráfaga

    useStore.getState().undo();
    expect(useStore.getState().nodes[0].data.description).toBeUndefined();
  });

  it('history:false no crea pasos', () => {
    useStore.getState().addNode('individual');
    const id = useStore.getState().nodes[0].id;
    const base = useStore.getState().past.length;
    useStore.getState().updateNodeData(id, { visualPosition: { x: 5, y: 5 } }, { history: false });
    expect(useStore.getState().past.length).toBe(base);
  });

  it('filtro: null = apagado, [] = nada seleccionado', () => {
    const s = useStore.getState();
    expect(s.activeFilterCategories).toBeNull();
    s.deselectAllFilterCategories();
    expect(useStore.getState().activeFilterCategories).toEqual([]);
    useStore.getState().selectAllFilterCategories(['A', 'B']);
    expect(useStore.getState().activeFilterCategories).toEqual(['A', 'B']);
    useStore.getState().toggleFilterCategory('A');
    expect(useStore.getState().activeFilterCategories).toEqual(['B']);
    useStore.getState().clearFilterCategories();
    expect(useStore.getState().activeFilterCategories).toBeNull();
  });

  it('las aristas nuevas no fuerzan arrowDirection (decide la taxonomía)', () => {
    useStore.getState().addEdge('a', 'b');
    expect(useStore.getState().edges[0].data?.arrowDirection).toBeUndefined();
  });

  it('crea flechas libres con estilo por defecto', () => {
    useStore.getState().addNode('arrowAnnotation', { x: 100, y: 100 });
    const n = useStore.getState().nodes[0];
    expect(n.type).toBe('arrowAnnotation');
    expect(n.data.arrowStyle?.length).toBe(160);
  });
});
