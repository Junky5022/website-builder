import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { PricingSectionData } from '../../../types/sections';

const PricingNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as PricingSectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-50 rounded-lg p-2">
        <p className="text-xs font-semibold text-slate-700 mb-1 truncate">{sectionData?.heading ?? 'Pricing'}</p>
        <div className="flex gap-1">
          {(sectionData?.tiers ?? []).slice(0, 3).map((t, i) => (
            <div key={i} className={`flex-1 rounded px-1 py-1 text-center ${t.highlighted ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-slate-200'}`}>
              <p className="text-xs font-bold truncate">{t.price}</p>
              <p className="text-xs text-slate-500 truncate">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </BaseNode>
  );
});
PricingNode.displayName = 'PricingNode';
export default PricingNode;
