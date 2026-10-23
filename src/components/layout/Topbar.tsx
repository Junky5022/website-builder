import {
  ChevronLeft,
  Save,
  Undo2,
  Redo2,
  Eye,
  Download,
  Key,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Layers,
  LayoutTemplate,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface Props { onBackToProjects: () => void; onManageApiKey?: () => void; }

export default function Topbar({ onBackToProjects, onManageApiKey }: Props) {
  const project = useProjectStore((s) => s.project);
  const isSaving = useProjectStore((s) => s.isSaving);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);
  const saveNow = useProjectStore((s) => s.saveNow);

  const openPreview = useCanvasStore((s) => s.openPreview);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);
  const deviceView = useCanvasStore((s) => s.deviceView);
  const setDeviceView = useCanvasStore((s) => s.setDeviceView);
  const zoomLevel = useCanvasStore((s) => s.zoomLevel);
  const setZoomLevel = useCanvasStore((s) => s.setZoomLevel);

  return (
    <header className="flex items-center h-12 px-4 bg-slate-900 border-b border-slate-700 gap-3 flex-shrink-0 z-50">
      {/* Back */}
      <button onClick={onBackToProjects} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm">
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Projects</span>
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <span className="font-semibold text-white text-sm hidden md:inline">Vibe Design Studio</span>
      </div>

      {/* Project name */}
      {project && (
        <div className="flex items-center gap-2">
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 text-sm font-medium truncate max-w-40">{project.name}</span>
          {isSaving ? (
            <span className="text-xs text-slate-500 animate-pulse">Saving…</span>
          ) : (
            <span className="text-xs text-slate-600">Saved</span>
          )}
        </div>
      )}

      {/* Center Canva-style view controls */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {/* Visual vs Flow toggle */}
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <button
            onClick={() => setViewMode('canvas')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'canvas' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
            title="Interactive Visual Page Editor (Canva mode)"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Page</span>
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'graph' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
            title="Flow Node Graph"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Nodes</span>
          </button>
        </div>

        {/* Breakpoints (when in visual mode) */}
        {viewMode === 'canvas' && (
          <div className="hidden sm:flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 rounded-md transition ${
                deviceView === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceView('tablet')}
              className={`p-1.5 rounded-md transition ${
                deviceView === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded-md transition ${
                deviceView === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Zoom controls */}
        {viewMode === 'canvas' && (
          <div className="hidden md:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-300" title="Ctrl + Scroll to zoom, Shift + Scroll to pan horizontally">
            <button
              onClick={() => setZoomLevel(Math.max(40, zoomLevel - 10))}
              className="hover:text-white"
              title="Zoom Out (Ctrl + Scroll Down)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="w-11 text-center font-mono text-[11px] hover:text-indigo-400 transition"
              title="Click to reset zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={() => setZoomLevel(Math.min(300, zoomLevel + 10))}
              className="hover:text-white"
              title="Zoom In (Ctrl + Scroll Up)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button onClick={() => undo()} disabled={past.length === 0} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition" title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={() => redo()} disabled={future.length === 0} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition" title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button onClick={saveNow} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition" title="Save">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={() => { openPreview(); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg px-3 py-1.5 transition ml-1">
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button onClick={() => setRightPanel('export')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        {onManageApiKey && (
          <button
            onClick={onManageApiKey}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
            title="Update Gemini API Key"
          >
            <Key className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
