import { LayoutList, ScanLine, Plus } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useProjectStore } from '../../store/useProjectStore';

interface Props { onAutoLayout: () => void; }

export default function CanvasToolbar({ onAutoLayout }: Props) {
  const openPreview = useCanvasStore((s) => s.openPreview);
  const project = useProjectStore((s) => s.project);

  return (
    <div className="flex items-center gap-2 bg-white shadow-lg rounded-xl border border-slate-200 px-3 py-2 mt-2">
      <button
        onClick={onAutoLayout}
        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-1.5 transition"
      >
        <LayoutList className="w-4 h-4" />
        Auto Layout
      </button>
      <div className="w-px h-5 bg-slate-200" />
      <button
        onClick={openPreview}
        className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-3 py-1.5 transition"
      >
        <ScanLine className="w-4 h-4" />
        Generate Preview
      </button>
      {project && (
        <span className="text-xs text-slate-400 ml-2">
          {project.nodes.length} section{project.nodes.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
