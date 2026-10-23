import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { ImageTextSectionData } from '../../../types/sections';

const ImageTextNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as ImageTextSectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-50 rounded-lg p-2 flex gap-2">
        <div className="w-14 h-full bg-slate-200 rounded flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{sectionData?.heading ?? 'Image + Text'}</p>
          <p className="text-xs text-slate-500 line-clamp-2">{sectionData?.bodyText ?? ''}</p>
        </div>
      </div>
    </BaseNode>
  );
});
ImageTextNode.displayName = 'ImageTextNode';
export default ImageTextNode;
