import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { GallerySectionData } from '../../../types/sections';

const GalleryNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as GallerySectionData | undefined
  );
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-50 rounded-lg p-2">
        <p className="text-xs font-semibold text-slate-700 mb-1 truncate">{sectionData?.heading ?? 'Gallery'}</p>
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-8 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    </BaseNode>
  );
});
GalleryNode.displayName = 'GalleryNode';
export default GalleryNode;
