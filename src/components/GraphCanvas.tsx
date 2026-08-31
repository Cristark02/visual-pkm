import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionMode,
  MarkerType
} from 'reactflow';
import type {
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import IndividualNode from './nodes/IndividualNode';
import ClusterNode from './nodes/ClusterNode';
import ParallelEdge from './edges/ParallelEdge';
import { getTaxonomyRelation } from '../config/taxonomy';

const nodeTypes = {
  individual: IndividualNode,
  cluster: ClusterNode,
};

const edgeTypes = {
  parallel: ParallelEdge,
};

// Heurística simple para determinar la forma si no está asignada manualmente
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

export default function GraphCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setSelectedEntity, addEdge: addStoreEdge, updateNodeData } = useStore();
  
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);

  // Ref to hold current rendered nodes for accurate overlap calculations
  const nodesRef = useRef<RFNode[]>([]);

  useEffect(() => {
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

      return {
        id: n.id,
        type: n.type,
        position: { x, y },
        // IMPORTANTE: Ya no usamos parentNode. Todos los nodos son libres (para permitir solapamiento tipo Venn)
        style: isCluster ? { width: 400, height: 400, zIndex: -1 } : { zIndex: 1 },
        data: {
          ...n.data,
          // Si el usuario ya le asignó una forma manualmente (biographicalAttributes.shape), se usará esa en el componente
          computedShape: isCluster ? undefined : determineShape(n.id, storeEdges)
        },
        dragHandle: '.react-flow__node' // Usar todo el nodo, pero react-flow__node_interaction prioriza
      };
    });
    
    setNodes(rfNodes);
    nodesRef.current = rfNodes;
  }, [storeNodes, storeEdges]);

  useEffect(() => {
    const edgeGroups = new Map<string, typeof storeEdges>();
    storeEdges.forEach(e => {
      const pairId = [e.sourceNodeId, e.targetNodeId].sort().join('-');
      if (!edgeGroups.has(pairId)) edgeGroups.set(pairId, []);
      edgeGroups.get(pairId)!.push(e);
    });

    const rfEdges: RFEdge[] = [];
    
    edgeGroups.forEach((group) => {
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

        const taxRule = getTaxonomyRelation(e.semanticRelationshipType || '');

        rfEdges.push({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          type: 'parallel',
          animated: false,
          markerEnd: taxRule.arrow ? { type: MarkerType.ArrowClosed, color: taxRule.color } : undefined,
          data: {
            ...e.data,
            semanticRelationshipType: e.semanticRelationshipType,
            offsetIndex,
            isZigZag: e.semanticRelationshipType === 'Conflicto'
          }
        });
      });
    });

    setEdges(rfEdges);
  }, [storeEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const clusterDrags = changes.filter(c => c.type === 'position' && c.dragging);
      const extraChanges: NodeChange[] = [];
      
      clusterDrags.forEach(change => {
        if (change.type === 'position' && change.position) {
          const cluster = nds.find(n => n.id === change.id);
          if (cluster && cluster.type === 'cluster') {
            const dx = change.position.x - cluster.position.x;
            const dy = change.position.y - cluster.position.y;
            
            if (dx !== 0 || dy !== 0) {
              // Buscar a quién barrer (los que están dentro del clúster ANTES de aplicar el movimiento)
              const members = nds.filter(n => {
                if (n.type !== 'individual') return false;
                const cx = n.position.x + 40; // 40 es el offset al centro del nodo Individual (80x80)
                const cy = n.position.y + 40;
                return (
                  cx >= cluster.position.x &&
                  cx <= cluster.position.x + 400 &&
                  cy >= cluster.position.y &&
                  cy <= cluster.position.y + 400
                );
              });
              
              members.forEach(m => {
                extraChanges.push({
                  type: 'position',
                  id: m.id,
                  position: {
                    x: m.position.x + dx,
                    y: m.position.y + dy
                  },
                  dragging: true
                });
              });
            }
          }
        }
      });
      
      const newNodes = applyNodeChanges([...changes, ...extraChanges], nds);
      nodesRef.current = newNodes;
      return newNodes;
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target && params.source !== params.target) {
      addStoreEdge(params.source, params.target);
    }
  }, [addStoreEdge]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    setSelectedEntity(node.id, 'node');
  }, [setSelectedEntity]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: RFEdge) => {
    setSelectedEntity(edge.id, 'edge');
  }, [setSelectedEntity]);

  const onPaneClick = useCallback(() => {
    setSelectedEntity(null, null);
  }, [setSelectedEntity]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: RFNode) => {
    // 1. Guardar posición
    updateNodeData(node.id, { visualPosition: node.position });
    
    // 2. Si es un individuo, calcular en qué clústeres cae (Lógica Diagrama de Venn)
    if (node.type === 'individual') {
      const cx = node.position.x + 40;
      const cy = node.position.y + 40;
      
      const currentNodes = nodesRef.current;
      const overlappingClusters = currentNodes.filter(n => {
        if (n.type !== 'cluster') return false;
        return (
          cx >= n.position.x &&
          cx <= n.position.x + 400 &&
          cy >= n.position.y &&
          cy <= n.position.y + 400
        );
      }).map(c => c.id);
      
      updateNodeData(node.id, { clusterIds: overlappingClusters });
    }
  }, [updateNodeData]);

  return (
    <div className="w-full h-full bg-[#f8fafc]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        connectionMode={ConnectionMode.Loose}
        fitView
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
