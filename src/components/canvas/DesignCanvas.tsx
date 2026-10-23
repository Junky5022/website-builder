import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { autoLayoutNodes } from '../../services/analyzer/nodeGenerator';
import CanvasToolbar from './CanvasToolbar';
import HeaderNode from './nodes/HeaderNode';
import HeroNode from './nodes/HeroNode';
import FeaturesNode from './nodes/FeaturesNode';
import ImageTextNode from './nodes/ImageTextNode';
import GalleryNode from './nodes/GalleryNode';
import TestimonialsNode from './nodes/TestimonialsNode';
import PricingNode from './nodes/PricingNode';
import FaqNode from './nodes/FaqNode';
import CtaNode from './nodes/CtaNode';
import FooterNode from './nodes/FooterNode';

const nodeTypes: NodeTypes = {
  header: HeaderNode,
  hero: HeroNode,
  features: FeaturesNode,
  imageText: ImageTextNode,
  gallery: GalleryNode,
  testimonials: TestimonialsNode,
  pricing: PricingNode,
  faq: FaqNode,
  cta: CtaNode,
  footer: FooterNode,
};

export default function DesignCanvas() {
  const project = useProjectStore((s) => s.project);
  const setNodes = useProjectStore((s) => s.setNodes);
  const setEdges = useProjectStore((s) => s.setEdges);
  const setSelectedNodeIds = useCanvasStore((s) => s.setSelectedNodeIds);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);

  const nodes = project?.nodes ?? [];
  const edges = project?.edges ?? [];

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: '#6366f1' },
      };
      setEdges([...edges, newEdge] as any);
    },
    [edges, setEdges]
  );

  const onNodesChange = useCallback(
    (changes: any[]) => {
      const updated = nodes.map((n) => {
        const change = changes.find((c) => c.id === n.id);
        if (!change) return n;
        if (change.type === 'position' && change.position) {
          return { ...n, position: change.position };
        }
        if (change.type === 'select') {
          return { ...n, selected: change.selected };
        }
        return n;
      }).filter((n) => {
        const removeChange = changes.find((c) => c.id === n.id && c.type === 'remove');
        return !removeChange;
      });
      setNodes(updated as any);
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: any[]) => {
      const updated = edges.filter((e) => {
        const removeChange = changes.find((c) => c.id === e.id && c.type === 'remove');
        return !removeChange;
      });
      setEdges(updated as any);
    },
    [edges, setEdges]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: any[] }) => {
      const ids = selectedNodes.map((n) => n.id);
      setSelectedNodeIds(ids);
    },
    [setSelectedNodeIds]
  );

  const onAutoLayout = useCallback(() => {
    const { nodes: laid, edges: newEdges } = autoLayoutNodes(nodes as any);
    setNodes(laid as any);
    setEdges(newEdges as any);
  }, [nodes, setNodes, setEdges]);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100">
        <div className="text-center text-slate-400">
          <p className="text-lg font-medium">No project loaded</p>
          <p className="text-sm mt-1">Go back and select or create a project</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 h-full">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Start your design</h2>
          <p className="text-slate-500 text-sm mb-4">
            Use the left sidebar to analyze a URL, upload screenshots, or paste HTML to generate your first design. Or add sections from the Library tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes as any}
        edges={edges as any}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
      >
        <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} size={1} />
        <Controls className="rounded-xl overflow-hidden shadow-lg" />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(15,23,42,0.6)"
          className="rounded-xl overflow-hidden shadow-lg"
        />
        <Panel position="top-center">
          <CanvasToolbar onAutoLayout={onAutoLayout} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
