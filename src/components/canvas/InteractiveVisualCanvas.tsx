import { useState, useRef, useEffect } from 'react';

// ─── Safe string coercion — prevents React child object crashes ───────────────
function safeStr(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    // {url, alt} image reference used as text field
    if (typeof o.alt === 'string' && o.alt) return o.alt;
    if (typeof o.text === 'string' && o.text) return o.text;
    if (typeof o.label === 'string' && o.label) return o.label;
    if (typeof o.name === 'string' && o.name) return o.name;
    if (typeof o.value === 'string' && o.value) return o.value;
    if (typeof o.content === 'string' && o.content) return o.content;
    if (typeof o.title === 'string' && o.title) return o.title;
  }
  return fallback;
}

function safeArr<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  EyeOff,
  Eye,
  Edit3,
  Maximize2,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getOrderedNodes } from '../../services/analyzer/nodeGenerator';
import { NODE_SECTION_LABELS, NODE_SECTION_ICONS } from '../../types/nodes';
import type { DesignNode } from '../../types/nodes';
import type { SectionData } from '../../types/sections';
import { tokensToCssVars } from '../../types/design-tokens';
import SandboxElementRenderer from './SandboxElementRenderer';
import AddElementMenu from './AddElementMenu';
import LiveDomCanvas from './LiveDomCanvas';
import { sectionDataToElements, createElement } from '../../services/analyzer/elementConverter';

