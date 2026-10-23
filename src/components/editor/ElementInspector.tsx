import { useState } from 'react';
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import type { CanvasElement } from '../../types/elements';
import { ELEMENT_TYPE_ICONS, ELEMENT_TYPE_LABELS } from '../../types/elements';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { findElementInTree, sectionDataToElements } from '../../services/analyzer/elementConverter';

interface Props {
  elementId: string;
}

export default function ElementInspector({ elementId }: Props) {
  const project = useProjectStore((s) => s.project);
  const updateElement = useProjectStore((s) => s.updateElement);
  const deleteElement = useProjectStore((s) => s.deleteElement);
  const duplicateElement = useProjectStore((s) => s.duplicateElement);
  const moveElement = useProjectStore((s) => s.moveElement);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);

  if (!project) return null;

  // Search across all sections for this element
  let foundElement: CanvasElement | null = null;
  let ownerSectionId: string | null = null;

  for (const node of project.nodes) {
    const sd = project.sectionData[node.data.sectionDataId];
    if (sd) {
      const elements = (sd as any).elements && (sd as any).elements.length > 0
        ? (sd as any).elements
        : sectionDataToElements(sd);
      const match = findElementInTree(elements, elementId);
      if (match) {
        foundElement = match.element;
        ownerSectionId = node.data.sectionDataId;
        break;
      }
    }
  }

  if (!foundElement || !ownerSectionId) {
    return (
      <div className="p-4 text-center text-slate-500 text-xs">
        Element not found or deselected.
      </div>
    );
  }

  const el = foundElement;
  const sid = ownerSectionId;

  const patch = (p: Partial<CanvasElement>) => {
    updateElement(sid, el.id, p);
  };

  const patchStyle = (s: Partial<CanvasElement['style']>) => {
    updateElement(sid, el.id, {
      style: {
        ...(el.style || {}),
        ...s,
      },
    });
  };

  const typeIcon = ELEMENT_TYPE_ICONS[el.type] || '📦';
  const typeLabel = el.label || ELEMENT_TYPE_LABELS[el.type] || el.type;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-slate-850">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcon}</span>
          <div>
            <h3 className="text-xs font-bold text-white capitalize">{typeLabel}</h3>
            <p className="text-[10px] text-slate-400">Sandbox Element</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateElement(sid, el.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Duplicate element"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              deleteElement(sid, el.id);
              setSelectedElementId(null);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Delete element"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Quick Position Reorder */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <span className="text-slate-400">Move Order:</span>
          <div className="flex gap-1">
            <button
              onClick={() => moveElement(sid, el.id, 'up')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition text-xs font-medium"
            >
              <ChevronUp className="w-3.5 h-3.5" /> Up
            </button>
            <button
              onClick={() => moveElement(sid, el.id, 'down')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition text-xs font-medium"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Down
            </button>
          </div>
        </div>

        {/* Text Content */}
        {('content' in el || el.type === 'heading' || el.type === 'text' || el.type === 'button' || el.type === 'badge' || el.type === 'nav-item' || el.type === 'icon') && (
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              {el.type === 'icon' ? 'Icon / Emoji' : 'Text Content'}
            </label>
            {el.type === 'text' ? (
              <textarea
                rows={4}
                value={el.content || ''}
                onChange={(e) => patch({ content: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
              />
            ) : (
              <input
                type="text"
                value={el.content || ''}
                onChange={(e) => patch({ content: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
              />
            )}

            {/* Visual Icon / Emoji Picker Grid when editing an Icon element */}
            {el.type === 'icon' && (
              <div className="mt-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Choose an Icon
                </p>
                <div className="grid grid-cols-7 gap-1 max-h-44 overflow-y-auto pr-1">
                  {[
                    '✨', '⚡', '🔥', '🚀', '💎', '👑', '🎯',
                    '❤️', '⭐', '🌟', '💡', '🎉', '🏆', '🛡️',
                    '🔒', '🔑', '⚙️', '🔧', '📊', '📈', '💰',
                    '💳', '🛒', '🛍️', '🎁', '📦', '🏷️', '👗',
                    '👠', '👟', '👜', '👶', '🏠', '🚗', '📱',
                    '💻', '🖥️', '📷', '🎨', '🎵', '🎬', '📚',
                    '✉️', '📞', '💬', '🔔', '📍', '🌍', '✈️',
                    '⏰', '📅', '✅', '☑️', '➕', '➡️', '🔍',
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => patch({ content: emoji })}
                      className={`h-8 rounded-lg flex items-center justify-center text-base transition ${
                        el.content === emoji
                          ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110'
                          : 'bg-slate-900/70 hover:bg-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Link / URL */}
        {('url' in el || el.type === 'button' || el.type === 'nav-item' || el.type === 'image') && (
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              {el.type === 'image' ? 'Image Source URL' : 'Link Destination (href)'}
            </label>
            <input
              type="text"
              value={el.url || ''}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder={el.type === 'image' ? 'https://...' : '#'}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Button Variant */}
        {el.type === 'button' && (
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Button Style</label>
            <div className="flex gap-2">
              {(['primary', 'secondary', 'outline'] as const).map((variant) => (
                <button
                  key={variant}
                  onClick={() => patch({ variant })}
                  className={`flex-1 py-1.5 rounded-lg capitalize font-medium transition ${
                    (el.variant || 'primary') === variant
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Wrapping (Word Style) */}
        <div>
          <label className="block text-slate-400 mb-1.5 font-medium flex items-center justify-between">
            <span>Text Wrapping (Word Style)</span>
            <span className="text-[10px] text-indigo-400 capitalize">{el.style?.wrapMode || 'None'}</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { mode: 'left' as const, label: 'Wrap Left', desc: 'Picture left, text wraps right' },
              { mode: 'right' as const, label: 'Wrap Right', desc: 'Picture right, text wraps left' },
              { mode: 'break' as const, label: 'Top & Bottom', desc: 'Break text flow' },
              { mode: 'in-front' as const, label: 'In Front (Free)', desc: 'Floating free overlay' },
              { mode: 'behind' as const, label: 'Behind Text', desc: 'Watermark backdrop' },
              { mode: 'none' as const, label: 'Standard Flow', desc: 'Normal stacked block' },
            ].map(({ mode, label, desc }) => (
              <button
                key={mode}
                onClick={() => patchStyle({ wrapMode: mode, positionMode: mode === 'in-front' || mode === 'behind' ? 'free' : 'flow' })}
                className={`p-2 rounded-xl text-left border transition ${
                  (el.style?.wrapMode || 'none') === mode
                    ? 'bg-indigo-600/30 border-indigo-500 text-white'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <p className="font-semibold text-[11px] leading-tight">{label}</p>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Size & Dimensions (Resize Bar) */}
        <div className="space-y-2">
          <label className="block text-slate-400 font-medium flex items-center justify-between">
            <span>Size & Dimensions</span>
            <span className="text-[10px] text-indigo-400 font-mono">{el.style?.width || 'auto'}</span>
          </label>
          <div className="flex gap-1">
            {[
              { label: 'Auto', val: 'auto' },
              { label: '25%', val: '25%' },
              { label: '50%', val: '50%' },
              { label: '75%', val: '75%' },
              { label: '100%', val: '100%' },
            ].map(({ label, val }) => (
              <button
                key={val}
                onClick={() => patchStyle({ width: val })}
                className={`flex-1 py-1 rounded-lg text-[10px] transition ${
                  el.style?.width === val
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1 pt-1">
            <span className="text-[10px] text-slate-500">Fine Resize Slider</span>
            <input
              type="range"
              min="80"
              max="1100"
              step="10"
              value={parseInt(el.style?.width || '400') || 400}
              onChange={(e) => patchStyle({ width: `${e.target.value}px` })}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Alignment */}
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Alignment</label>
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => patchStyle({ textAlign: align })}
                className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition ${
                  (el.style?.textAlign || 'left') === align
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Text Color</label>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl px-2 py-1.5">
              <input
                type="color"
                value={el.style?.color || '#0f172a'}
                onChange={(e) => patchStyle({ color: e.target.value })}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-[11px] text-slate-300 font-mono">
                {el.style?.color || 'Default'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Background</label>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl px-2 py-1.5">
              <input
                type="color"
                value={el.style?.backgroundColor || '#ffffff'}
                onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-[11px] text-slate-300 font-mono">
                {el.style?.backgroundColor || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Border Radius */}
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Corner Rounding</label>
          <div className="flex gap-1.5">
            {[
              { label: 'None', val: '0px' },
              { label: 'Small', val: '6px' },
              { label: 'Medium', val: '12px' },
              { label: 'Large', val: '24px' },
              { label: 'Full', val: '9999px' },
            ].map(({ label, val }) => (
              <button
                key={val}
                onClick={() => patchStyle({ borderRadius: val })}
                className={`flex-1 py-1 rounded-lg text-[11px] transition ${
                  el.style?.borderRadius === val
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
