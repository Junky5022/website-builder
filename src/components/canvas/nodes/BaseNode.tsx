import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { Copy, Trash2, EyeOff, Edit3, MoreHorizontal } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useCanvasStore } from '../../../store/useCanvasStore';
import type { DesignNodeData } from '../../../types/nodes';
import { NODE_SECTION_COLORS, NODE_SECTION_ICONS } from '../../../types/nodes';

interface Props {
  id: string;
  data: DesignNodeData;
  selected?: boolean;
  children?: React.ReactNode;
}

export default function BaseNode({ id, data, selected, children }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const deleteNodes = useProjectStore((s) => s.deleteNodes);
  const duplicateNode = useProjectStore((s) => s.duplicateNode);
  const updateNode = useProjectStore((s) => s.updateNode);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);
  const setSelectedNodeIds = useCanvasStore((s) => s.setSelectedNodeIds);

  const color = NODE_SECTION_COLORS[data.nodeType] ?? '#6366f1';
  const icon = NODE_SECTION_ICONS[data.nodeType] ?? '📄';

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-400',
    generated: 'bg-emerald-400',
    modified: 'bg-amber-400',
  };

  const handleEdit = () => {
    setSelectedNodeIds([id]);
    setShowMenu(false);
  };

  return (
    <div
      className={`relative w-72 rounded-xl shadow-lg border-2 bg-white transition-all ${
        selected ? 'border-indigo-500 shadow-indigo-200 shadow-xl' : 'border-slate-200 hover:border-slate-300'
      } ${data.hidden ? 'opacity-40' : ''}`}
      onDoubleClick={handleEdit}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl" style={{ backgroundColor: `${color}15`, borderBottom: `1px solid ${color}30` }}>
        <span className="text-base">{icon}</span>
        <span className="flex-1 font-semibold text-sm text-slate-800 truncate">{data.label}</span>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[data.status] ?? 'bg-slate-400'}`} title={data.status} />
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white/60 transition"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-44 py-1 text-sm">
              <button onClick={handleEdit} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-slate-700">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => { duplicateNode(id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-slate-700">
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              <button onClick={() => { updateNode(id, { hidden: !data.hidden }); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-slate-700">
                <EyeOff className="w-3.5 h-3.5" /> {data.hidden ? 'Show' : 'Hide'}
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button onClick={() => { deleteNodes([id]); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-500">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {children ?? (
          <div className="h-16 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs">
            Preview unavailable
          </div>
        )}
        {data.summary && (
          <p className="text-xs text-slate-500 mt-2 truncate">{data.summary}</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white" />
    </div>
  );
}
