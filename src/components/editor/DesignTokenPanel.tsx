import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { DesignTokens } from '../../types/design-tokens';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 hover:border-slate-500 transition"
      >
        <div className="w-5 h-5 rounded flex-shrink-0 border border-white/10" style={{ backgroundColor: value }} />
        <span className="text-xs text-slate-300 font-mono flex-1 text-left">{value}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-2xl">
          <HexColorPicker color={value} onChange={onChange} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-2 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
          />
          <button onClick={() => setOpen(false)} className="w-full mt-2 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg py-1.5 transition">Done</button>
        </div>
      )}
    </div>
  );
}

interface SectionProps { title: string; children: React.ReactNode; defaultOpen?: boolean; }
function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition">
        {title}
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function DesignTokenPanel() {
  const tokens = useProjectStore((s) => s.project?.tokens);
  const updateTokens = useProjectStore((s) => s.updateTokens);

  if (!tokens) {
    return <div className="p-4 text-xs text-slate-500">No project loaded.</div>;
  }

  const updateColor = (key: keyof typeof tokens.colors) => (value: string) => {
    updateTokens({ colors: { ...tokens.colors, [key]: value } } as any);
    // Update CSS variable immediately
    document.documentElement.style.setProperty(`--color-${key === 'background' ? 'bg' : key === 'text' ? 'text' : key === 'muted' ? 'muted' : key === 'surface' ? 'surface' : key}`, value);
  };

  return (
    <div className="overflow-y-auto">
      {/* Colors */}
      <Section title="Colors">
        <ColorField label="Primary" value={tokens.colors.primary} onChange={updateColor('primary')} />
        <ColorField label="Secondary" value={tokens.colors.secondary} onChange={updateColor('secondary')} />
        <ColorField label="Accent" value={tokens.colors.accent} onChange={updateColor('accent')} />
        <ColorField label="Background" value={tokens.colors.background} onChange={updateColor('background')} />
        <ColorField label="Surface" value={tokens.colors.surface} onChange={updateColor('surface')} />
        <ColorField label="Text" value={tokens.colors.text} onChange={updateColor('text')} />
        <ColorField label="Muted" value={tokens.colors.muted} onChange={updateColor('muted')} />
      </Section>

      {/* Typography */}
      <Section title="Typography" defaultOpen={false}>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Heading Font</label>
          <input
            type="text"
            value={tokens.typography.headingFont}
            onChange={(e) => updateTokens({ typography: { ...tokens.typography, headingFont: e.target.value } } as any)}
            placeholder="Inter"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Body Font</label>
          <input
            type="text"
            value={tokens.typography.bodyFont}
            onChange={(e) => updateTokens({ typography: { ...tokens.typography, bodyFont: e.target.value } } as any)}
            placeholder="Inter"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Base Font Size: {tokens.typography.baseFontSize}px</label>
          <input
            type="range"
            min={12}
            max={24}
            value={tokens.typography.baseFontSize}
            onChange={(e) => updateTokens({ typography: { ...tokens.typography, baseFontSize: Number(e.target.value) } } as any)}
            className="w-full accent-indigo-500"
          />
        </div>
      </Section>

      {/* Style */}
      <Section title="Style" defaultOpen={false}>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Border Radius</label>
          <div className="flex gap-1.5 flex-wrap">
            {(['none','sm','md','lg','full'] as const).map((r) => (
              <button
                key={r}
                onClick={() => updateTokens({ spacing: { ...tokens.spacing, borderRadius: r } } as any)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${tokens.spacing.borderRadius === r ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >{r}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Shadows</label>
          <div className="flex gap-1.5">
            {(['none','sm','md','lg'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateTokens({ shadows: s } as any)}
                className={`flex-1 py-1 rounded text-xs font-medium transition ${tokens.shadows === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Button Style</label>
          <div className="flex gap-1.5 flex-wrap">
            {(['filled','outline','ghost','pill'] as const).map((b) => (
              <button
                key={b}
                onClick={() => updateTokens({ buttonStyle: b } as any)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${tokens.buttonStyle === b ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >{b}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Spacing Scale</label>
          <div className="flex gap-1.5">
            {(['compact','default','relaxed'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => updateTokens({ spacing: { ...tokens.spacing, scale: sc } } as any)}
                className={`flex-1 py-1 rounded text-xs font-medium transition ${tokens.spacing.scale === sc ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >{sc}</button>
            ))}
          </div>
        </div>
      </Section>

      {/* Presets */}
      <Section title="Quick Presets" defaultOpen={false}>
        {[
          { name: 'Light & Clean', primary: '#6366f1', bg: '#ffffff', text: '#0f172a' },
          { name: 'Dark Mode', primary: '#818cf8', bg: '#0f172a', text: '#f1f5f9' },
          { name: 'Warm Earthy', primary: '#d97706', bg: '#fffbf0', text: '#1c1917' },
          { name: 'Bold Tech', primary: '#10b981', bg: '#030712', text: '#f9fafb' },
        ].map((preset) => (
          <button
            key={preset.name}
            onClick={() => updateTokens({
              colors: { ...tokens.colors, primary: preset.primary, background: preset.bg, text: preset.text },
            } as any)}
            className="w-full flex items-center gap-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left transition border border-slate-700"
          >
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
              <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: preset.bg }} />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.text }} />
            </div>
            <span className="text-xs text-slate-300">{preset.name}</span>
          </button>
        ))}
      </Section>
    </div>
  );
}
