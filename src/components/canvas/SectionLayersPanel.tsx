import { GripVertical, ChevronUp, ChevronDown, Copy, Eye, EyeOff, Trash2, Edit3, Layers } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { NODE_SECTION_ICONS, NODE_SECTION_COLORS } from '../../types/nodes';
import { useState } from 'react';

function safeStr(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    if (typeof o.label === 'string' && o.label) return o.label;
    if (typeof o.name === 'string' && o.name) return o.name;
    if (typeof o.title === 'string' && o.title) return o.title;
  }
  return fallback;
}

export default function SectionLayersPanel() {
  const project = useProjectStore((s) => s.project);
  const moveNode = useProjectStore((s) => s.moveNode);
  const duplicateNode = useProjectStore((s) => s.duplicateNode);
  const updateNode = useProjectStore((s) => s.updateNode);
  const deleteNodes = useProjectStore((s) => s.deleteNodes);

  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useCanvasStore((s) => s.setSelectedNodeIds);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);

  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  if (!project || project.nodes.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
        <p className="text-sm font-medium text-slate-400">No sections yet</p>
        <p className="text-xs text-slate-500 mt-1">Add sections from the Library or analyze a webpage.</p>
      </div>
    );
  }

  const nodes = [...project.nodes].sort((a, b) => a.position.y - b.position.y);

  const handleSelect = (nodeId: string) => {
    setSelectedNodeIds([nodeId]);
    // Scroll section into view if it exists on canvas
    const elem = document.querySelector(`[data-section-id="${nodeId}"]`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('text/plain', nodeId);
    setDraggedNodeId(nodeId);
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    if (draggedNodeId && draggedNodeId !== nodeId) {
      setDragOverNodeId(nodeId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    setDragOverNodeId(null);
    if (!draggedNodeId || draggedNodeId === targetNodeId) return;

    const sourceIndex = nodes.findIndex((n) => n.id === draggedNodeId);
    const targetIndex = nodes.findIndex((n) => n.id === targetNodeId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Use moveNode steps
    const steps = targetIndex - sourceIndex;
    if (steps > 0) {
      for (let i = 0; i < steps; i++) {
        moveNode(draggedNodeId, 'down');
      }
    } else {
      for (let i = 0; i < Math.abs(steps); i++) {
        moveNode(draggedNodeId, 'up');
      }
    }
    setDraggedNodeId(null);
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Page Sections</p>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
          {nodes.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {nodes.map((node, index) => {
          const isSelected = selectedNodeIds.includes(node.id);
          const isHidden = !!node.data?.hidden;
          const icon = NODE_SECTION_ICONS[node.data.nodeType] || '📄';
          const color = NODE_SECTION_COLORS[node.data.nodeType] || '#6366f1';
          const isDragTarget = dragOverNodeId === node.id;

          return (
            <div
              key={node.id}
              draggable
              onDragStart={(e) => handleDragStart(e, node.id)}
              onDragOver={(e) => handleDragOver(e, node.id)}
              onDragLeave={() => setDragOverNodeId(null)}
              onDrop={(e) => handleDrop(e, node.id)}
              onClick={() => handleSelect(node.id)}
              className={`group flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              } ${isHidden ? 'opacity-50' : ''} ${isDragTarget ? 'border-t-2 border-t-indigo-400' : ''}`}
            >
              {/* Drag Handle */}
              <div
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 -ml-0.5 p-0.5"
                title="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Icon */}
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                {icon}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-white">
                  {safeStr(node.data?.label, 'Section')}
                </p>
                <span className="text-[10px] text-slate-500 uppercase tracking-tight">
                  {node.data?.nodeType}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveNode(node.id, 'up');
                  }}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20"
                  title="Move Up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveNode(node.id, 'down');
                  }}
                  disabled={index === nodes.length - 1}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20"
                  title="Move Down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateNode(node.id);
                  }}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                  title="Duplicate Section"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateNode(node.id, { hidden: !isHidden });
                  }}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                  title={isHidden ? 'Show Section' : 'Hide Section'}
                >
                  {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNodes([node.id]);
                  }}
                  className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                  title="Delete Section"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
