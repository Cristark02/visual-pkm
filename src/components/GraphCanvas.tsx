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
import { getEdgeStyle } from '../lib/edgeStyles';

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
    if (type.includes('partner') && !type.includes('ex')) isPartner = true;
    if (type.includes('mentor')) isMentor = true;
    if (type.includes('parent') || type.includes('child')) isFamily = true;
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
        // Keep existing positions if already placed
        const existingNode = currentNodes.find(cn => cn.id === n.id);
        
        let x = 0;
        let y = 0;

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
    // Agrupamos aristas por el par de nodos sin importar la dirección
    const edgeGroups = new Map<string, typeof storeEdges>();
    
    storeEdges.forEach(e => {
      // Creamos un ID canónico ordenando alfabéticamente los nodos
      const canonicalId = [e.sourceNodeId, e.targetNodeId].sort().join('|');
      if (!edgeGroups.has(canonicalId)) {
        edgeGroups.set(canonicalId, []);
      }
      edgeGroups.get(canonicalId)!.push(e);
    });

    const rfEdges: RFEdge[] = [];
    
    edgeGroups.forEach(group => {
      const count = group.length;
      group.forEach((e, index) => {
        // Calcular offset para expandir las líneas en arcos paralelos
        // Si hay 1 línea: offset = 0
        // Si hay 2 líneas: offsets = -0.5, 0.5 (multiplicado luego)
        // Si hay 3 líneas: offsets = -1, 0, 1
        const offsetIndex = count === 1 ? 0 : (index - (count - 1) / 2);
        const isReversed = e.sourceNodeId > e.targetNodeId; // Para alinear el offset visualmente si se invierte el source/target
        const finalOffset = isReversed ? -offsetIndex : offsetIndex;

        const { stroke, strokeWidth, strokeDasharray, isZigZag } = getEdgeStyle(e.semanticRelationshipType || '');

        rfEdges.push({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          type: 'parallel', // Custom edge component
          animated: false,
          style: { stroke, strokeWidth, strokeDasharray },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
          },
          data: {
            offsetIndex: finalOffset,
            isZigZag,
            ...e.data
          }
        });
      });
    });

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  const { setSelectedEntity, addEdge } = useStore();

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
