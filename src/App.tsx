import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { openDocument, openWorkspace, currentFileHandle, parseDocument } from './lib/fsManager';
import { FolderOpen, FileJson, AlertCircle, Download } from 'lucide-react';

import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import { exportToVectorPDF } from './lib/pdfExporter';

function App() {
  const { metadata, nodes, edges, loadDocument, clearDocument, selectedEntityId } = useStore();
  const [error, setError] = useState<string | null>(null);

  const handleOpenWorkspace = async () => {
    try {
      setError(null);
      const { doc } = await openWorkspace();
      loadDocument(doc);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenFile = async () => {
    try {
      setError(null);
      const { doc } = await openDocument();
      loadDocument(doc);
    } catch (err: any) {
      if (err.message !== 'Cancelado') {
        setError(err.message);
      }
    }
  };

  // Hot Reloading Logic
  useEffect(() => {
    if (!metadata || !currentFileHandle) return;

    let lastModified = 0;
    
    const checkFile = async () => {
      try {
        const file = await currentFileHandle.getFile();
        if (lastModified !== 0 && file.lastModified > lastModified) {
          // El archivo ha sido modificado externamente
          console.log('Detectado cambio externo, recargando en caliente...');
          const text = await file.text();
          const doc = parseDocument(text);
          loadDocument(doc);
        }
        lastModified = file.lastModified;
      } catch (err) {
        console.error('Error durante polling de hot reload:', err);
      }
    };

    // Inicializar timestamp
    checkFile();

    // Polling cada 3 segundos
    const interval = setInterval(checkFile, 3000);
    return () => clearInterval(interval);
  }, [metadata, loadDocument]);

  if (!metadata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">CRM Visual & PKM</h1>
          
          <div className="space-y-4">
            <button
              onClick={handleOpenWorkspace}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium cursor-pointer"
            >
              <FolderOpen size={20} />
              Abrir Directorio de Trabajo
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">o</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
              onClick={handleOpenFile}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors font-medium border border-gray-300 cursor-pointer"
            >
              <FileJson size={20} />
              Importar JSON (Fallback)
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-left">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div>
          <h1 className="font-bold text-gray-800">Cerebro Externo</h1>
          <p className="text-xs text-gray-500">Vault: {metadata.vaultOwner} | Nodos: {nodes.length} | Aristas: {edges.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToVectorPDF}
            className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors cursor-pointer border border-gray-200"
          >
            <Download size={16} /> PDF Vectorial
          </button>
          <button 
            onClick={clearDocument}
            className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex">
        <div className="flex-1 relative">
          <GraphCanvas />
        </div>
        {selectedEntityId && (
          <Sidebar />
        )}
      </main>
    </div>
  );
}

export default App;
