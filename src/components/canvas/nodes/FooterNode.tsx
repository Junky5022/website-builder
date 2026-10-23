import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { FooterSectionData } from '../../../types/sections';

const FooterNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as FooterSectionData | undefined
  );
  const logoText = typeof sectionData?.logo === 'string'
    ? sectionData.logo
    : (sectionData?.logo as any)?.alt || (sectionData?.logo as any)?.text || 'Brand';

  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-800 rounded-lg p-2">
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-white truncate">{logoText}</p>
            <p className="text-xs text-slate-400 truncate">{typeof sectionData?.tagline === 'string' ? sectionData.tagline : ''}</p>
          </div>
          <div className="flex gap-2">
            {(sectionData?.columns ?? []).slice(0, 2).map((col, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-slate-300 truncate">{typeof col?.heading === 'string' ? col.heading : ''}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-1 truncate">{typeof sectionData?.copyright === 'string' ? sectionData.copyright : ''}</p>
      </div>
    </BaseNode>
  );
});
FooterNode.displayName = 'FooterNode';
export default FooterNode;
