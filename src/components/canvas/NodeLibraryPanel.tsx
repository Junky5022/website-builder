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
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { generateId } from '../../utils/storage';
import { createDefaultSection, type NodeSectionType } from '../../types/sections';
import { NODE_SECTION_ICONS, NODE_SECTION_LABELS, NODE_SECTION_COLORS } from '../../types/nodes';
import { createElement, sectionDataToElements } from '../../services/analyzer/elementConverter';
import type { ElementType } from '../../types/elements';

const SECTION_TYPES: NodeSectionType[] = [
  'header',
  'hero',
  'features',
  'imageText',
  'gallery',
  'testimonials',
  'pricing',
  'faq',
  'cta',
  'footer',
];

const ELEMENT_ITEMS: { type: ElementType; label: string; desc: string; icon: any }[] = [
  { type: 'button', label: 'Button', desc: 'Clickable call to action', icon: MousePointerClick },
  { type: 'image', label: 'Image', desc: 'Photo or graphic', icon: Image },
  { type: 'heading', label: 'Heading', desc: 'Section or title text', icon: Heading },
  { type: 'text', label: 'Paragraph', desc: 'Body text content', icon: Type },
  { type: 'badge', label: 'Badge', desc: 'Tag or status pill', icon: Tag },
  { type: 'card', label: 'Card Box', desc: 'Container with icon & text', icon: Layers },
  { type: 'container', label: 'Container', desc: 'Flexbox column or row', icon: Box },
  { type: 'icon', label: 'Icon', desc: 'Emoji accent', icon: Sparkles },
  { type: 'divider', label: 'Divider', desc: 'Separator rule', icon: Minus },
];

export default function NodeLibraryPanel() {
  const [subTab, setSubTab] = useState<'elements' | 'sections'>('elements');

  const addNode = useProjectStore((s) => s.addNode);
  const setSectionData = useProjectStore((s) => s.setSectionData);
  const addElement = useProjectStore((s) => s.addElement);
  const nodes = useProjectStore((s) => s.project?.nodes ?? []);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);

  const handleAddSection = (type: NodeSectionType) => {
    const nodeId = generateId();
    const sectionId = generateId();
    const sd = createDefaultSection(type, sectionId);
    sd.elements = sectionDataToElements(sd);

    const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);

    setSectionData(sectionId, sd);
    addNode({
      id: nodeId,
      type,
      position: { x: 100, y: maxY + 250 },
      data: {
        label: NODE_SECTION_LABELS[type],
        summary: 'Newly added section',
        status: 'draft',
        hidden: false,
        sectionDataId: sectionId,
        nodeType: type,
      },
    });
  };

  const handleAddElement = (type: ElementType) => {
    // Determine target section
    let targetSectionId = '';
    if (selectedNodeIds.length > 0) {
      const targetNode = nodes.find((n) => n.id === selectedNodeIds[0]);
      if (targetNode) targetSectionId = targetNode.data.sectionDataId;
    }

    if (!targetSectionId && nodes.length > 0) {
      targetSectionId = nodes[0].data.sectionDataId;
    }

    // If no sections exist yet, create a hero section first
    if (!targetSectionId) {
      const nodeId = generateId();
      targetSectionId = generateId();
      const sd = createDefaultSection('hero', targetSectionId);
      setSectionData(targetSectionId, sd);
      addNode({
        id: nodeId,
        type: 'hero',
        position: { x: 100, y: 100 },
        data: {
          label: 'Hero Section',
          summary: 'Default section',
          status: 'draft',
          hidden: false,
          sectionDataId: targetSectionId,
          nodeType: 'hero',
        },
      });
    }

    const newEl = createElement(type);
    addElement(targetSectionId, newEl);
    setSelectedElementId(newEl.id);
  };

  return (
    <div className="p-4 flex flex-col h-full">
      {/* Subtab toggle */}
      <div className="flex bg-slate-800 p-1 rounded-xl mb-4 border border-slate-700">
        <button
          onClick={() => setSubTab('elements')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'elements'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Elements
        </button>
        <button
          onClick={() => setSubTab('sections')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'sections'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sections
        </button>
      </div>

      {subTab === 'elements' ? (
        <div className="space-y-2 flex-1 overflow-y-auto">
          <p className="text-[11px] text-slate-400 mb-2">
            Click or drag any element directly onto your page canvas.
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {ELEMENT_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    const payload = JSON.stringify({ type: 'new-element', elementType: item.type });
                    e.dataTransfer.setData('application/json', payload);
                    e.dataTransfer.setData('text/plain', payload);
                  }}
                  onClick={() => handleAddElement(item.type)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-800 text-left transition group bg-slate-850 cursor-grab active:cursor-grabbing"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{item.desc}</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          <p className="text-[11px] text-slate-400 mb-2">
            Click to add a full section block.
          </p>
          {SECTION_TYPES.map((type) => {
            const color = NODE_SECTION_COLORS[type];
            const icon = NODE_SECTION_ICONS[type];
            const label = NODE_SECTION_LABELS[type];
            return (
              <button
                key={type}
                onClick={() => handleAddSection(type)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-700/80 hover:border-slate-500 hover:bg-slate-800 text-left transition group bg-slate-850"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition">
                    {label}
                  </p>
                </div>
                <Plus className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
