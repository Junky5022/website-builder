import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { CtaSectionData } from '../../../types/sections';

const CtaNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as CtaSectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-3 flex flex-col justify-center text-white">
        <p className="text-xs font-bold truncate">{sectionData?.heading ?? 'Call to Action'}</p>
        <p className="text-xs opacity-80 truncate">{sectionData?.subheading ?? ''}</p>
        {sectionData?.primaryCta && (
          <span className="text-xs mt-1 bg-white/20 rounded px-2 py-0.5 self-start">{sectionData.primaryCta.label}</span>
        )}
      </div>
    </BaseNode>
  );
});
CtaNode.displayName = 'CtaNode';
export default CtaNode;
