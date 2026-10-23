import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { DesignNode } from '../../../types/nodes';
import BaseNode from './BaseNode';
import type { DesignNodeData } from '../../../types/nodes';
import { useProjectStore } from '../../../store/useProjectStore';
import type { TestimonialsSectionData } from '../../../types/sections';

const TestimonialsNode = memo(({ id, data, selected }: NodeProps<DesignNode>) => {
  const sectionData = useProjectStore((s) =>
    s.project?.sectionData[data.sectionDataId] as TestimonialsSectionData | undefined
  );
  const first = sectionData?.testimonials?.[0];
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <div className="h-16 bg-slate-50 rounded-lg p-2 flex flex-col justify-center">
        <p className="text-xs font-semibold text-slate-700 truncate">{sectionData?.heading ?? 'Testimonials'}</p>
        {first && <p className="text-xs text-slate-500 italic line-clamp-2">"{first.quote.slice(0, 60)}…"</p>}
      </div>
    </BaseNode>
  );
});
TestimonialsNode.displayName = 'TestimonialsNode';
export default TestimonialsNode;
