import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { openDocument, currentFileHandle, parseDocument } from './lib/fsManager';
import { FileJson, AlertCircle, Download, Plus, Info, ExternalLink, UploadCloud, X } from 'lucide-react';
import type { VisualPkmDocument } from './types/store';

import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import { exportToVectorPDF } from './lib/pdfExporter';

function App() {
  const { metadata, nodes, loadDocument, clearDocument, selectedEntityId, selectedEntityType } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Cuando cambia la selección, por defecto escondemos el sidebar completo en móvil
    // para dejar que el usuario manipule el nodo (resize, drag) libremente.
    setMobileSidebarOpen(false);
  }, [selectedEntityId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (nodes.length > 0) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nodes.length]);

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

  const handleCloseRequest = () => {
    setShowCloseModal(true);
  };

  const forceClose = () => {
    setShowCloseModal(false);
    clearDocument();
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
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ExternalLink size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Social-Link</h1>
          <p className="text-gray-500 mt-2 mb-8 text-sm">Cartografía Relacional & Gestión de Memoria (Offline PWA)</p>
          
          <div className="space-y-4 text-left">
            
            {/* Opción 1: Subir ZIP */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <label className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold cursor-pointer shadow-sm">
                <UploadCloud size={20} />
                Subir Social-Link (.zip)
                <input 
                  type="file" 
                  accept=".zip" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const JSZip = (await import('jszip')).default;
                      const zip = new JSZip();
                      const loadedZip = await zip.loadAsync(file);
                      let stateFile = loadedZip.file('state.json') || loadedZip.file('config/state.json');
                      if (stateFile) {
                        const stateText = await stateFile.async('string');
                        const stateData = JSON.parse(stateText);
                        loadDocument(stateData);
                      } else {
                        setError("El archivo ZIP no contiene un Social-Link válido (falta state.json)");
                      }
                    } catch (err) {
                      console.error(err);
                      setError("Error al leer el archivo ZIP");
                    }
                  }} 
                />
              </label>
              <p className="text-xs text-blue-700 mt-2 px-1 text-center">
                Carga tu copia de seguridad generada previamente para continuar editando.
              </p>
            </div>
            
            {/* Opción 2: Nuevo Proyecto */}
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold cursor-pointer shadow-sm"
              >
                <Plus size={20} />
                Crear Nuevo Mapa
              </button>
              <p className="text-xs text-green-700 mt-2 px-1 text-center">
                Inicia un lienzo en blanco desde cero. Tendrás que exportar tu progreso descargando el ZIP al finalizar.
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
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg transition-colors font-semibold border border-gray-300 cursor-pointer shadow-sm"
              >
                <FileJson size={20} />
                Solo Importar JSON (Móvil/Legado)
              </button>
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

  const handleExportZIP = async () => {
    const JSZip = (await import('jszip')).default;
    const { saveAs } = await import('file-saver');
    const { DEFAULT_TAXONOMY } = await import('./config/taxonomy');

    const zip = new JSZip();
    const state = useStore.getState();
    const stateDoc = { documentVersion: state.documentVersion, metadata: state.metadata, nodes: state.nodes, edges: state.edges };
    
    // Core state
    zip.file("state.json", JSON.stringify(stateDoc, null, 2));
    
    // Configs
    const configFolder = zip.folder("config");
    configFolder?.file("taxonomy.json", JSON.stringify(DEFAULT_TAXONOMY, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    
    const firstInd = state.nodes.find(n => n.type === 'individual');
    const fallbackName = state.nodes.length > 0 ? (state.nodes[0].data.semanticLabel || 'Proyecto') : 'Vacio';
    const principalName = firstInd 
      ? (firstInd.data.identity?.alias || [firstInd.data.identity?.givenName, firstInd.data.identity?.familyName].filter(Boolean).join('_') || 'Persona') 
      : fallbackName;
      
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    
    saveAs(content, `Social-Link de ${principalName} ${dateStr}.zip`);
  };

  return (
    <>
      <div className="h-screen w-screen flex flex-col bg-[#F8F9FA] overflow-hidden font-sans">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between shadow-sm z-20 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
              <ExternalLink size={14} className="text-white sm:hidden" />
              <ExternalLink size={16} className="text-white hidden sm:block" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">Social-Link</h1>
              <p className="hidden sm:block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Vault: {metadata.vaultOwner} • {nodes.length} Nodos</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={handleExportZIP}
              className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-semibold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer border border-gray-200 hover:border-indigo-200"
              title="Respaldar ZIP"
            >
              <Download size={14} /> <span className="hidden sm:inline">Respaldar</span>
            </button>
            <button 
              onClick={exportToVectorPDF}
              className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-semibold text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer border border-gray-200 hover:border-green-200"
              title="Exportar PDF"
            >
              <Download size={14} /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button 
              onClick={handleCloseRequest}
              className="text-[11px] sm:text-xs font-semibold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-3 sm:px-4 py-1.5 rounded-full transition-all cursor-pointer shadow-sm ml-1 sm:ml-2"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 relative flex">
          <div className="flex-1 relative">
            <GraphCanvas />
            <Toolbar />
          </div>
          
          {selectedEntityId && (
            <>
              {/* Mobile Peek Bar (Always visible on mobile when an entity is selected, unless sidebar is open) */}
              {!mobileSidebarOpen && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-40 px-4 py-3 flex items-center justify-between animate-in slide-in-from-bottom-full duration-300">
                  <div className="flex flex-col truncate pr-4">
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                      {selectedEntityType === 'edge' ? 'Vínculo' : (nodes.find(n => n.id === selectedEntityId)?.type === 'cluster' ? 'Grupo' : 'Persona')}
                    </span>
                    <span className="font-bold text-gray-800 text-sm truncate">
                      {selectedEntityType === 'edge' ? 'Editar Relación' : (
                        (() => {
                          const n = nodes.find(x => x.id === selectedEntityId);
                          if (!n) return '';
                          return n.type === 'cluster' ? (n.data.semanticLabel || 'Grupo') : (n.data.identity?.alias || n.data.identity?.givenName || 'Persona');
                        })()
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => setMobileSidebarOpen(true)} 
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
                    >
                      Propiedades
                    </button>
                    <button onClick={() => useStore.getState().setSelectedEntity(null, null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Backdrop for Full Sidebar */}
              <div 
                className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileSidebarOpen(false)}
              />
              
              {/* Sidebar Panel (Bottom sheet on mobile, right sidebar on desktop) */}
              <div 
                className={`fixed inset-x-0 bottom-0 h-[85vh] w-full bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] rounded-t-3xl flex flex-col z-50 md:relative md:inset-auto md:h-full md:w-80 md:max-w-none md:z-40 border-l border-gray-200 md:rounded-none transition-transform duration-300 ${mobileSidebarOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}
              >
                {/* Drag Handle for Mobile */}
                <div 
                  className="md:hidden flex items-center justify-center pt-4 pb-2 shrink-0 cursor-pointer"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <div className="w-12 h-1.5 bg-gray-300 hover:bg-gray-400 rounded-full transition-colors" />
                </div>
                <div className="flex-1 min-h-0">
                  <Sidebar />
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal de Cierre de Sesión */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">¿Cerrar sin guardar?</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Si cierras el espacio de trabajo ahora, se perderán todos los cambios que hayas hecho desde el último respaldo. 
              <br /><br />
              ¿Qué deseas hacer antes de salir?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => { 
                  await handleExportZIP(); 
                  forceClose(); 
                }} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Download size={18} /> Guardar ZIP y Cerrar
              </button>
              <button 
                onClick={forceClose} 
                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
              >
                Cerrar y descartar cambios
              </button>
              <button 
                onClick={() => setShowCloseModal(false)} 
                className="w-full py-3 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-colors mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
