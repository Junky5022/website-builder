import { useState } from 'react';
import { Upload, Library, Settings, Layers } from 'lucide-react';
import SourceInputPanel from '../input/SourceInputPanel';
import NodeLibraryPanel from '../canvas/NodeLibraryPanel';
import DesignTokenPanel from '../editor/DesignTokenPanel';
import SectionLayersPanel from '../canvas/SectionLayersPanel';

type Tab = 'source' | 'layers' | 'library' | 'tokens';

export default function LeftSidebar() {
  const [tab, setTab] = useState<Tab>('layers');

  const tabs: { id: Tab; icon: typeof Upload; label: string }[] = [
    { id: 'layers', icon: Layers, label: 'Sections' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'source', icon: Upload, label: 'Source' },
    { id: 'tokens', icon: Settings, label: 'Tokens' },
  ];

  return (
    <aside className="w-72 flex flex-col bg-slate-900 border-r border-slate-700 overflow-hidden flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition ${tab === id ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'layers' && <SectionLayersPanel />}
        {tab === 'library' && <NodeLibraryPanel />}
        {tab === 'source' && <SourceInputPanel />}
        {tab === 'tokens' && <DesignTokenPanel />}
      </div>
    </aside>
  );
}
