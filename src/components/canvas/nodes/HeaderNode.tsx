import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { HeaderSectionData } from '../../../types/sections';

const HeaderNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as HeaderSectionData | undefined
  );

  const logoText = typeof sectionData?.logo === 'string'
    ? sectionData.logo
    : (sectionData?.logo as any)?.alt || (sectionData?.logo as any)?.text || 'Logo';

  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-14 bg-slate-50 rounded-lg px-3 flex items-center justify-between">
        <span className="font-bold text-sm text-slate-700">{logoText}</span>
        <div className="flex gap-2">
          {(sectionData?.navItems ?? []).slice(0, 3).map((item: any, i) => (
            <span key={i} className="text-xs text-slate-500">{typeof item?.label === 'string' ? item.label : String(item ?? '')}</span>
          ))}
        </div>
        {sectionData?.cta && (
          <span className="text-xs bg-indigo-100 text-indigo-700 rounded px-2 py-0.5">{typeof sectionData.cta.label === 'string' ? sectionData.cta.label : 'CTA'}</span>
        )}
      </div>
    </BaseNode>
  );
});
HeaderNode.displayName = 'HeaderNode';
export default HeaderNode;
