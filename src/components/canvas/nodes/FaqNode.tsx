import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { FaqSectionData } from '../../../types/sections';

const FaqNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as FaqSectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-50 rounded-lg p-2">
        <p className="text-xs font-semibold text-slate-700 mb-1 truncate">{sectionData?.heading ?? 'FAQ'}</p>
        {(sectionData?.items ?? []).slice(0, 2).map((item, i) => (
          <div key={i} className="flex items-center gap-1 mb-0.5">
            <span className="text-xs text-indigo-400">Q</span>
            <p className="text-xs text-slate-600 truncate">{item.question}</p>
          </div>
        ))}
      </div>
    </BaseNode>
  );
});
FaqNode.displayName = 'FaqNode';
export default FaqNode;
