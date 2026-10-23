import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { HeroSectionData } from '../../../types/sections';

const HeroNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as HeroSectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-2 flex flex-col justify-center">
        {sectionData?.badge && <span className="text-xs text-indigo-500 mb-0.5">{sectionData.badge}</span>}
        <p className="text-xs font-bold text-slate-800 truncate">{sectionData?.heading ?? 'Hero Heading'}</p>
        <p className="text-xs text-slate-500 truncate">{sectionData?.subheading ?? ''}</p>
      </div>
    </BaseNode>
  );
});
HeroNode.displayName = 'HeroNode';
export default HeroNode;
