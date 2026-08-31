import { useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  ConnectionMode,
  MarkerType
} from 'reactflow';
import type { Node as RFNode, Edge as RFEdge } from 'reactflow';
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

// Heurística simple para determinar la forma
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
  const { nodes: storeNodes, edges: storeEdges } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Sync store nodes to RF nodes
    setNodes((currentNodes) => {
      const rfNodes: RFNode[] = storeNodes.map((n, i) => {
        // Priorizar la posición guardada en JSON
        let x = n.data.visualPosition?.x;
        let y = n.data.visualPosition?.y;

        if (x === undefined || y === undefined) {
          // Keep existing positions if already placed in session
          const existingNode = currentNodes.find(cn => cn.id === n.id);
          
          if (existingNode) {
            x = existingNode.position.x;
            y = existingNode.position.y;
          } else if (i === 0) {
            // Usuario en el centro
            x = 0;
            y = 0;
          } else {
            // Distribución radial o floral
            const radiusStep = 180;
            const nodesPerRing = 8;
            
            const ringIndex = Math.floor((i - 1) / nodesPerRing) + 1;
            const indexInRing = (i - 1) % nodesPerRing;
            
            const currentRadius = ringIndex * radiusStep;
            const angleStep = (2 * Math.PI) / nodesPerRing;
            
            // Añadir un pequeño offset para que los anillos se entrelacen
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
          parentNode: n.logicalParentNode,
          extent: n.logicalParentNode ? 'parent' : undefined,
          style: isCluster ? { width: 400, height: 400, zIndex: -1 } : { zIndex: 1 },
          data: {
            ...n.data,
            computedShape: isCluster ? undefined : determineShape(n.id, storeEdges)
          }
        };
      });
      return rfNodes;
    });

    // 2. Cálculo de Aristas Paralelas
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
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  const { setSelectedEntity, addEdge, updateNodeData } = useStore();

  const onNodeClick = (_: React.MouseEvent, node: RFNode) => {
    setSelectedEntity(node.id, 'node');
  };

  const onEdgeClick = (_: React.MouseEvent, edge: RFEdge) => {
    setSelectedEntity(edge.id, 'edge');
  };

  const onPaneClick = () => {
    setSelectedEntity(null, null);
  };
  
  const onConnect = (params: any) => {
    if (params.source && params.target) {
      addEdge(params.source, params.target);
    }
  };

  const onNodeDragStop = (_: React.MouseEvent, node: RFNode) => {
    updateNodeData(node.id, { visualPosition: node.position });
  };

  return (
    <div className="w-full h-full bg-gray-50">
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
      >
        <Background color="#ccc" gap={16} />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
