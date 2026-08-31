import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { openDocument, openWorkspace, currentFileHandle, parseDocument } from './lib/fsManager';
import { FolderOpen, FileJson, AlertCircle, Download, Plus, Info, ExternalLink } from 'lucide-react';
import type { VisualPkmDocument } from './types/store';

import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import { exportToVectorPDF } from './lib/pdfExporter';

function App() {
  const { metadata, nodes, edges, loadDocument, clearDocument, selectedEntityId } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleOpenWorkspace = async () => {
    try {
      setError(null);
      const { doc } = await openWorkspace();
      loadDocument(doc);
    } catch (err: any) {
      if (err.message !== 'Cancelado') {
        setError(err.message);
      }
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

  const handleCreateNew = () => {
    setError(null);
    const newDoc: VisualPkmDocument = {
      documentVersion: "1.0.0",
      metadata: {
        creationTimestamp: new Date().toISOString(),
        lastModifiedTimestamp: new Date().toISOString(),
        vaultOwner: "Usuario",
        encryptionStatus: "unencrypted"
      },
      nodes: [],
      edges: []
    };
    loadDocument(newDoc);
  };

  const handleClose = () => {
    if (window.confirm("¿Estás seguro de que quieres cerrar el mapa de Social-Link?\n\n⚠️ Si has usado 'Importar JSON' o 'Crear Proyecto' y no has exportado tus datos manualmente desde el panel lateral, TUS CAMBIOS SE PERDERÁN.")) {
      clearDocument();
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

    checkFile();
    const interval = setInterval(checkFile, 3000);
    return () => clearInterval(interval);
  }, [metadata, loadDocument]);

  if (!metadata) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ExternalLink size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Social-Link</h1>
          <p className="text-gray-500 mt-2 mb-8 text-sm">Cartografía Relacional & Gestión de Memoria (Offline PWA)</p>
          
          <div className="space-y-4 text-left">
            
            {/* Opción 1: Carpeta (Recomendada) */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <button
                onClick={handleOpenWorkspace}
                className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold cursor-pointer shadow-sm"
              >
                <FolderOpen size={20} />
                Abrir Directorio (Recomendado)
              </button>
              <p className="text-xs text-blue-700 mt-2 px-1">
                Abre una carpeta de tu PC que contenga el archivo <strong>state.json</strong> y tus fotos. Permite <strong>autoguardado</strong> silencioso e imágenes locales.
              </p>
            </div>
            
            {/* Opción 2: Nuevo Proyecto */}
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold cursor-pointer shadow-sm"
              >
                <Plus size={20} />
                Crear Nuevo Mapa
              </button>
              <p className="text-xs text-green-700 mt-2 px-1">
                Inicia un lienzo en blanco desde cero. Tendrás que exportar tu progreso descargando el JSON al finalizar.
              </p>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-widest font-bold">o alternativamente</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Opción 3: Importar JSON (Fallback) */}
            <div>
              <button
                onClick={handleOpenFile}
                className="w-full flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg transition-colors font-semibold border border-gray-300 cursor-pointer shadow-sm"
              >
                <FileJson size={20} />
                Solo Importar JSON (Móvil)
              </button>
              <p className="text-xs text-gray-500 mt-2 px-1 text-center">
                Ideal para Android o lectura rápida. Carga un único archivo JSON estático (no hay autoguardado, requiere descarga manual).
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-left animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Disclaimer Plegable */}
        <div className="mt-12 max-w-2xl w-full">
          <button 
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="flex items-center justify-center gap-2 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Info size={14} /> {showDisclaimer ? 'Ocultar Información del Proyecto' : 'Información y Autoría (Click para expandir)'}
          </button>
          
          {showDisclaimer && (
            <div className="mt-4 p-5 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 leading-relaxed shadow-sm">
              <p className="font-bold text-gray-700 mb-2">Aviso de No-Autoría y Responsabilidad</p>
              <p className="mb-2">
                Yo soy un <strong>no-autor</strong> de esta aplicación. No reclamo crédito alguno por la arquitectura, código o diseño visual de Social-Link. Este software ha sido generado de forma puramente experimental haciendo uso de herramientas de Inteligencia Artificial super automatizadas (agentes autónomos).
              </p>
              <p className="mb-2">
                El desarrollo web no es mi campo de especialización ni forma parte de mis intereses profesionales. Por tanto, el código fuente o las decisiones técnicas aquí presentes <strong>no reflejan en absoluto mi experiencia, mi nivel técnico ni ninguna hipotética falta de profesionalidad</strong>. Ha sido un mero experimento de interacción máquina-usuario.
              </p>
              <p>
                <strong>Licencia y Uso:</strong> Este proyecto se proporciona tal cual ("as is"), sin ningún tipo de licencia formal, derecho de uso comercial, soporte o garantía. No está destinado a producción, y declino toda responsabilidad sobre la pérdida de datos o fallos operativos que deriven de su utilización.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
            <ExternalLink size={16} className="text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">Social-Link</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Vault: {metadata.vaultOwner} • Nodos: {nodes.length} • Aristas: {edges.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToVectorPDF}
            className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors cursor-pointer border border-gray-200 font-medium shadow-sm"
          >
            <Download size={16} /> PDF Vectorial
          </button>
          <button 
            onClick={handleClose}
            className="text-sm text-red-600 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded transition-colors cursor-pointer font-medium shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex">
        <div className="flex-1 relative">
          <GraphCanvas />
          <Toolbar />
        </div>
        {selectedEntityId && (
          <Sidebar />
        )}
      </main>
    </div>
  );
}

export default App;
