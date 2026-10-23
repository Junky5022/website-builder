import { useState } from 'react';
import {
  Plus,
  Heading,
  Type,
  MousePointerClick,
  Image,
  Tag,
  Box,
  Layers,
  Sparkles,
  Minus,
  X,
} from 'lucide-react';
import type { ElementType } from '../../types/elements';
import { createElement } from '../../services/analyzer/elementConverter';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface Props {
  sectionId: string;
  targetElementId?: string;
  position?: 'before' | 'after' | 'inside';
  className?: string;
  buttonLabel?: string;
  onAdded?: () => void;
}

export default function AddElementMenu({
  sectionId,
  targetElementId,
  position = 'after',
  className = '',
  buttonLabel = 'Add Element',
  onAdded,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const addElement = useProjectStore((s) => s.addElement);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);

  const items: { type: ElementType; label: string; desc: string; icon: any }[] = [
    { type: 'heading', label: 'Heading', desc: 'Main or section title', icon: Heading },
    { type: 'text', label: 'Paragraph', desc: 'Body text or description', icon: Type },
    { type: 'button', label: 'Button', desc: 'Interactive call-to-action', icon: MousePointerClick },
    { type: 'image', label: 'Image', desc: 'Photo, banner, or illustration', icon: Image },
    { type: 'badge', label: 'Badge / Pill', desc: 'Category, tag or status', icon: Tag },
    { type: 'card', label: 'Card Box', desc: 'Content card with icon and text', icon: Layers },
    { type: 'container', label: 'Container', desc: 'Flex box or column container', icon: Box },
    { type: 'icon', label: 'Icon / Emoji', desc: 'Decorative visual accent', icon: Sparkles },
    { type: 'divider', label: 'Divider', desc: 'Horizontal separator line', icon: Minus },
  ];

  const handleSelect = (type: ElementType) => {
    const newEl = createElement(type);
    addElement(sectionId, newEl, targetElementId, position);
    setSelectedElementId(newEl.id);
    setIsOpen(false);
    onAdded?.();
  };

  return (
    <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md transition"
        title="Add an element to this section"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 shadow-2xl rounded-2xl p-2.5 z-50 text-left backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Choose Element</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-80 overflow-y-auto">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleSelect(item.type)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight">{item.label}</p>
                      <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
