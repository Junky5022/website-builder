import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { AIChange } from '../../types/ai';

interface Props { change: AIChange; }

export default function ChangePreview({ change }: Props) {
  const [expanded, setExpanded] = useState(false);
  const applyChange = useProjectStore((s) => s.applyChange);
  const discardChange = useProjectStore((s) => s.discardChange);

  const hasPatch = Object.keys(change.patch ?? {}).length > 0;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden">
      <div className="flex items-start gap-2 p-3">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-200">{change.description}</p>
          {hasPatch && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-amber-400/70 hover:text-amber-300 mt-1 flex items-center gap-1 transition">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Show'} details
            </button>
          )}
          {expanded && hasPatch && (
            <pre className="text-xs text-slate-400 bg-slate-900 rounded-lg p-2 mt-2 overflow-x-auto max-h-32">
              {JSON.stringify(change.patch, null, 2)}
            </pre>
          )}
        </div>
      </div>
      <div className="flex border-t border-amber-500/20">
        <button
          onClick={() => applyChange(change.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Apply
        </button>
        <div className="w-px bg-amber-500/20" />
        <button
          onClick={() => discardChange(change.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
        >
          <XCircle className="w-3.5 h-3.5" /> Discard
        </button>
      </div>
    </div>
  );
}
