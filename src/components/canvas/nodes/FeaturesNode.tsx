import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { FeaturesSectionData } from '../../../types/sections';

const FeaturesNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as FeaturesSectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-50 rounded-lg p-2">
        <p className="text-xs font-semibold text-slate-700 mb-1 truncate">{sectionData?.heading ?? 'Features'}</p>
        <div className="flex gap-1 flex-wrap">
          {(sectionData?.features ?? []).slice(0, 4).map((f, i) => (
            <span key={i} className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 truncate max-w-16">{f.icon} {f.title}</span>
          ))}
        </div>
      </div>
    </BaseNode>
  );
});
FeaturesNode.displayName = 'FeaturesNode';
export default FeaturesNode;
