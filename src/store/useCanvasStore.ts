import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface CanvasStore {
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  addSelectedNodeId: (id: string) => void;
  clearSelection: () => void;

  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  toggleSelectedElementId: (id: string) => void;
  hoveredElementId: string | null;
  setHoveredElementId: (id: string | null) => void;

  selectedDomContext: {
    tagName: string;
    text: string;
    selector?: string;
  } | null;
  setSelectedDomContext: (ctx: CanvasStore['selectedDomContext']) => void;

  viewMode: 'canvas' | 'graph';
  setViewMode: (m: 'canvas' | 'graph') => void;

  deviceView: 'desktop' | 'tablet' | 'mobile';
  setDeviceView: (d: 'desktop' | 'tablet' | 'mobile') => void;

  zoomLevel: number;
  setZoomLevel: (z: number) => void;

  isPreviewOpen: boolean;
  openPreview: () => void;
  closePreview: () => void;

  isAnalyzing: boolean;
  setAnalyzing: (v: boolean) => void;

  analyzeProgress: string;
  setAnalyzeProgress: (msg: string) => void;

  rightPanel: 'chat' | 'export';
  setRightPanel: (p: CanvasStore['rightPanel']) => void;
}

export const useCanvasStore = create<CanvasStore>()(
  immer((set) => ({
    selectedNodeIds: [],
    setSelectedNodeIds: (ids) => set((s) => { s.selectedNodeIds = ids; }),
    addSelectedNodeId: (id) => set((s) => { if (!s.selectedNodeIds.includes(id)) s.selectedNodeIds.push(id); }),
    clearSelection: () => set((s) => { s.selectedNodeIds = []; s.selectedElementId = null; s.selectedElementIds = []; }),

    selectedElementId: null,
    setSelectedElementId: (id) => set((s) => {
      s.selectedElementId = id;
      s.selectedElementIds = id ? [id] : [];
    }),
    selectedElementIds: [],
    setSelectedElementIds: (ids) => set((s) => {
      s.selectedElementIds = ids;
      s.selectedElementId = ids[ids.length - 1] ?? null;
    }),
    toggleSelectedElementId: (id) => set((s) => {
      if (s.selectedElementIds.includes(id)) {
        s.selectedElementIds = s.selectedElementIds.filter((x) => x !== id);
      } else {
        s.selectedElementIds.push(id);
      }
      s.selectedElementId = s.selectedElementIds[s.selectedElementIds.length - 1] ?? null;
    }),
    hoveredElementId: null,
    setHoveredElementId: (id) => set((s) => { s.hoveredElementId = id; }),

    selectedDomContext: null,
    setSelectedDomContext: (ctx) => set((s) => { s.selectedDomContext = ctx; }),

    viewMode: 'canvas',
    setViewMode: (m) => set((s) => { s.viewMode = m; }),

    deviceView: 'desktop',
    setDeviceView: (d) => set((s) => { s.deviceView = d; }),

    zoomLevel: 100,
    setZoomLevel: (z) => set((s) => { s.zoomLevel = z; }),

    isPreviewOpen: false,
    openPreview: () => set((s) => { s.isPreviewOpen = true; }),
    closePreview: () => set((s) => { s.isPreviewOpen = false; }),

    isAnalyzing: false,
    setAnalyzing: (v) => set((s) => { s.isAnalyzing = v; }),

    analyzeProgress: '',
    setAnalyzeProgress: (msg) => set((s) => { s.analyzeProgress = msg; }),

    rightPanel: 'chat',
    setRightPanel: (p) => set((s) => { s.rightPanel = p; }),
  }))
);
