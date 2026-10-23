import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { NODE_SECTION_LABELS } from '../../types/nodes';
import type { SectionData, HeroSectionData, HeaderSectionData, FeaturesSectionData, CtaSectionData, FooterSectionData } from '../../types/sections';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

function TextField({ label, value, onChange, multiline = false }: { label: string; value: any; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition";
  const strVal = typeof value === 'string'
    ? value
    : (value && typeof value === 'object'
        ? (value.alt || value.text || value.label || value.name || '')
        : String(value ?? ''));
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {multiline
        ? <textarea rows={3} value={strVal} onChange={(e) => onChange(e.target.value)} className={cls + ' resize-none'} />
        : <input type="text" value={strVal} onChange={(e) => onChange(e.target.value)} className={cls} />
      }
    </div>
  );
}

export default function SectionEditor() {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const project = useProjectStore((s) => s.project);
  const updateNode = useProjectStore((s) => s.updateNode);
  const updateSectionData = useProjectStore((s) => s.updateSectionData);

  if (selectedNodeIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <p className="text-sm text-slate-500">Select a section on the canvas to edit it.</p>
        <p className="text-xs text-slate-600 mt-2">Double-click any node to open its editor.</p>
      </div>
    );
  }

  if (selectedNodeIds.length > 1) {
    return (
      <div className="p-4">
        <p className="text-sm font-semibold text-white mb-2">{selectedNodeIds.length} sections selected</p>
        <p className="text-xs text-slate-400">Multi-section editing via AI chat is supported. Use the AI Chat panel to modify all selected sections at once.</p>
      </div>
    );
  }

  const nodeId = selectedNodeIds[0];
  const node = project?.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const sectionData = project?.sectionData[node.data.sectionDataId];
  if (!sectionData) return null;

  const update = (patch: Partial<SectionData>) => updateSectionData(node.data.sectionDataId, patch);
  const updateNodeLabel = (label: string) => updateNode(nodeId, { label });

  const renderSpecificEditor = () => {
    switch (sectionData.type) {
      case 'hero': {
        const d = sectionData as HeroSectionData;
        return (
          <>
            <Section title="Content">
              <TextField label="Badge" value={d.badge ?? ''} onChange={(v) => update({ badge: v } as any)} />
              <TextField label="Heading" value={d.heading} onChange={(v) => update({ heading: v } as any)} />
              <TextField label="Subheading" value={d.subheading} onChange={(v) => update({ subheading: v } as any)} />
              <TextField label="Body Text" value={d.bodyText} onChange={(v) => update({ bodyText: v } as any)} multiline />
              <TextField label="Primary CTA Label" value={d.primaryCta.label} onChange={(v) => update({ primaryCta: { ...d.primaryCta, label: v } } as any)} />
              <TextField label="Secondary CTA Label" value={d.secondaryCta?.label ?? ''} onChange={(v) => update({ secondaryCta: { label: v, href: d.secondaryCta?.href ?? '#' } } as any)} />
            </Section>
            <Section title="Layout">
              <div className="flex flex-wrap gap-1.5">
                {(['centered','left','right','split'] as const).map((l) => (
                  <button key={l} onClick={() => update({ layout: l } as any)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${d.layout === l ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{l}</button>
                ))}
              </div>
            </Section>
          </>
        );
      }
      case 'header': {
        const d = sectionData as HeaderSectionData;
        return (
          <Section title="Content">
            <TextField label="Logo / Brand Name" value={d.logo} onChange={(v) => update({ logo: v } as any)} />
            <TextField label="CTA Label" value={d.cta?.label ?? ''} onChange={(v) => update({ cta: { label: v, href: d.cta?.href ?? '#' } } as any)} />
          </Section>
        );
      }
      case 'cta': {
        const d = sectionData as CtaSectionData;
        return (
          <Section title="Content">
            <TextField label="Heading" value={d.heading} onChange={(v) => update({ heading: v } as any)} />
            <TextField label="Subheading" value={d.subheading ?? ''} onChange={(v) => update({ subheading: v } as any)} />
            <TextField label="Primary CTA" value={d.primaryCta.label} onChange={(v) => update({ primaryCta: { ...d.primaryCta, label: v } } as any)} />
            <TextField label="Secondary CTA" value={d.secondaryCta?.label ?? ''} onChange={(v) => update({ secondaryCta: { label: v, href: '#' } } as any)} />
          </Section>
        );
      }
      case 'footer': {
        const d = sectionData as FooterSectionData;
        return (
          <Section title="Content">
            <TextField label="Logo" value={d.logo} onChange={(v) => update({ logo: v } as any)} />
            <TextField label="Tagline" value={d.tagline ?? ''} onChange={(v) => update({ tagline: v } as any)} />
            <TextField label="Copyright" value={d.copyright} onChange={(v) => update({ copyright: v } as any)} />
          </Section>
        );
      }
      default:
        return (
          <Section title="Content">
            {'heading' in sectionData && (
              <TextField label="Heading" value={(sectionData as any).heading ?? ''} onChange={(v) => update({ heading: v } as any)} />
            )}
            {'subheading' in sectionData && (
              <TextField label="Subheading" value={(sectionData as any).subheading ?? ''} onChange={(v) => update({ subheading: v } as any)} />
            )}
          </Section>
        );
    }
  };

  return (
    <div className="overflow-y-auto">
      {/* Node meta */}
      <div className="px-4 py-3 border-b border-slate-700">
        <p className="text-xs text-slate-500 mb-1">{NODE_SECTION_LABELS[node.data.nodeType]} Section</p>
        <input
          type="text"
          value={node.data.label}
          onChange={(e) => updateNodeLabel(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5 transition"
        />
        <div className="flex items-center gap-2 mt-2">
          {(['draft','generated','modified'] as const).map((st) => (
            <button
              key={st}
              onClick={() => updateNode(nodeId, { status: st })}
              className={`px-2 py-0.5 rounded text-xs transition ${node.data.status === st ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >{st}</button>
          ))}
        </div>
      </div>

      {/* Background */}
      <Section title="Background" defaultOpen={false}>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Background Color</label>
          <input
            type="color"
            value={(sectionData as any).background?.color?.startsWith('#') ? (sectionData as any).background.color : '#ffffff'}
            onChange={(e) => update({ background: { type: 'color', color: e.target.value } } as any)}
            className="w-full h-8 rounded-lg border border-slate-600 bg-slate-800 cursor-pointer"
          />
        </div>
      </Section>

      {/* Spacing */}
      <Section title="Spacing" defaultOpen={false}>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Padding Top: {(sectionData as any).spacing?.paddingTop ?? 5}rem</label>
          <input type="range" min={0} max={20} value={(sectionData as any).spacing?.paddingTop ?? 5}
            onChange={(e) => update({ spacing: { ...(sectionData as any).spacing, paddingTop: Number(e.target.value) } } as any)}
            className="w-full accent-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Padding Bottom: {(sectionData as any).spacing?.paddingBottom ?? 5}rem</label>
          <input type="range" min={0} max={20} value={(sectionData as any).spacing?.paddingBottom ?? 5}
            onChange={(e) => update({ spacing: { ...(sectionData as any).spacing, paddingBottom: Number(e.target.value) } } as any)}
            className="w-full accent-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Width</label>
          <div className="flex gap-1.5 flex-wrap">
            {(['full','container','wide','narrow'] as const).map((w) => (
              <button key={w} onClick={() => update({ spacing: { ...(sectionData as any).spacing, width: w } } as any)}
                className={`px-2.5 py-1 rounded text-xs transition ${(sectionData as any).spacing?.width === w ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{w}</button>
            ))}
          </div>
        </div>
      </Section>

      {/* Visibility */}
      <Section title="Visibility" defaultOpen={false}>
        {(['desktop','tablet','mobile'] as const).map((device) => (
          <label key={device} className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-xs text-slate-300 capitalize">{device}</span>
            <input type="checkbox"
              checked={(sectionData as any).visible?.[device] ?? true}
              onChange={(e) => update({ visible: { ...(sectionData as any).visible, [device]: e.target.checked } } as any)}
              className="w-4 h-4 rounded accent-indigo-500"
            />
          </label>
        ))}
      </Section>

      {/* Type-specific */}
      {renderSpecificEditor()}
    </div>
  );
}
