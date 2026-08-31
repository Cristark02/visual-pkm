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
  EdgeChange,
  NodePositionChange
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
  const w1 = n1.data?.visualDimensions?.width || 400;
  const h1 = n1.data?.visualDimensions?.height || 400;
  const w2 = n2.data?.visualDimensions?.width || 400;
  const h2 = n2.data?.visualDimensions?.height || 400;
  
  return (
    n1.position.x < n2.position.x + w2 &&
    n1.position.x + w1 > n2.position.x &&
    n1.position.y < n2.position.y + h2 &&
    n1.position.y + h1 > n2.position.y
  );
};

const isInside = (individual: RFNode, cluster: RFNode) => {
  const cx = individual.position.x + 40;
  const cy = individual.position.y + 40;
  const cw = cluster.data?.visualDimensions?.width || 400;
  const ch = cluster.data?.visualDimensions?.height || 400;
  
  return (
    cx >= cluster.position.x &&
    cx <= cluster.position.x + cw &&
    cy >= cluster.position.y &&
    cy <= cluster.position.y + ch
  );
};

export default function GraphCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setSelectedEntity, addEdge: addStoreEdge, updateNodeData } = useStore();
  
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);

  const nodesRef = useRef<RFNode[]>([]);
  
  // Ref para capturar el estado inicial de un drag
  const dragContext = useRef<{ active: boolean, clusterIds: string[], memberIds: string[] }>({ active: false, clusterIds: [], memberIds: [] });

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
      const w = n.data.visualDimensions?.width || (isCluster ? 400 : 80);
      const h = n.data.visualDimensions?.height || (isCluster ? 400 : 80);

      return {
        id: n.id,
        type: n.type,
        position: { x, y },
        style: isCluster ? { width: w, height: h, zIndex: -1 } : { width: w, height: h, zIndex: 1 },
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

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: RFNode) => {
    if (node.type === 'cluster') {
      const allClusters = nodesRef.current.filter(n => n.type === 'cluster');
      const connectedClusters = new Set<string>([node.id]);
      
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
      const clusterDrags = changes.filter(c => c.type === 'position' && c.dragging) as NodePositionChange[];
      const extraChanges: NodeChange[] = [];
      
      // Dimension changes processing (NodeResizer)
      changes.filter(c => c.type === 'dimensions').forEach((dimChange: any) => {
        if (dimChange.dimensions) {
          updateNodeData(dimChange.id, { visualDimensions: dimChange.dimensions });
        }
      });

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
      
      const newNodes = applyNodeChanges([...changes, ...extraChanges], nds);
      nodesRef.current = newNodes;
      return newNodes;
    });
  }, [updateNodeData]);

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
    const currentNodes = nodesRef.current;

    // Guardar posiciones de todos los que se hayan movido
    if (dragContext.current.active) {
      const movedIds = new Set([...dragContext.current.clusterIds, ...dragContext.current.memberIds, node.id]);
      movedIds.forEach(id => {
        const n = currentNodes.find(x => x.id === id);
        if (n) updateNodeData(id, { visualPosition: n.position });
      });
      dragContext.current.active = false;
    } else {
      updateNodeData(node.id, { visualPosition: node.position });
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
        if (oldIds.length !== overlappingClusters.length || !oldIds.every(id => overlappingClusters.includes(id))) {
          updateNodeData(n.id, { clusterIds: overlappingClusters });
        }
      }
    });
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
        onNodeDragStart={onNodeDragStart}
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
