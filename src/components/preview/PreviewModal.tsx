import { useState } from 'react';
import { X, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useProjectStore } from '../../store/useProjectStore';
import { getOrderedNodes } from '../../services/analyzer/nodeGenerator';
import { RenderSectionLive } from '../canvas/InteractiveVisualCanvas';
import LiveDomCanvas from '../canvas/LiveDomCanvas';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

const WIDTHS: Record<Breakpoint, string> = {
  desktop: '1200px',
  tablet: '768px',
  mobile: '390px',
};

export default function PreviewModal() {
  const closePreview = useCanvasStore((s) => s.closePreview);
  const project = useProjectStore((s) => s.project);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  if (!project) return null;

  const orderedNodes = getOrderedNodes(project.nodes, project.edges).filter(
    (n) => !n.data.hidden
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Live Preview</span>
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            {([
              { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
              { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
              { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setBreakpoint(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  breakpoint === id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">{WIDTHS[breakpoint]}</span>
        </div>

        <button
          onClick={closePreview}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
        >
          <X className="w-4 h-4" /> Close Preview
        </button>
      </div>

      {/* Preview area — renders the exact same component tree as the editing canvas */}
      <div className="flex-1 overflow-y-auto bg-slate-900 flex justify-center py-8 px-4">
        <div
          className="bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 w-full flex flex-col"
          style={{ maxWidth: WIDTHS[breakpoint], minHeight: '800px' }}
        >
          {project.clonedPageHtml ? (
            <LiveDomCanvas html={project.clonedPageHtml} readOnly />
          ) : (
            orderedNodes.map((node) => {
              const sectionData = project.sectionData[node.data.sectionDataId];
              if (!sectionData) return null;
              return (
                <RenderSectionLive
                  key={node.id}
                  sectionData={sectionData}
                  sectionId={node.data.sectionDataId}
                  tokens={project.tokens}
                  readOnly
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
