import { useState } from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Edit3,
  SlidersHorizontal,
  WrapText,
  Maximize2,
  Layers,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { CanvasElement, TextWrapMode } from '../../types/elements';
import { ELEMENT_TYPE_ICONS, ELEMENT_TYPE_LABELS } from '../../types/elements';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import AddElementMenu from './AddElementMenu';

interface Props {
  element: CanvasElement;
  sectionId: string;
}

export default function ElementToolbar({ element, sectionId }: Props) {
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showWrapMenu, setShowWrapMenu] = useState(false);
  const [showIconMenu, setShowIconMenu] = useState(false);

  const duplicateElement = useProjectStore((s) => s.duplicateElement);
  const deleteElement = useProjectStore((s) => s.deleteElement);
  const moveElement = useProjectStore((s) => s.moveElement);
  const updateElement = useProjectStore((s) => s.updateElement);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const setRightPanel = useCanvasStore((s) => s.setRightPanel);

  const icon = ELEMENT_TYPE_ICONS[element.type] || '📦';
  const label = element.label || ELEMENT_TYPE_LABELS[element.type] || element.type;

  const currentWrap = element.style?.wrapMode || 'none';

  const setWrapMode = (mode: TextWrapMode) => {
    updateElement(sectionId, element.id, {
      style: {
        ...(element.style || {}),
        wrapMode: mode,
        positionMode: mode === 'in-front' || mode === 'behind' ? 'free' : 'flow',
      },
    });
    setShowWrapMenu(false);
  };

  const setWidth = (width: string) => {
    updateElement(sectionId, element.id, {
      style: {
        ...(element.style || {}),
        width,
      },
    });
  };

  return (
    <div
      className="absolute -top-10 left-2 z-50 flex items-center gap-1 bg-indigo-950/95 text-white border border-indigo-500/80 shadow-2xl rounded-xl px-2 py-1 text-xs backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="cursor-grab active:cursor-grabbing p-0.5 text-indigo-300 hover:text-white"
        title="Drag element to reposition (Hold Ctrl for Freeplace)"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs mr-0.5">{icon}</span>
      <span className="font-semibold text-[11px] mr-1.5 text-indigo-200 truncate max-w-[90px]">
        {label}
      </span>

      <div className="w-px h-3 bg-indigo-700/60 mx-0.5" />

      {/* Quick Icon Picker Popover for Icon elements */}
      {element.type === 'icon' && (
        <div className="relative">
          <button
            onClick={() => {
              setShowIconMenu(!showIconMenu);
              setShowSizeMenu(false);
              setShowWrapMenu(false);
            }}
            className={`px-1.5 py-0.5 rounded hover:bg-indigo-800 flex items-center gap-1 transition ${
              showIconMenu ? 'bg-indigo-800 text-white' : 'text-amber-300'
            }`}
            title="Change Icon"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">Pick Icon</span>
          </button>

          {showIconMenu && (
            <div className="absolute left-0 mt-2 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-2.5 z-50 w-64 text-left">
              <p className="text-[11px] font-semibold text-slate-300 mb-2">Choose Icon or Type Below</p>
              <input
                type="text"
                value={element.content || ''}
                onChange={(e) => updateElement(sectionId, element.id, { content: e.target.value })}
                placeholder="Type any emoji or symbol..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-white mb-2 focus:outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-7 gap-1 max-h-40 overflow-y-auto">
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
                    onClick={() => {
                      updateElement(sectionId, element.id, { content: emoji });
                      setShowIconMenu(false);
                    }}
                    className={`h-7 rounded flex items-center justify-center text-base transition ${
                      element.content === emoji
                        ? 'bg-indigo-600 ring-1 ring-indigo-300'
                        : 'bg-slate-800 hover:bg-slate-700'
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

      {/* Resize Bar Popover */}
      <div className="relative">
        <button
          onClick={() => {
            setShowSizeMenu(!showSizeMenu);
            setShowWrapMenu(false);
          }}
          className={`p-1 rounded hover:bg-indigo-800 transition ${showSizeMenu ? 'bg-indigo-800 text-white' : 'text-indigo-300'}`}
          title="Resize element (Width & Presets)"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {showSizeMenu && (
          <div className="absolute left-0 mt-2 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-3 z-50 w-56 text-left">
            <p className="text-[11px] font-semibold text-slate-300 mb-2">Width / Resize Bar</p>
            <div className="flex gap-1 mb-2.5">
              {[
                { label: 'Auto', val: 'auto' },
                { label: '25%', val: '25%' },
                { label: '50%', val: '50%' },
                { label: '75%', val: '75%' },
                { label: '100%', val: '100%' },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setWidth(val)}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition ${
                    element.style?.width === val
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Range slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Slider Size</span>
                <span>{element.style?.width || 'auto'}</span>
              </div>
              <input
                type="range"
                min="100"
                max="900"
                step="20"
                value={parseInt(element.style?.width || '400') || 400}
                onChange={(e) => setWidth(`${e.target.value}px`)}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Word-Style Text Wrapping Popover */}
      <div className="relative">
        <button
          onClick={() => {
            setShowWrapMenu(!showWrapMenu);
            setShowSizeMenu(false);
          }}
          className={`p-1 rounded hover:bg-indigo-800 transition ${showWrapMenu ? 'bg-indigo-800 text-white' : 'text-indigo-300'}`}
          title="Word-style Text Wrapping"
        >
          <WrapText className="w-3.5 h-3.5" />
        </button>

        {showWrapMenu && (
          <div className="absolute left-0 mt-2 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-2 z-50 w-52 text-left">
            <p className="text-[11px] font-semibold text-slate-300 px-2 py-1 border-b border-slate-800 mb-1">
              Text Wrapping (Word Style)
            </p>
            <div className="space-y-1">
              {[
                { mode: 'left' as TextWrapMode, label: 'Wrap Left', desc: 'Picture on left, text wraps on right' },
                { mode: 'right' as TextWrapMode, label: 'Wrap Right', desc: 'Picture on right, text wraps on left' },
                { mode: 'break' as TextWrapMode, label: 'Top & Bottom', desc: 'Text breaks and continues below' },
                { mode: 'in-front' as TextWrapMode, label: 'In Front of Text', desc: 'Free floating overlay on top' },
                { mode: 'behind' as TextWrapMode, label: 'Behind Text', desc: 'Backdrop behind the text' },
                { mode: 'none' as TextWrapMode, label: 'Inline / None', desc: 'Standard stacked document flow' },
              ].map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => setWrapMode(mode)}
                  className={`w-full text-left p-1.5 rounded-lg text-xs transition ${
                    currentWrap === mode
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <p className="font-semibold text-[11px]">{label}</p>
                  <p className="text-[10px] text-slate-400 opacity-80">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-3 bg-indigo-700/60 mx-0.5" />

      <button
        onClick={() => moveElement(sectionId, element.id, 'up')}
        className="p-1 rounded hover:bg-indigo-800 text-indigo-300 hover:text-white transition"
        title="Move element up"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => moveElement(sectionId, element.id, 'down')}
        className="p-1 rounded hover:bg-indigo-800 text-indigo-300 hover:text-white transition"
        title="Move element down"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {Boolean(element.style?.freeX || element.style?.freeY) && (
        <button
          onClick={() =>
            updateElement(sectionId, element.id, {
              style: { ...(element.style || {}), freeX: 0, freeY: 0 },
            })
          }
          className="p-1 rounded hover:bg-indigo-800 text-amber-300 hover:text-white transition"
          title="Snap back to original layout position"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="w-px h-3 bg-indigo-700/60 mx-0.5" />

      <button
        onClick={() => duplicateElement(sectionId, element.id)}
        className="p-1 rounded hover:bg-indigo-800 text-indigo-300 hover:text-white transition"
        title="Duplicate element"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => {
          deleteElement(sectionId, element.id);
          setSelectedElementId(null);
        }}
        className="p-1 rounded hover:bg-red-500/30 text-red-300 hover:text-red-100 transition"
        title="Delete element"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-3 bg-indigo-700/60 mx-0.5" />

      <AddElementMenu
        sectionId={sectionId}
        targetElementId={element.id}
        position="after"
        buttonLabel="+"
        className="!inline-block"
      />
    </div>
  );
}
