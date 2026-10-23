import { MessageSquare, Download } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import AIChatPanel from '../ai/AIChatPanel';
import ExportPanel from '../export/ExportPanel';

export default function RightSidebar() {
  const rightPanel = useCanvasStore((s) => s.rightPanel);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);

  type Panel = 'chat' | 'export';
  const tabs: { id: Panel; icon: typeof MessageSquare; label: string }[] = [
    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
    { id: 'export', icon: Download, label: 'Export' },
  ];

  return (
    <aside className="w-80 flex flex-col bg-slate-900 border-l border-slate-700 overflow-hidden flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setRightPanel(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition relative ${
              rightPanel === id
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {rightPanel === 'export' ? <ExportPanel /> : <AIChatPanel />}
      </div>
    </aside>
  );
}
