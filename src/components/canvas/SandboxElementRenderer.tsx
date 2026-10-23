import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Trash2,
  Edit3,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  WrapText,
  ChevronRight,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  Group,
  Ungroup,
} from 'lucide-react';
import type { CanvasElement, TextWrapMode } from '../../types/elements';
import { ELEMENT_TYPE_ICONS, ELEMENT_TYPE_LABELS } from '../../types/elements';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useProjectStore } from '../../store/useProjectStore';
import { createElement } from '../../services/analyzer/elementConverter';
import ElementToolbar from './ElementToolbar';

interface Props {
  element: CanvasElement;
  sectionId: string;
  tokens: import('../../types/design-tokens').DesignTokens;
  readOnly?: boolean;
}

export default function SandboxElementRenderer({
  element,
  sectionId,
  tokens,
  readOnly = false,
}: Props) {
  const selectedElementId = useCanvasStore((s) => s.selectedElementId);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const setSelectedElementIds = useCanvasStore((s) => s.setSelectedElementIds);
  const toggleSelectedElementId = useCanvasStore((s) => s.toggleSelectedElementId);
  const hoveredElementId = useCanvasStore((s) => s.hoveredElementId);
  const setHoveredElementId = useCanvasStore((s) => s.setHoveredElementId);
  const project = useProjectStore((s) => s.project);
  const updateElement = useProjectStore((s) => s.updateElement);
  const duplicateElement = useProjectStore((s) => s.duplicateElement);
  const deleteElement = useProjectStore((s) => s.deleteElement);
  const moveElement = useProjectStore((s) => s.moveElement);
  const moveElementTo = useProjectStore((s) => s.moveElementTo);
  const addElement = useProjectStore((s) => s.addElement);
  const pushHistory = useProjectStore((s) => s.pushHistory);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isEditingInline, setIsEditingInline] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [liveOffset, setLiveOffset] = useState<{ x: number; y: number; freeform?: boolean; snapLabel?: string } | null>(null);
  const [snapGuideLines, setSnapGuideLines] = useState<{ v?: boolean; h?: boolean }>({});
  const [isResizing, setIsResizing] = useState(false);
  const [liveDimensions, setLiveDimensions] = useState<{ width: number; height: number } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<'before' | 'after' | 'inside' | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    subMenu?: 'style' | 'layer' | 'wrap' | 'icon' | null;
  } | null>(null);

  const isPrimarySelected = selectedElementId === element.id;
  const isSelected = isPrimarySelected || selectedElementIds.includes(element.id);
  const isHovered = hoveredElementId === element.id && !isSelected;

  // Helper to collect all element IDs in the current section that share a groupId
  const getGroupMemberIds = (grpId?: string): string[] => {
    if (!grpId || !project) return [element.id];
    const sec = project.sectionData[sectionId];
    const list: string[] = [];
    const walk = (els?: CanvasElement[]) => {
      if (!els) return;
      for (const item of els) {
        if (item.groupId === grpId) list.push(item.id);
        if (item.children) walk(item.children);
      }
    };
    walk(sec?.elements);
    return list.length > 0 ? list : [element.id];
  };

  // Close context menu when element is deselected or user clicks outside
  useEffect(() => {
    if (!isSelected) {
      setContextMenu(null);
    }
  }, [isSelected]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const { colors, typography, spacing } = tokens;
  const fontHeading = `'${typography.headingFont}', system-ui, sans-serif`;
  const fontBody = `'${typography.bodyFont}', system-ui, sans-serif`;

  const storedX = element.style?.freeX || 0;
  const storedY = element.style?.freeY || 0;
  const effectiveX = liveOffset ? liveOffset.x : storedX;
  const effectiveY = liveOffset ? liveOffset.y : storedY;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      toggleSelectedElementId(element.id);
      return;
    }
    if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
      return;
    }
    if (element.groupId) {
      setSelectedElementIds(getGroupMemberIds(element.groupId));
    } else {
      setSelectedElementId(element.id);
    }
  };

  // Canva-style Right-Click Context Menu on any element
  const handleContextMenu = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    if (!selectedElementIds.includes(element.id)) {
      if (element.groupId) {
        setSelectedElementIds(getGroupMemberIds(element.groupId));
      } else {
        setSelectedElementId(element.id);
      }
    }

    const rect = wrapperRef.current?.getBoundingClientRect();
    const relX = rect ? Math.min(Math.max(0, e.clientX - rect.left), 220) : 16;
    const relY = rect ? Math.max(0, e.clientY - rect.top) : 16;
    setContextMenu({ x: relX, y: relY, subMenu: null });
  };

  const handleGroupElements = () => {
    if (selectedElementIds.length < 2) return;
    pushHistory();
    const newGrpId = `grp-${Date.now().toString(36)}`;
    selectedElementIds.forEach((id) => {
      updateElement(sectionId, id, { groupId: newGrpId });
    });
    setContextMenu(null);
  };

  const handleUngroupElements = () => {
    pushHistory();
    const targetIds = element.groupId
      ? getGroupMemberIds(element.groupId)
      : selectedElementIds;
    targetIds.forEach((id) => {
      updateElement(sectionId, id, { groupId: undefined });
    });
    setContextMenu(null);
  };

  const handleInlineChange = (val: string) => {
    updateElement(sectionId, element.id, { content: val });
  };

  // ── Direct Canva-style Free-Form Mouse Drag anywhere on the canvas ────────
  const handleMouseDownMove = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setContextMenu(null);
    }
    if (e.button !== 0 || isEditingInline || isResizing) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-element-toolbar="true"]') ||
      target.closest('[data-resize-handle="true"]') ||
      target.closest('[data-context-menu="true"]')
    ) {
      return;
    }

    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    let activeDragIds = selectedElementIds;
    if (element.groupId) {
      const grpIds = getGroupMemberIds(element.groupId);
      activeDragIds = Array.from(new Set([...selectedElementIds, ...grpIds]));
      setSelectedElementIds(activeDragIds);
    } else if (!selectedElementIds.includes(element.id)) {
      activeDragIds = [element.id];
      setSelectedElementId(element.id);
    }

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialX = element.style?.freeX || 0;
    const initialY = element.style?.freeY || 0;
    const elNode = wrapperRef.current;
    const startRect = elNode?.getBoundingClientRect();
    const parentNode = elNode?.parentElement;
    const parentRect = parentNode?.getBoundingClientRect();

    // Collect sibling rects for Canva-style magnetic alignment
    const siblingRects: DOMRect[] = [];
    if (parentNode) {
      Array.from(parentNode.children).forEach((child) => {
        if (child !== elNode && child instanceof HTMLElement) {
          siblingRects.push(child.getBoundingClientRect());
        }
      });
    }

    let hasMoved = false;
    let latestFinalX = initialX;
    let latestFinalY = initialY;
    const SNAP_THRESHOLD = 9;

    const onMouseMove = (moveEv: MouseEvent) => {
      const dx = moveEv.clientX - startClientX;
      const dy = moveEv.clientY - startClientY;

      if (!hasMoved && Math.hypot(dx, dy) < 3) {
        return;
      }

      if (!hasMoved) {
        hasMoved = true;
        pushHistory();
        setIsDragging(true);
      }

      const isFreeform = moveEv.altKey;
      let adjDx = dx;
      let adjDy = dy;
      let snappedV = false;
      let snappedH = false;
      const snapLabels: string[] = [];

      if (!isFreeform && startRect) {
        const rawLeft = startRect.left + dx;
        const rawCenterX = rawLeft + startRect.width / 2;
        const rawRight = rawLeft + startRect.width;

        const rawTop = startRect.top + dy;
        const rawCenterY = rawTop + startRect.height / 2;
        const rawBottom = rawTop + startRect.height;

        // 1. Snap to original flow axis (X=0 or Y=0)
        if (Math.abs(initialX + dx) < SNAP_THRESHOLD) {
          adjDx = -initialX;
          snappedV = true;
          snapLabels.push('Flow X');
        }
        if (Math.abs(initialY + dy) < SNAP_THRESHOLD) {
          adjDy = -initialY;
          snappedH = true;
          snapLabels.push('Flow Y');
        }

        // 2. Snap to Parent Section / Container Center & Edges
        if (parentRect) {
          const pCenterX = parentRect.left + parentRect.width / 2;
          if (Math.abs(rawCenterX - pCenterX) < SNAP_THRESHOLD) {
            adjDx = dx + (pCenterX - rawCenterX);
            snappedV = true;
            snapLabels.push('Center');
          } else if (Math.abs(rawLeft - parentRect.left) < SNAP_THRESHOLD) {
            adjDx = dx + (parentRect.left - rawLeft);
            snappedV = true;
            snapLabels.push('Left Edge');
          } else if (Math.abs(rawRight - parentRect.right) < SNAP_THRESHOLD) {
            adjDx = dx + (parentRect.right - rawRight);
            snappedV = true;
            snapLabels.push('Right Edge');
          }

          const pCenterY = parentRect.top + parentRect.height / 2;
          if (Math.abs(rawCenterY - pCenterY) < SNAP_THRESHOLD) {
            adjDy = dy + (pCenterY - rawCenterY);
            snappedH = true;
            snapLabels.push('Middle');
          }
        }

        // 3. Snap to Sibling Elements (Left, Center, Right, Top, Middle, Bottom)
        for (const sRect of siblingRects) {
          const sCenterX = sRect.left + sRect.width / 2;
          const sCenterY = sRect.top + sRect.height / 2;

          if (!snappedV) {
            if (Math.abs(rawCenterX - sCenterX) < SNAP_THRESHOLD) {
              adjDx = dx + (sCenterX - rawCenterX);
              snappedV = true;
              snapLabels.push('Align Center');
            } else if (Math.abs(rawLeft - sRect.left) < SNAP_THRESHOLD) {
              adjDx = dx + (sRect.left - rawLeft);
              snappedV = true;
              snapLabels.push('Align Left');
            } else if (Math.abs(rawRight - sRect.right) < SNAP_THRESHOLD) {
              adjDx = dx + (sRect.right - rawRight);
              snappedV = true;
              snapLabels.push('Align Right');
            } else if (Math.abs(rawLeft - sRect.right) < SNAP_THRESHOLD) {
              adjDx = dx + (sRect.right - rawLeft);
              snappedV = true;
              snapLabels.push('Snap Next');
            } else if (Math.abs(rawRight - sRect.left) < SNAP_THRESHOLD) {
              adjDx = dx + (sRect.left - rawRight);
              snappedV = true;
              snapLabels.push('Snap Next');
            }
          }

          if (!snappedH) {
            if (Math.abs(rawCenterY - sCenterY) < SNAP_THRESHOLD) {
              adjDy = dy + (sCenterY - rawCenterY);
              snappedH = true;
              snapLabels.push('Align Middle');
            } else if (Math.abs(rawTop - sRect.top) < SNAP_THRESHOLD) {
              adjDy = dy + (sRect.top - rawTop);
              snappedH = true;
              snapLabels.push('Align Top');
            } else if (Math.abs(rawBottom - sRect.bottom) < SNAP_THRESHOLD) {
              adjDy = dy + (sRect.bottom - rawBottom);
              snappedH = true;
              snapLabels.push('Align Bottom');
            }
          }
        }
      }

      latestFinalX = Math.round(initialX + adjDx);
      latestFinalY = Math.round(initialY + adjDy);
      const deltaMovedX = latestFinalX - initialX;
      const deltaMovedY = latestFinalY - initialY;

      // Visually move all other grouped/selected sibling elements in real time during the drag!
      if (activeDragIds.length > 1) {
        activeDragIds.forEach((otherId) => {
          if (otherId === element.id) return;
          const otherDom = document.querySelector(`[data-vds-el-id="${otherId}"]`) as HTMLElement | null;
          if (otherDom) {
            const baseX = parseFloat(otherDom.getAttribute('data-vds-base-x') || '0') || 0;
            const baseY = parseFloat(otherDom.getAttribute('data-vds-base-y') || '0') || 0;
            otherDom.style.transform = `translate3d(${Math.round(baseX + deltaMovedX)}px, ${Math.round(baseY + deltaMovedY)}px, 0)`;
          }
        });
      }

      setSnapGuideLines({ v: snappedV, h: snappedH });
      setLiveOffset({
        x: latestFinalX,
        y: latestFinalY,
        freeform: isFreeform,
        snapLabel: snapLabels.slice(0, 2).join(' · '),
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (hasMoved) {
        setIsDragging(false);
        setLiveOffset(null);
        setSnapGuideLines({});

        const deltaMovedX = latestFinalX - initialX;
        const deltaMovedY = latestFinalY - initialY;

        if (activeDragIds.length > 1 && project) {
          const sec = project.sectionData[sectionId];
          const findEl = (els?: CanvasElement[], targetId?: string): CanvasElement | null => {
            if (!els || !targetId) return null;
            for (const item of els) {
              if (item.id === targetId) return item;
              const found = findEl(item.children, targetId);
              if (found) return found;
            }
            return null;
          };
          activeDragIds.forEach((id) => {
            const targetEl = findEl(sec?.elements, id);
            if (targetEl) {
              const oldX = targetEl.style?.freeX || 0;
              const oldY = targetEl.style?.freeY || 0;
              updateElement(sectionId, id, {
                style: {
                  ...(targetEl.style || {}),
                  freeX: Math.round(oldX + deltaMovedX),
                  freeY: Math.round(oldY + deltaMovedY),
                  zIndex: targetEl.style?.zIndex || 25,
                },
              });
            }
          });
        } else {
          updateElement(sectionId, element.id, {
            style: {
              ...(element.style || {}),
              freeX: latestFinalX,
              freeY: latestFinalY,
              zIndex: element.style?.zIndex || 25,
            },
          });
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── HTML5 Drop Handlers (For dropping new elements from Left Sidebar Library) ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const isContainer = element.type === 'container' || element.type === 'card';
    const yRatio = (e.clientY - rect.top) / rect.height;

    if (isContainer && yRatio > 0.25 && yRatio < 0.75) {
      setDropIndicator('inside');
    } else if (yRatio < 0.5) {
      setDropIndicator('before');
    } else {
      setDropIndicator('after');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetPos = dropIndicator || 'after';
    setDropIndicator(null);

    try {
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.type === 'element') {
        if (data.elementId === element.id) return;
        moveElementTo(
          data.sourceSectionId,
          data.elementId,
          sectionId,
          element.id,
          targetPos
        );
      } else if (data.type === 'new-element' && data.elementType) {
        const newEl = createElement(data.elementType);
        addElement(sectionId, newEl, element.id, targetPos);
        setSelectedElementId(newEl.id);
      }
    } catch (err) {
      console.error('Element drop failed:', err);
    }
  };

  // ── Corner Resize Drag Handler ────────────────────────────────────────────
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const parent = wrapperRef.current;
    const startWidth = parent?.offsetWidth || 300;
    const startHeight = parent?.offsetHeight || 200;

    let hasPushedResizeHistory = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!hasPushedResizeHistory) {
        hasPushedResizeHistory = true;
        pushHistory();
      }
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(60, Math.round(startWidth + deltaX));
      const newHeight = Math.max(32, Math.round(startHeight + deltaY));
      setLiveDimensions({ width: newWidth, height: newHeight });
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsResizing(false);
      const deltaX = upEvent.clientX - startX;
      const deltaY = upEvent.clientY - startY;
      const finalWidth = Math.max(60, Math.round(startWidth + deltaX));
      const finalHeight = Math.max(32, Math.round(startHeight + deltaY));
      setLiveDimensions(null);

      updateElement(sectionId, element.id, {
        style: {
          ...(element.style || {}),
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
        },
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── Word-style Text Wrapping Styles ───────────────────────────────────────
  const wrapMode = element.style?.wrapMode || 'none';
  let wrapStyles: React.CSSProperties = {};

  if (wrapMode === 'left') {
    wrapStyles = {
      float: 'left',
      margin: '0.5rem 1.5rem 1rem 0',
      clear: 'none',
      display: 'inline-block',
    };
  } else if (wrapMode === 'right') {
    wrapStyles = {
      float: 'right',
      margin: '0.5rem 0 1rem 1.5rem',
      clear: 'none',
      display: 'inline-block',
    };
  } else if (wrapMode === 'break') {
    wrapStyles = {
      clear: 'both',
      display: 'block',
      margin: '1.5rem 0',
    };
  } else if (wrapMode === 'in-front') {
    wrapStyles = {
      position: 'relative',
      zIndex: 35,
      boxShadow: '0 12px 35px rgba(0,0,0,0.18)',
    };
  } else if (wrapMode === 'behind') {
    wrapStyles = {
      position: 'relative',
      zIndex: 0,
      opacity: 0.75,
    };
  }

  // Convert custom style properties to inline React CSS
  const customStyles: React.CSSProperties = {
    color: element.style?.color,
    backgroundColor: element.style?.backgroundColor,
    borderRadius: element.style?.borderRadius,
    padding: element.style?.padding,
    margin: element.style?.margin,
    border: element.style?.border,
    boxShadow: element.style?.boxShadow,
    textAlign: element.style?.textAlign,
    fontWeight: element.style?.fontWeight as any,
  };

  const effectiveWidth = liveDimensions ? `${liveDimensions.width}px` : element.style?.width;
  const effectiveHeight = liveDimensions ? `${liveDimensions.height}px` : element.style?.height;

  // Size mapping helper
  const headingSizeClass = {
    1: 'text-4xl md:text-5xl font-extrabold',
    2: 'text-3xl md:text-4xl font-bold',
    3: 'text-2xl font-bold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-semibold',
    6: 'text-base font-medium',
  }[element.level || 2];

  const renderContent = () => {
    switch (element.type) {
      case 'heading': {
        if (isEditingInline) {
          return (
            <input
              type="text"
              autoFocus
              value={element.content || ''}
              onChange={(e) => handleInlineChange(e.target.value)}
              onBlur={() => setIsEditingInline(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingInline(false)}
              className="bg-white/90 border border-indigo-500 rounded px-2 py-1 outline-none text-inherit w-full font-inherit"
              style={{ fontFamily: fontHeading, ...customStyles }}
            />
          );
        }
        const Tag = (`h${element.level || 2}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        return (
          <Tag
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className={`${headingSizeClass} tracking-tight leading-tight select-none`}
            style={{ fontFamily: fontHeading, ...customStyles }}
          >
            {element.content || 'Headline'}
          </Tag>
        );
      }

      case 'text': {
        if (isEditingInline) {
          return (
            <textarea
              autoFocus
              rows={3}
              value={element.content || ''}
              onChange={(e) => handleInlineChange(e.target.value)}
              onBlur={() => setIsEditingInline(false)}
              className="bg-white/90 border border-indigo-500 rounded p-2 outline-none text-inherit w-full resize-none font-inherit"
              style={{ fontFamily: fontBody, ...customStyles }}
            />
          );
        }
        return (
          <p
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className="text-base opacity-85 leading-relaxed select-none"
            style={{ fontFamily: fontBody, ...customStyles }}
          >
            {element.content || 'Text paragraph'}
          </p>
        );
      }

      case 'badge': {
        return (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm select-none"
            style={{
              backgroundColor: element.style?.backgroundColor || `${colors.primary}15`,
              color: element.style?.color || colors.primary,
              ...customStyles,
            }}
          >
            {element.content || 'Badge'}
          </span>
        );
      }

      case 'button': {
        const isPrimary = element.variant !== 'secondary' && element.variant !== 'outline';
        return (
          <a
            href={element.url || '#'}
            onClick={(e) => e.preventDefault()}
            draggable={false}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className={`inline-flex items-center justify-center font-semibold text-sm transition shadow-sm select-none ${
              isPrimary
                ? 'text-white hover:opacity-90'
                : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
            }`}
            style={{
              backgroundColor: isPrimary ? colors.primary : '#ffffff',
              borderRadius: spacing.borderRadius === 'full' ? '9999px' : '8px',
              padding: '0.625rem 1.25rem',
              ...customStyles,
            }}
          >
            {element.content || 'Button'}
          </a>
        );
      }

      case 'image': {
        return (
          <div
            className={`overflow-hidden ${wrapMode === 'none' && !effectiveWidth ? 'w-full flex justify-center' : ''}`}
            style={{
              ...customStyles,
              width: effectiveWidth || (wrapMode !== 'none' ? '320px' : '100%'),
            }}
          >
            <img
              src={element.url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80'}
              alt={element.alt || 'Visual element'}
              draggable={false}
              className="w-full h-full object-cover shadow-md transition select-none pointer-events-none"
              style={{
                borderRadius: element.style?.borderRadius || '12px',
                height: effectiveHeight || 'auto',
                maxHeight: '600px',
              }}
            />
          </div>
        );
      }

      case 'icon': {
        if (isEditingInline) {
          return (
            <input
              type="text"
              autoFocus
              value={element.content || ''}
              onChange={(e) => handleInlineChange(e.target.value)}
              onBlur={() => setIsEditingInline(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingInline(false)}
              className="bg-white/95 border border-indigo-500 rounded px-2 py-1 outline-none text-2xl w-24 text-center"
              style={customStyles}
            />
          );
        }
        return (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className="text-3xl select-none"
            style={customStyles}
            title="Double-click or right-click to change icon"
          >
            {element.content || '✨'}
          </div>
        );
      }

      case 'divider': {
        return <hr className="w-full border-t border-slate-200 my-4" style={customStyles} />;
      }

      case 'nav-item': {
        return (
          <a
            href={element.url || '#'}
            onClick={(e) => e.preventDefault()}
            draggable={false}
            className="text-sm font-medium hover:opacity-80 transition select-none"
            style={{ fontFamily: fontBody, ...customStyles }}
          >
            {element.content || 'Link'}
          </a>
        );
      }

      case 'card':
      case 'container': {
        const isGrid = element.style?.display === 'grid';
        const cols = element.style?.gridCols || 3;
        const gridClass = cols === 2 ? 'grid-cols-1 md:grid-cols-2' : cols === 4 ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';

        return (
          <div
            className={`w-full ${
              isGrid
                ? `grid ${gridClass} gap-6`
                : element.style?.flexDirection === 'row'
                ? 'flex flex-row flex-wrap items-center gap-3'
                : 'flex flex-col gap-3'
            }`}
            style={{
              ...customStyles,
              width: effectiveWidth,
              height: effectiveHeight,
            }}
          >
            {(element.children || []).map((child) => (
              <SandboxElementRenderer
                key={child.id}
                element={child}
                sectionId={sectionId}
                tokens={tokens}
                readOnly={readOnly}
              />
            ))}
          </div>
        );
      }

      default:
        return <div>{element.content || element.type}</div>;
    }
  };

  const hasOffset = effectiveX !== 0 || effectiveY !== 0;

  if (readOnly) {
    return (
      <div
        style={{
          ...wrapStyles,
          width: effectiveWidth,
          height: effectiveHeight,
          transform: hasOffset ? `translate3d(${effectiveX}px, ${effectiveY}px, 0)` : undefined,
          zIndex: element.style?.zIndex,
        }}
        className="relative"
      >
        {renderContent()}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      data-vds-el-id={element.id}
      data-vds-base-x={storedX}
      data-vds-base-y={storedY}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDownMove}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setHoveredElementId(element.id);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        setHoveredElementId(null);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...wrapStyles,
        width: effectiveWidth,
        height: effectiveHeight,
        transform: hasOffset ? `translate3d(${effectiveX}px, ${effectiveY}px, 0)` : undefined,
        zIndex: isDragging ? 50 : contextMenu ? 60 : isSelected ? 35 : element.style?.zIndex,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.15s ease',
      }}
      className={`relative select-none ${
        isDragging ? 'cursor-grabbing shadow-2xl ring-2 ring-indigo-500 rounded-lg' : ''
      } ${
        isSelected && !isDragging
          ? 'ring-2 ring-purple-600 ring-offset-2 rounded-lg shadow-sm cursor-move'
          : isHovered && !isDragging
          ? 'ring-1 ring-indigo-400/80 ring-offset-1 rounded-lg cursor-move'
          : 'cursor-grab'
      }`}
    >
      {/* Visual Drop Insertion Indicators (when dragging new items from sidebar) */}
      {dropIndicator === 'before' && (
        <div className="absolute -top-1.5 left-0 right-0 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1] z-50 pointer-events-none animate-pulse" />
      )}
      {dropIndicator === 'after' && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1] z-50 pointer-events-none animate-pulse" />
      )}
      {dropIndicator === 'inside' && (
        <div className="absolute inset-0 border-2 border-dashed border-indigo-500 bg-indigo-500/10 rounded-xl z-50 pointer-events-none" />
      )}

      {/* Floating Toolbar */}
      {isPrimarySelected && !isDragging && (
        <div data-element-toolbar="true">
          <ElementToolbar element={element} sectionId={sectionId} />
        </div>
      )}

      {/* ── CANVA-STYLE RIGHT-CLICK CONTEXT MENU POPUP ──────────────────────── */}
      {contextMenu && (
        <div
          data-context-menu="true"
          style={{
            position: 'absolute',
            top: `${contextMenu.y + 8}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl py-2 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 text-left font-sans"
        >
          {/* Header */}
          <div className="px-3 pb-2 mb-1.5 border-b border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <span>{ELEMENT_TYPE_ICONS[element.type] || '📦'}</span>
              <span>
                {element.groupId
                  ? `Grouped (${selectedElementIds.length})`
                  : selectedElementIds.length > 1
                  ? `${selectedElementIds.length} Selected`
                  : element.label || ELEMENT_TYPE_LABELS[element.type] || element.type}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  duplicateElement(sectionId, element.id);
                  setContextMenu(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  deleteElement(sectionId, element.id);
                  setSelectedElementId(null);
                  setContextMenu(null);
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectedElementIds.length > 1 && (
            <button
              onClick={handleGroupElements}
              className="w-full px-3 py-2 flex items-center justify-between bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 transition font-semibold"
            >
              <span className="flex items-center gap-2.5">
                <Group className="w-3.5 h-3.5 text-indigo-400" />
                Group {selectedElementIds.length} Items Together
              </span>
              <span className="text-[10px] text-indigo-300/80">Ctrl+G</span>
            </button>
          )}

          {element.groupId && (
            <button
              onClick={handleUngroupElements}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 text-amber-300 transition font-medium"
            >
              <span className="flex items-center gap-2.5">
                <Ungroup className="w-3.5 h-3.5 text-amber-400" />
                Ungroup Items
              </span>
              <span className="text-[10px] text-slate-500">Ctrl+Shift+G</span>
            </button>
          )}

          {(selectedElementIds.length > 1 || element.groupId) && (
            <div className="my-1.5 border-t border-slate-800" />
          )}

          <button
            onClick={() => {
              setIsEditingInline(true);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition"
          >
            <span className="flex items-center gap-2.5 text-white font-medium">
              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
              Edit Content Inline
            </span>
            <span className="text-[10px] text-slate-500">Double-click</span>
          </button>

          <button
            onClick={() => {
              duplicateElement(sectionId, element.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition"
          >
            <span className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              Duplicate
            </span>
            <span className="text-[10px] text-slate-500">Ctrl+D</span>
          </button>

          <div className="my-1.5 border-t border-slate-800" />

          {/* Colors & Style Submenu */}
          <button
            onClick={() =>
              setContextMenu({
                ...contextMenu,
                subMenu: contextMenu.subMenu === 'style' ? null : 'style',
              })
            }
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition"
          >
            <span className="flex items-center gap-2.5">
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              Colors & Style
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                contextMenu.subMenu === 'style' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {contextMenu.subMenu === 'style' && (
            <div className="mx-2 my-1 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Text Color</span>
                <input
                  type="color"
                  value={element.style?.color || '#0f172a'}
                  onChange={(e) =>
                    updateElement(sectionId, element.id, {
                      style: { ...(element.style || {}), color: e.target.value },
                    })
                  }
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Background</span>
                <input
                  type="color"
                  value={element.style?.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    updateElement(sectionId, element.id, {
                      style: { ...(element.style || {}), backgroundColor: e.target.value },
                    })
                  }
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
              <div className="flex gap-1 pt-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() =>
                      updateElement(sectionId, element.id, {
                        style: { ...(element.style || {}), textAlign: align },
                      })
                    }
                    className={`flex-1 py-1 rounded flex items-center justify-center ${
                      element.style?.textAlign === align
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                    {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                    {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Layer Order Submenu */}
          <button
            onClick={() =>
              setContextMenu({
                ...contextMenu,
                subMenu: contextMenu.subMenu === 'layer' ? null : 'layer',
              })
            }
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition"
          >
            <span className="flex items-center gap-2.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Layer Order
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                contextMenu.subMenu === 'layer' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {contextMenu.subMenu === 'layer' && (
            <div className="mx-2 my-1 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
              <button
                onClick={() => {
                  moveElement(sectionId, element.id, 'up');
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
              >
                <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                Move Forward / Up
              </button>
              <button
                onClick={() => {
                  moveElement(sectionId, element.id, 'down');
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                Send Backward / Down
              </button>
            </div>
          )}

          {/* Text Wrapping Submenu */}
          <button
            onClick={() =>
              setContextMenu({
                ...contextMenu,
                subMenu: contextMenu.subMenu === 'wrap' ? null : 'wrap',
              })
            }
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition"
          >
            <span className="flex items-center gap-2.5">
              <WrapText className="w-3.5 h-3.5 text-amber-400" />
              Text Wrapping
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                contextMenu.subMenu === 'wrap' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {contextMenu.subMenu === 'wrap' && (
            <div className="mx-2 my-1 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-2 gap-1">
              {[
                { mode: 'left' as TextWrapMode, label: 'Float Left' },
                { mode: 'right' as TextWrapMode, label: 'Float Right' },
                { mode: 'in-front' as TextWrapMode, label: 'In Front' },
                { mode: 'none' as TextWrapMode, label: 'Normal Flow' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    updateElement(sectionId, element.id, {
                      style: { ...(element.style || {}), wrapMode: mode },
                    });
                    setContextMenu(null);
                  }}
                  className="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Image URL input if image */}
          {element.type === 'image' && (
            <div className="px-3 py-2 space-y-1">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <ImageIcon className="w-3 h-3" /> Image URL
              </span>
              <input
                type="text"
                value={element.url || ''}
                onChange={(e) => updateElement(sectionId, element.id, { url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              />
            </div>
          )}

          {/* Button / Link URL input */}
          {(element.type === 'button' || element.type === 'nav-item') && (
            <div className="px-3 py-2 space-y-1">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <LinkIcon className="w-3 h-3" /> Link URL
              </span>
              <input
                type="text"
                value={element.url || ''}
                onChange={(e) => updateElement(sectionId, element.id, { url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              />
            </div>
          )}

          {hasOffset && (
            <>
              <div className="my-1.5 border-t border-slate-800" />
              <button
                onClick={() => {
                  updateElement(sectionId, element.id, {
                    style: { ...(element.style || {}), freeX: 0, freeY: 0 },
                  });
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800/90 text-amber-300 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Dragged Position
              </button>
            </>
          )}

          <div className="my-1.5 border-t border-slate-800" />

          <button
            onClick={() => {
              deleteElement(sectionId, element.id);
              setSelectedElementId(null);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-red-500/20 text-red-400 transition"
          >
            <span className="flex items-center gap-2.5">
              <Trash2 className="w-3.5 h-3.5" />
              Delete Element
            </span>
            <span className="text-[10px] text-red-400/70">Del</span>
          </button>
        </div>
      )}

      {/* Canva-style Magenta Alignment Guide Lines while Dragging */}
      {isDragging && snapGuideLines.v && (
        <div className="absolute -top-24 -bottom-24 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-fuchsia-500 shadow-[0_0_6px_#d946ef] z-50 pointer-events-none" />
      )}
      {isDragging && snapGuideLines.h && (
        <div className="absolute -left-24 -right-24 top-1/2 -translate-y-1/2 h-0 border-t border-dashed border-fuchsia-500 shadow-[0_0_6px_#d946ef] z-50 pointer-events-none" />
      )}

      {/* Live Position Coordinates Tooltip while Dragging */}
      {isDragging && liveOffset && (
        <div className="absolute -top-8 left-0 bg-slate-900/95 border border-purple-500 text-white text-[10px] font-mono px-2.5 py-0.5 rounded-lg shadow-xl z-50 pointer-events-none whitespace-nowrap flex items-center gap-2">
          <span>
            X: {liveOffset.x > 0 ? `+${liveOffset.x}` : liveOffset.x}px, Y: {liveOffset.y > 0 ? `+${liveOffset.y}` : liveOffset.y}px
          </span>
          {liveOffset.freeform ? (
            <span className="text-amber-300 font-sans font-semibold">Freeform (Alt)</span>
          ) : liveOffset.snapLabel ? (
            <span className="text-fuchsia-300 font-sans font-semibold">Snapped: {liveOffset.snapLabel}</span>
          ) : (
            <span className="text-slate-400 font-sans">Hold Alt for Freeform</span>
          )}
        </div>
      )}

      {/* Interactive Corner Resize Handle */}
      {isSelected && (
        <div
          data-resize-handle="true"
          onMouseDown={handleResizeMouseDown}
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 z-40 transition flex items-center justify-center"
          title="Drag to resize width & height"
        >
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}

      {/* Live Dimension Tooltip while Resizing */}
      {isResizing && liveDimensions && (
        <div className="absolute -bottom-8 right-0 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-xl z-50 pointer-events-none border border-slate-700 whitespace-nowrap">
          {liveDimensions.width} × {liveDimensions.height} px
        </div>
      )}

      {renderContent()}
    </div>
  );
}
