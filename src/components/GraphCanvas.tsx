import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionMode,
  MarkerType,
  SelectionMode,
  useReactFlow,
  useStoreApi
} from 'reactflow';
import type {
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  NodeChange,
  EdgeChange,
  NodePositionChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import IndividualNode from './nodes/IndividualNode';
import ClusterNode from './nodes/ClusterNode';
import TextAnnotationNode from './nodes/TextAnnotationNode';
import ImageAnnotationNode from './nodes/ImageAnnotationNode';
import ParallelEdge from './edges/ParallelEdge';
import { getTaxonomyRelation, DEFAULT_TAXONOMY } from '../config/taxonomy';
import { isPointInCluster } from '../lib/geometry';
import { registerFlowInstance } from '../lib/placeNode';
// Zoom muy amplio: se puede alejar mucho y acercar mucho; el botón «Centrar» devuelve la vista
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 12;
import { useUI } from '../store/useUI';
import { useUIMode } from '../lib/useMedia';
import { entityRect, revealRect } from '../lib/viewport';
import ArrowAnnotationNode from './nodes/ArrowAnnotationNode';

const nodeTypes = {
  individual: IndividualNode,
  cluster: ClusterNode,
  textAnnotation: TextAnnotationNode,
  imageAnnotation: ImageAnnotationNode,
  arrowAnnotation: ArrowAnnotationNode,
};

const edgeTypes = {
  parallel: ParallelEdge,
};

const determineShape = (nodeId: string, edges: any[]) => {
  const relatedEdges = edges.filter(e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
  let isPartner = false;
  let isMentor = false;
  let isFamily = false;

  for (const edge of relatedEdges) {
    const type = edge.semanticRelationshipType?.toLowerCase() || '';
    if (type.includes('pareja') || type.includes('cónyuge')) isPartner = true;
    if (type.includes('mentor') || type.includes('profesor')) isMentor = true;
    if (type.includes('padre') || type.includes('madre') || type.includes('hijo')) isFamily = true;
  }

  if (isPartner) return 'heart';
  if (isMentor) return 'star';
  if (isFamily) return 'square';
  return 'circle';
};

const checkOverlap = (n1: RFNode, n2: RFNode) => {
  const w1 = n1.data?.visualDimensions?.width || 800;
  const h1 = n1.data?.visualDimensions?.height || 800;
  const w2 = n2.data?.visualDimensions?.width || 800;
  const h2 = n2.data?.visualDimensions?.height || 800;
  
  return (
    n1.position.x < n2.position.x + w2 &&
    n1.position.x + w1 > n2.position.x &&
    n1.position.y < n2.position.y + h2 &&
    n1.position.y + h1 > n2.position.y
  );
};

const isInside = (individual: RFNode, cluster: RFNode) =>
  isPointInCluster(individual.position.x + 40, individual.position.y + 40, {
    x: cluster.position.x,
    y: cluster.position.y,
    width: cluster.data?.visualDimensions?.width || 800,
    height: cluster.data?.visualDimensions?.height || 800,
    shape: cluster.data?.biographicalAttributes?.shape
  });

export default function GraphCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setSelectedEntity, addEdge: addStoreEdge, updateNodeData, activeFilterCategories } = useStore();
  
  // --- Modo táctil ---
  const mode = useUIMode();
  const touchUI = mode !== 'desktop';
  const multiSelect = useUI(s => s.multiSelect);
  const connectFrom = useUI(s => s.connectFrom);
  const studioId = useUI(s => s.studioId);
  const sheet = useUI(s => s.sheet);
  const flow = useReactFlow();
  const rfStore = useStoreApi();

  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);

  const nodesRef = useRef<RFNode[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  // true mientras el usuario arrastra el rectángulo de selección (caja drag)
  const boxSelecting = useRef(false);
  
  // Ref para capturar el estado inicial de un drag
  const dragContext = useRef<{ active: boolean, clusterIds: string[], memberIds: string[] }>({ active: false, clusterIds: [], memberIds: [] });

  // Pellizco con dos dedos sobre un nodo (p. ej. un grupo grande): d3-drag del nodo se queda el
  // touchstart y el zoom de reactflow nunca lo recibe. Lo gestionamos aquí.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !touchUI) return;
    let g: { d0: number; z0: number; x0: number; y0: number; cx: number; cy: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const onNode = [...e.touches].some(t => (t.target as Element | null)?.closest?.('.react-flow__node'));
      if (!onNode) return;
      const rect = el.getBoundingClientRect();
      const v = flow.getViewport();
      g = {
        d0: dist(e.touches) || 1, z0: v.zoom, x0: v.x, y0: v.y,
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      };
      e.stopPropagation();
    };
    const onMove = (e: TouchEvent) => {
      if (!g) return;
      e.stopPropagation(); e.preventDefault();
      if (e.touches.length !== 2) return;
      const rect = el.getBoundingClientRect();
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.z0 * (dist(e.touches) / g.d0)));
      const k = z / g.z0;
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      // el punto del lienzo bajo el centro inicial sigue bajo el centro actual
      flow.setViewport({ x: mx - (g.cx - g.x0) * k, y: my - (g.cy - g.y0) * k, zoom: z });
    };
    const onEnd = (e: TouchEvent) => { if (g) { e.stopPropagation(); if (e.touches.length < 2) g = null; } };
    el.addEventListener('touchstart', onStart, true);
    el.addEventListener('touchmove', onMove, { capture: true, passive: false });
    el.addEventListener('touchend', onEnd, true);
    el.addEventListener('touchcancel', onEnd, true);
    return () => {
      el.removeEventListener('touchstart', onStart, true);
      el.removeEventListener('touchmove', onMove, true);
      el.removeEventListener('touchend', onEnd, true);
      el.removeEventListener('touchcancel', onEnd, true);
    };
  }, [touchUI, flow]);

  // Tamaño de los tiradores independiente del zoom (--rf-zoom): con zoom bajo seguían siendo diminutos
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => el.style.setProperty('--rf-zoom', String(Math.max(rfStore.getState().transform[2], 0.05)));
    apply();
    return rfStore.subscribe(apply);
  }, [rfStore]);

  useEffect(() => {
    rfStore.setState({ multiSelectionActive: multiSelect });
  }, [multiSelect, rfStore]);

  // Al entrar en selección múltiple se parte de cero
  useEffect(() => {
    if (multiSelect) useStore.getState().setSelectedEntity(null, null);
  }, [multiSelect]);

  // Revela la entidad seleccionada si queda fuera de la zona visible (tras barras/hojas inferiores)
  const selectedEntityId = useStore(s => s.selectedEntityId);
  useEffect(() => {
    if (!touchUI || !selectedEntityId) return;
    const t = setTimeout(() => {
      const st = useStore.getState();
      const r = entityRect(selectedEntityId, st.selectedEntityType ?? 'node', st.nodes, st.edges);
      if (r) revealRect(flow, r);
    }, 260);
    return () => clearTimeout(t);
  }, [touchUI, selectedEntityId, sheet, flow]);

  const allowedRelIds = useMemo(() => {
    if (activeFilterCategories === null) return null;
    // Con todas las categorías marcadas no se filtra nada (incluye relaciones sin categoría)
    if (DEFAULT_TAXONOMY.every(cat => activeFilterCategories.includes(cat.name))) return null;
    const ids = new Set<string>();
    DEFAULT_TAXONOMY.forEach(cat => {
      if (activeFilterCategories.includes(cat.name)) {
        cat.relationships.forEach(r => ids.add(r.id.toLowerCase()));
      }
    });
    return ids;
  }, [activeFilterCategories]);

  const connectedNodeIds = useMemo(() => {
    if (!allowedRelIds) return null;
    const ids = new Set<string>();
    storeEdges.forEach(e => {
      const rel = (e.semanticRelationshipType || '').toLowerCase();
      if (allowedRelIds.has(rel)) {
        ids.add(e.sourceNodeId);
        ids.add(e.targetNodeId);
      }
    });
    return ids;
  }, [allowedRelIds, storeEdges]);

  useEffect(() => {
    const selectedNow = useStore.getState().selectedEntityId;
    // Si acaba de crearse el nodo seleccionado, este pasa a ser la única selección
    const freshSelectionId = selectedNow && !nodesRef.current.some(cn => cn.id === selectedNow)
      && storeNodes.some(n => n.id === selectedNow) ? selectedNow : null;
    const rfNodes: RFNode[] = storeNodes.map((n, i) => {
      let x = n.data.visualPosition?.x;
      let y = n.data.visualPosition?.y;

      if (x === undefined || y === undefined) {
        const existingNode = nodesRef.current.find(cn => cn.id === n.id);
        if (existingNode) {
          x = existingNode.position.x;
          y = existingNode.position.y;
        } else if (i === 0) {
          x = 0;
          y = 0;
        } else {
          const radiusStep = 180;
          const nodesPerRing = 8;
          const ringIndex = Math.floor((i - 1) / nodesPerRing) + 1;
          const indexInRing = (i - 1) % nodesPerRing;
          const currentRadius = ringIndex * radiusStep;
          const angleStep = (2 * Math.PI) / nodesPerRing;
          const angleOffset = (ringIndex % 2) * (angleStep / 2);
          const angle = indexInRing * angleStep + angleOffset;

          x = currentRadius * Math.cos(angle);
          y = currentRadius * Math.sin(angle);
        }
      }

      const isCluster = n.type === 'cluster';
      const w = n.data.visualDimensions?.width || (isCluster ? 800 : 80);
      const h = n.data.visualDimensions?.height || (isCluster ? 800 : 80);

      const isFilteredOut = connectedNodeIds !== null && !connectedNodeIds.has(n.id) && n.type === 'individual';
      // El texto se ajusta a su contenido (sin ancho/alto fijos); el resto de nodos usan su tamaño guardado
      const nodeStyle = isCluster 
        ? { width: w, height: h, zIndex: -1 } 
        : n.type === 'textAnnotation'
          ? { zIndex: 1, opacity: isFilteredOut ? 0.25 : 1, transition: 'opacity 0.25s ease' }
          : { width: w, height: h, zIndex: 1, opacity: isFilteredOut ? 0.25 : 1, transition: 'opacity 0.25s ease' };

      // Conserva la selección existente; un nodo recién creado nace seleccionado si el store lo apunta
      const existingRf = nodesRef.current.find(cn => cn.id === n.id);
      const wasSelected = existingRf
        ? (existingRf.selected && !freshSelectionId)
        : n.id === selectedNow;

      return {
        id: n.id,
        type: n.type,
        position: { x, y },
        selected: wasSelected,
        // Los textos no tienen tamaño fijo: se conserva el medido, o React Flow los oculta un instante
        // al reconstruir los nodos (y el teclado se cerraría al escribir)
        ...(n.type === 'textAnnotation' && existingRf?.width && existingRf?.height
          ? { width: existingRf.width, height: existingRf.height }
          : {}),
        className: [
          connectFrom
            ? (n.id === connectFrom ? 'connect-source' : (n.type === 'individual' ? 'connect-candidate' : ''))
            : '',
          n.id === studioId ? 'studio-target' : '',
        ].filter(Boolean).join(' '),
        style: nodeStyle,
        data: {
          ...n.data,
          visualDimensions: { width: w, height: h },
          computedShape: isCluster ? undefined : determineShape(n.id, storeEdges)
        },
        dragHandle: '.react-flow__node'
      };
    });
    
    setNodes(rfNodes);
    nodesRef.current = rfNodes;
  }, [storeNodes, storeEdges, connectedNodeIds, connectFrom, studioId]);

  useEffect(() => {
    const edgeGroups = new Map<string, typeof storeEdges>();
    storeEdges.forEach(e => {
      const pairId = [e.sourceNodeId, e.targetNodeId].sort().join('-');
      if (!edgeGroups.has(pairId)) edgeGroups.set(pairId, []);
      edgeGroups.get(pairId)!.push(e);
    });

    const rfEdges: RFEdge[] = [];
    
    edgeGroups.forEach((group) => {
      const seenLabels = new Set<string>();

      group.forEach((e, index) => {
        const isBidirectional = group.some(ge => ge.sourceNodeId === e.targetNodeId && ge.targetNodeId === e.sourceNodeId);
        let offsetIndex = index;
        
        if (isBidirectional) {
          const sortedGroup = [...group].sort((a,b) => a.id.localeCompare(b.id));
          const idx = sortedGroup.findIndex(ge => ge.id === e.id);
          offsetIndex = idx === 0 ? 0 : Math.ceil(idx / 2) * (idx % 2 === 0 ? 1 : -1);
        } else if (group.length > 1) {
          offsetIndex = index === 0 ? 0 : Math.ceil(index / 2) * (index % 2 === 0 ? 1 : -1);
        }

        const semanticType = e.semanticRelationshipType || 'Conexión';
        const isDuplicateLabel = seenLabels.has(semanticType);
        seenLabels.add(semanticType);

        const taxRule = getTaxonomyRelation(semanticType);
        // La flecha solo existe en relaciones direccionales de la taxonomía (Mentor, Profesor...).
        // Por defecto apunta de origen a destino; el usuario solo puede cambiar el sentido.
        let markerEnd = undefined;
        let markerStart = undefined;
        if (taxRule.arrow) {
          const stored = e.data?.arrowDirection;
          const dir = !stored || stored === 'none' ? 'forward' : stored;
          const marker = { type: MarkerType.ArrowClosed, color: taxRule.color };
          if (dir === 'forward' || dir === 'mutual') markerEnd = marker;
          if (dir === 'backward' || dir === 'mutual') markerStart = marker;
        }

        const edgeMatches = allowedRelIds === null || allowedRelIds.has(semanticType.toLowerCase());
        const filterState = allowedRelIds === null ? undefined : (edgeMatches ? 'highlight' : 'dim');

        rfEdges.push({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          type: 'parallel',
          animated: false,
          markerStart,
          markerEnd,
          data: {
            ...e.data,
            semanticRelationshipType: semanticType,
            offsetIndex,
            isZigZag: semanticType === 'Conflicto',
            isDuplicateLabel,
            filterState
          }
        });
      });
    });

    // === HASHING ESPACIAL PARA ETIQUETAS QUE SE CRUZAN GEOMÉTRICAMENTE ===
    // Calcula aproximadamente el punto medio de cada arista para detectar choques entre uniones *diferentes*
    const occupiedSpaces: { x: number, y: number, baseLabel: string, edge: RFEdge }[] = [];

    rfEdges.forEach(edge => {
      // Ignorar si ya está oculto (ej. uniones paralelas duplicadas)
      if (edge.data.isDuplicateLabel) return;

      const sNode = storeNodes.find(n => n.id === edge.source);
      const tNode = storeNodes.find(n => n.id === edge.target);
      if (!sNode || !tNode) return;

      const sPos = sNode.data.visualPosition || { x: 0, y: 0 };
      const tPos = tNode.data.visualPosition || { x: 0, y: 0 };

      // Calcular punto medio aproximado
      const sx = sPos.x + 40; // ~40 es el centro del nodo estándar
      const sy = sPos.y + 40;
      const tx = tPos.x + 40;
      const ty = tPos.y + 40;
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;

      const g1 = sNode.data?.biographicalAttributes?.gender;
      const g2 = tNode.data?.biographicalAttributes?.gender;
      const hasMale = g1 === 'Hombre' || g2 === 'Hombre';
      
      const baseLabel = edge.data.semanticRelationshipType;

      // Buscar si ya hay otra etiqueta muy cerca (aumentamos el radio a 85px para más holgura)
      const collision = occupiedSpaces.find(pos => Math.hypot(pos.x - mx, pos.y - my) < 85);

      if (collision) {
        if (collision.baseLabel === baseLabel) {
          // ¡Fusión! Si se cruzan y son el mismo tipo base, ocultamos la segunda
          edge.data.isDuplicateLabel = true;
          // Si esta nueva línea tiene hombres, forzamos a la que sobrevive a usar género masculino
          if (hasMale) {
            collision.edge.data.forceMasculine = true;
          }
        } else {
          // Son distintas pero chocan en el espacio 2D. Aplicar un offset para apilarlas visualmente
          edge.data.collisionOffsetY = (collision.edge.data.collisionOffsetY || 0) + 14;
        }
      } else {
        occupiedSpaces.push({ x: mx, y: my, baseLabel, edge });
      }
    });

    setEdges(rfEdges);
  }, [storeEdges, storeNodes, allowedRelIds]);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: RFNode) => {
    if (node.type === 'cluster') {
      const allClusters = nodesRef.current.filter(n => n.type === 'cluster');
      const connectedClusters = new Set<string>([node.id]);
      
      if (node.data.isChainLinked) {
        let added = true;
        while (added) {
          added = false;
          allClusters.forEach(c => {
            if (!connectedClusters.has(c.id)) {
              const overlaps = Array.from(connectedClusters).some(ccId => {
                const cc = nodesRef.current.find(n => n.id === ccId);
                return cc ? checkOverlap(c, cc) : false;
              });
              if (overlaps) {
                connectedClusters.add(c.id);
                added = true;
              }
            }
          });
        }
      }

      const members = nodesRef.current.filter(n => {
        if (n.type !== 'individual') return false;
        return Array.from(connectedClusters).some(ccId => {
          const cc = nodesRef.current.find(x => x.id === ccId);
          return cc ? isInside(n, cc) : false;
        });
      });

      dragContext.current = {
        active: true,
        clusterIds: Array.from(connectedClusters),
        memberIds: members.map(m => m.id)
      };
    } else {
      dragContext.current = { active: false, clusterIds: [], memberIds: [] };
    }
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      // Ignoramos cambios de dimensiones con valores a cero que envía React Flow al montar nodos.
      // Esto previene el bug de nodos invisibles al importar un proyecto.
      const validChanges = changes.filter(c => {
        if (c.type === 'dimensions') {
          return c.dimensions && c.dimensions.width > 0 && c.dimensions.height > 0;
        }
        // La caja de selección solo atrapa nodos: los grupos se ignoran (siguen
        // seleccionándose con un clic directo sobre su forma).
        if (c.type === 'select' && c.selected && boxSelecting.current) {
          return nds.find(n => n.id === c.id)?.type !== 'cluster';
        }
        return true;
      });

      const clusterDrags = validChanges.filter(c => c.type === 'position' && c.dragging) as NodePositionChange[];
      const extraChanges: NodeChange[] = [];

      if (clusterDrags.length > 0 && dragContext.current.active) {
        // Encontramos el delta del nodo arrastrado principal
        const mainDrag = clusterDrags[0];
        const mainNode = nds.find(n => n.id === mainDrag.id);
        
        if (mainNode && mainDrag.position) {
          const dx = mainDrag.position.x - mainNode.position.x;
          const dy = mainDrag.position.y - mainNode.position.y;

          if (dx !== 0 || dy !== 0) {
            const allToMove = new Set<string>([...dragContext.current.clusterIds, ...dragContext.current.memberIds]);
            allToMove.delete(mainDrag.id); // No mover al principal de nuevo
            
            allToMove.forEach((id: string) => {
              const n = nds.find(x => x.id === id);
              if (n) {
                extraChanges.push({
                  type: 'position',
                  id: n.id,
                  position: {
                    x: n.position.x + dx,
                    y: n.position.y + dy
                  },
                  dragging: true
                });
              }
            });
          }
        }
      }
      
      const newNodes = applyNodeChanges([...validChanges, ...extraChanges], nds);
      nodesRef.current = newNodes;
      return newNodes;
    });
  }, [updateNodeData]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // La caja de selección tampoco selecciona aristas.
    const valid = boxSelecting.current
      ? changes.filter(c => !(c.type === 'select' && c.selected))
      : changes;
    setEdges((eds) => applyEdgeChanges(valid, eds));
  }, []);

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    deleted.forEach(n => {
      if (useStore.getState().nodes.some(x => x.id === n.id)) useStore.getState().removeNode(n.id);
    });
  }, []);

  const onEdgesDelete = useCallback((deleted: RFEdge[]) => {
    // Si el borrado de un nodo ya arrastró sus aristas en el store, no duplicamos pasos de historial.
    deleted.forEach(e => {
      if (useStore.getState().edges.some(x => x.id === e.id)) useStore.getState().removeEdge(e.id);
    });
  }, []);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target && params.source !== params.target) {
      addStoreEdge(params.source, params.target);
    }
  }, [addStoreEdge]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    const ui = useUI.getState();
    // Modo "Conectar": el siguiente toque sobre otra persona crea la unión
    if (ui.connectFrom) {
      if (node.type === 'individual' && node.id !== ui.connectFrom) {
        addStoreEdge(ui.connectFrom, node.id);
        ui.setConnectFrom(null);
        if (window.matchMedia('(max-width: 767px)').matches) ui.setSheet('half');
      }
      return;
    }
    // En selección múltiple no se abre el panel de propiedades
    if (ui.multiSelect) return;
    // Táctil: tocar un texto, foto o flecha abre su editor a pantalla completa
    if (window.matchMedia('(pointer: coarse), (max-width: 767px)').matches &&
        (node.type === 'textAnnotation' || node.type === 'imageAnnotation' || node.type === 'arrowAnnotation')) {
      ui.openStudio(node.id);
    }
    setSelectedEntity(node.id, 'node');
  }, [setSelectedEntity, addStoreEdge]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: RFEdge) => {
    setSelectedEntity(edge.id, 'edge');
  }, [setSelectedEntity]);

  const onPaneClick = useCallback(() => {
    const ui = useUI.getState();
    if (ui.connectFrom) { ui.setConnectFrom(null); return; }
    ui.setAddSheetOpen(false);
    setSelectedEntity(null, null);
  }, [setSelectedEntity]);

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: RFNode[] }) => {
    useUI.getState().setSelectedIds(sel.map(n => n.id));
  }, []);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: RFNode) => {
    const currentNodes = nodesRef.current;

    useStore.getState().pushSnapshot();

    // Guardar posiciones de todos los que se hayan movido
    if (dragContext.current.active) {
      const movedIds = new Set<string>([...dragContext.current.clusterIds, ...dragContext.current.memberIds, node.id]);
      movedIds.forEach((id: string) => {
        const n = currentNodes.find(x => x.id === id);
        if (n) updateNodeData(id, { visualPosition: n.position }, { history: false });
      });
      dragContext.current.active = false;
    } else {
      updateNodeData(node.id, { visualPosition: node.position }, { history: false });
      // Sincronizar nodos multiseleccionados
      const otherSelected = currentNodes.filter(n => n.selected && n.id !== node.id);
      otherSelected.forEach(sn => {
        updateNodeData(sn.id, { visualPosition: sn.position }, { history: false });
      });
    }
    
    // Recalcular membresías para todos los individuos
    currentNodes.forEach(n => {
      if (n.type === 'individual') {
        const overlappingClusters = currentNodes.filter(c => {
          if (c.type !== 'cluster') return false;
          return isInside(n, c);
        }).map(c => c.id);
        
        // Solo actualizar si hay un cambio real para evitar renders infinitos
        const oldIds = n.data.clusterIds || [];
        if (oldIds.length !== overlappingClusters.length || !oldIds.every((id: string) => overlappingClusters.includes(id))) {
          updateNodeData(n.id, { clusterIds: overlappingClusters }, { history: false });
        }
      }
    });
  }, [updateNodeData]);

  return (
    <div ref={wrapRef} className="w-full h-full bg-[#f8fafc]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onInit={registerFlowInstance}
        onSelectionStart={() => { boxSelecting.current = true; }}
        onSelectionEnd={() => { boxSelecting.current = false; }}
        multiSelectionKeyCode={['Control', 'Meta']}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        // Ratón: arrastre izquierdo = caja de selección. Táctil: un dedo = mover el lienzo;
        // la caja solo se dibuja en "Selección múltiple". Dos dedos siempre hacen zoom/pan.
        panOnDrag={touchUI && !multiSelect ? true : [1, 2]}
        selectionOnDrag={!touchUI || multiSelect}
        zoomOnDoubleClick={!touchUI}
        nodeDragThreshold={touchUI ? 8 : 1}
        connectionRadius={touchUI ? 48 : 20}
        onSelectionChange={touchUI ? onSelectionChange : undefined}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        className="touch-manipulation"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} size={2} />
        <Controls className="bg-white/80 backdrop-blur border border-gray-200 shadow-lg rounded-xl overflow-hidden mb-16 sm:mb-0" />
        <MiniMap zoomable pannable className="hidden sm:block" />
      </ReactFlow>
    </div>
  );
}
