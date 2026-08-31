import type { VisualPkmDocument } from '../types/store';

/**
 * Handles File System API and Fallbacks.
 */

// We maintain a reference to the loaded file handle to save it later
export let currentFileHandle: any = null;
export let currentDirHandle: any = null;

/**
 * Parses raw string to VisualPkmDocument
 */
export function parseDocument(raw: string): VisualPkmDocument {
  try {
    const data = JSON.parse(raw);
    return data as VisualPkmDocument;
  } catch (error) {
    throw new Error('El archivo seleccionado no es un JSON válido');
  }
}

/**
 * Saves document via File System Access API
 */
export async function saveDocument(doc: VisualPkmDocument): Promise<void> {
  if (currentFileHandle) {
    try {
      const writable = await currentFileHandle.createWritable();
      await writable.write(JSON.stringify(doc, null, 2));
      await writable.close();
      console.log('Autoguardado exitoso');
    } catch (e) {
      console.error('Error durante el autoguardado:', e);
    }
  } else {
    // Modo fallback, no se puede autoguardar silenciosamente de la misma manera
    console.warn('Autoguardado no disponible en modo fallback');
  }
}

/**
 * Exports JSON data to a downloadable blob. (Mobile fallback)
 */
export function exportDocumentBlob(doc: VisualPkmDocument, filename: string = 'state.json') {
  const dataStr = JSON.stringify(doc, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports a JSON using File System Access API if supported, or fallback.
 */
export async function openDocument(): Promise<{ doc: VisualPkmDocument, dirHandle?: FileSystemDirectoryHandle | null }> {
  if ('showOpenFilePicker' in window) {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'JSON Document',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      
      const file = await fileHandle.getFile();
      const text = await file.text();
      const doc = parseDocument(text);
      
      return { doc };
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        throw error;
      }
      throw new Error('Cancelado');
    }
  } else {
    // Fallback: File Input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          reject(new Error('Cancelado'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const doc = parseDocument(event.target?.result as string);
            resolve({ doc });
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

/**
 * Selects a workspace directory
 */
export async function openWorkspace(): Promise<{ doc: VisualPkmDocument, dirHandle: FileSystemDirectoryHandle }> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API no está soportado en este navegador. Usa la importación de archivos estándar.');
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker();
    currentDirHandle = dirHandle;
    
    const fileHandle = await dirHandle.getFileHandle('state.json', { create: false });
    currentFileHandle = fileHandle;
    const file = await fileHandle.getFile();
    const text = await file.text();
    return { doc: parseDocument(text), dirHandle };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Cancelado');
    }
    throw new Error('No se encontró el archivo state.json en el directorio seleccionado.');
  }
}
