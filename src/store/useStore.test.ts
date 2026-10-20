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
