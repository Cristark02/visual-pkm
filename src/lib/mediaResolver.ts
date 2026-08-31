import { currentDirHandle } from './fsManager';

const blobCache = new Map<string, string>();

/**
 * Resolves a relative path to a local Blob URL using the File System Access API.
 */
export async function resolveLocalMedia(relativePath: string): Promise<string | null> {
  if (!relativePath) return null;
  if (blobCache.has(relativePath)) {
    return blobCache.get(relativePath)!;
  }
  
  if (!currentDirHandle) {
    console.warn('Cannot resolve media: currentDirHandle is null. Make sure the workspace was opened using showDirectoryPicker.');
    return null;
  }

  try {
    const parts = relativePath.split(/[/\\]/); // Handle / or \
    let currentHandle = currentDirHandle;
    
    // Traverse directories
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] === '' || parts[i] === '.') continue;
      currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
    }
    
    const fileName = parts[parts.length - 1];
    const fileHandle = await currentHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    
    const blobUrl = URL.createObjectURL(file);
    blobCache.set(relativePath, blobUrl);
    return blobUrl;
  } catch (error) {
    console.error(`Failed to resolve local media for path ${relativePath}`, error);
    return null;
  }
}
