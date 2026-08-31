import { describe, it, expect } from 'vitest';
import { parseDocument } from './fsManager';

describe('fsManager', () => {
  it('debería parsear un JSON válido correctamente', () => {
    const validJson = JSON.stringify({
      documentVersion: "1.0.0",
      metadata: { vaultOwner: "Test" },
      nodes: [],
      edges: []
    });

    const doc = parseDocument(validJson);
    expect(doc.documentVersion).toBe("1.0.0");
    expect(doc.metadata.vaultOwner).toBe("Test");
  });

  it('debería fallar al parsear un JSON inválido', () => {
    expect(() => parseDocument("{ invalid json")).toThrowError('El archivo seleccionado no es un JSON válido');
  });
});