export default function InteractiveVisualCanvas() {
  const project = useProjectStore((s) => s.project);
  const setNodes = useProjectStore((s) => s.setNodes);
  const setEdges = useProjectStore((s) => s.setEdges);
  const deleteNodes = useProjectStore((s) => s.deleteNodes);
  const duplicateNode = useProjectStore((s) => s.duplicateNode);
  const updateNode = useProjectStore((s) => s.updateNode);
  const updateSectionData = useProjectStore((s) => s.updateSectionData);
  const pushHistory = useProjectStore((s) => s.pushHistory);

  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useCanvasStore((s) => s.setSelectedNodeIds);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);
  const deviceView = useCanvasStore((s) => s.deviceView);
  const zoomLevel = useCanvasStore((s) => s.zoomLevel);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Canva-style Wheel Navigation on the outer canvas container:
  // - Ctrl + Wheel = Zoom In / Out
  // - Shift + Wheel = Horizontal Scroll
  // - Regular Wheel = Vertical Scroll
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const currentZoom = useCanvasStore.getState().zoomLevel;
        const delta = e.deltaY < 0 ? 10 : -10;
        const nextZoom = Math.min(300, Math.max(40, currentZoom + delta));
        useCanvasStore.getState().setZoomLevel(nextZoom);
        return;
      }
      if (e.shiftKey) {
        e.preventDefault();
        const scrollDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        el.scrollLeft += scrollDelta;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const z = useCanvasStore.getState().zoomLevel;
          useCanvasStore.getState().setZoomLevel(Math.min(300, z + 15));
        } else if (e.key === '-') {
          e.preventDefault();
          const z = useCanvasStore.getState().zoomLevel;
          useCanvasStore.getState().setZoomLevel(Math.max(40, z - 15));
        } else if (e.key === '0') {
          e.preventDefault();
          useCanvasStore.getState().setZoomLevel(100);
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-900 text-slate-400">
        <p>No project loaded</p>
      </div>
    );
  }

  const orderedNodes = getOrderedNodes(project.nodes, project.edges);

  // Device width constraints for Canva-style device preview
  const deviceWidthMap = {
    desktop: '1200px',
    tablet: '768px',
    mobile: '390px',
  };

  if (project.clonedPageHtml) {
    return (
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-hidden bg-slate-950 flex flex-col items-center py-4 px-4"
        onClick={(e) => {
          // If clicking outside the iframe container (on the slate backdrop), clear selection
          if (e.target === e.currentTarget) {
            useCanvasStore.getState().clearSelection();
          }
        }}
      >
        <div
          className="transition-all duration-300 w-full h-full flex flex-col items-center"
          style={{
            maxWidth: deviceWidthMap[deviceView],
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              useCanvasStore.getState().clearSelection();
            }
          }}
        >
          <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden border border-slate-800 bg-white flex flex-col">
            <LiveDomCanvas html={project.clonedPageHtml} />
          </div>
        </div>
      </div>
    );
  }

  if (orderedNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-900">
        <div className="text-center max-w-md p-8 border border-slate-800 rounded-3xl bg-slate-950/60 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 text-3xl">
            ✨
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Visual Page Canvas</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Paste a URL, drop a screenshot, or pick sections from the Library on the left. The live editable webpage will appear right here instantly.
          </p>
        </div>
      </div>
    );
  }

  const reorderNodes = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= orderedNodes.length || toIndex >= orderedNodes.length) {
      return;
    }
    pushHistory();
    const reordered = [...orderedNodes];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Rebuild edges to mirror order
    const newEdges = reordered.slice(1).map((node, idx) => ({
      id: `e-${reordered[idx].id}-${node.id}`,
      source: reordered[idx].id,
      target: node.id,
      type: 'smoothstep',
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }));

    setNodes(reordered);
    setEdges(newEdges);
  };

  const moveNode = (nodeId: string, direction: 'up' | 'down') => {
    const idx = orderedNodes.findIndex((n) => n.id === nodeId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    reorderNodes(idx, targetIdx);
  };

  const handleSelect = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedNodeIds([nodeId]);
  };

  const scale = zoomLevel / 100;
  const baseWidthPx = deviceView === 'desktop' ? 1200 : deviceView === 'tablet' ? 768 : 390;

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full overflow-auto bg-slate-950 py-8 px-4"
      onClick={() => setSelectedNodeIds([])}
    >
      {/* Pure Camera Zoom Wrapper — scales visually like a camera lens without ever changing page layout */}
      <div
        className="mx-auto relative"
        style={{
          width: `${Math.round(baseWidthPx * scale)}px`,
        }}
      >
        <div
          className="transition-transform duration-150 origin-top-left"
          style={{
            width: `${baseWidthPx}px`,
            transform: `scale(${scale})`,
          }}
        >
        <div
          className="w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-800 transition-all bg-white"
          style={{
            minHeight: '800px',
          }}
        >
          {orderedNodes.map((node, index) => {
            const isSelected = selectedNodeIds.includes(node.id);
            const isHovered = hoveredNodeId === node.id;
            const sectionData = project.sectionData[node.data.sectionDataId];
            const isHidden = node.data.hidden;

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(e) => handleSelect(node.id, e)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                    if (!raw) return;
                    const data = JSON.parse(raw);
                    if (data.type === 'section' && draggedNodeId && draggedNodeId !== node.id) {
                      const fromIdx = orderedNodes.findIndex((n) => n.id === draggedNodeId);
                      const toIdx = index;
                      reorderNodes(fromIdx, toIdx);
                      setDraggedNodeId(null);
                    } else if (data.type === 'element') {
                      useProjectStore.getState().moveElementTo(
                        data.sourceSectionId,
                        data.elementId,
                        node.data.sectionDataId
                      );
                    } else if (data.type === 'new-element' && data.elementType) {
                      const newEl = createElement(data.elementType);
                      useProjectStore.getState().addElement(node.data.sectionDataId, newEl);
                      useCanvasStore.getState().setSelectedElementId(newEl.id);
                    }
                  } catch (err) {
                    if (draggedNodeId && draggedNodeId !== node.id) {
                      const fromIdx = orderedNodes.findIndex((n) => n.id === draggedNodeId);
                      reorderNodes(fromIdx, index);
                      setDraggedNodeId(null);
                    }
                  }
                }}
                className={`relative group transition-all duration-150 ${
                  isHidden ? 'opacity-30' : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-indigo-500/50 ring-inset'
                    : ''
                }`}
                data-section-id={node.id}
              >
                {/* Section Content Render */}
                <div className="w-full select-none cursor-pointer">
                  {sectionData ? (
                    <RenderSectionLive
                      sectionData={sectionData}
                      sectionId={node.data.sectionDataId}
                      tokens={project.tokens}
                    />
                  ) : (
                    <div className="p-8 text-center bg-slate-100 text-slate-400 text-xs">
                      Section data missing
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modular Sandbox Section Renderer ───────────────────────────────────────

function isDarkHex(color?: string): boolean {
  if (!color || !color.startsWith('#')) return false;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.45;
}

export function RenderSectionLive({
  sectionData,
  sectionId,
  tokens,
  readOnly = false,
}: {
  sectionData: SectionData;
  sectionId: string;
  tokens: import('../../types/design-tokens').DesignTokens;
  readOnly?: boolean;
}) {
  const { colors, typography } = tokens;
  const fontBody = `'${typography.bodyFont}', system-ui, sans-serif`;

  // Retrieve or generate modular element tree
  const elements = (sectionData.elements && sectionData.elements.length > 0)
    ? sectionData.elements
    : sectionDataToElements(sectionData);

  // Persist generated elements once so IDs stay stable across renders
  useEffect(() => {
    if (!readOnly && (!sectionData.elements || sectionData.elements.length === 0)) {
      useProjectStore.getState().setElements(sectionId, elements);
    }
  }, [sectionId, sectionData.elements, readOnly]);

  const bgColor = sectionData.background?.color || (sectionData.type === 'footer' ? '#0f172a' : colors.background);
  const darkBg = sectionData.type === 'footer' || isDarkHex(bgColor);
  const textColor = darkBg ? '#f8fafc' : colors.text;
  const isHeader = sectionData.type === 'header';
  const padTop = sectionData.spacing?.paddingTop !== undefined ? `${sectionData.spacing.paddingTop}rem` : isHeader ? '1rem' : '3.5rem';
  const padBottom = sectionData.spacing?.paddingBottom !== undefined ? `${sectionData.spacing.paddingBottom}rem` : isHeader ? '1rem' : '3.5rem';

  const hasFloats = elements.some(
    (el) => el.style?.wrapMode === 'left' || el.style?.wrapMode === 'right'
  );

  return (
    <div
      className={`w-full relative transition ${
        isHeader ? 'px-8 border-b border-black/10' : 'px-8'
      }`}
      style={{
        backgroundColor: bgColor,
        backgroundImage: sectionData.background?.imageUrl
          ? `linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.55)), url(${sectionData.background.imageUrl})`
          : sectionData.background?.gradient || undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: textColor,
        fontFamily: fontBody,
        paddingTop: padTop,
        paddingBottom: padBottom,
      }}
    >
      <div
        className={`max-w-6xl mx-auto ${
          isHeader
            ? 'flex items-center justify-between gap-6 flex-wrap'
            : hasFloats
            ? 'block after:content-[\'\'] after:table after:clear-both'
            : 'flex flex-col gap-6'
        }`}
      >
        {elements.map((el) => (
          <SandboxElementRenderer
            key={el.id}
            element={el}
            sectionId={sectionId}
            tokens={tokens}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Floating Add Element Bar at bottom of section */}
      {!readOnly && (
        <div className="max-w-5xl mx-auto mt-6 pt-3 border-t border-dashed border-slate-300/60 flex items-center justify-center opacity-30 hover:opacity-100 transition">
          <AddElementMenu
            sectionId={sectionId}
            buttonLabel="+ Add Element to Section"
          />
        </div>
      )}
    </div>
  );
}
