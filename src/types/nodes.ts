import type { Node, Edge } from '@xyflow/react';
import type { NodeSectionType, NodeStatus } from './sections';

export interface DesignNodeData extends Record<string, unknown> {
  label: string;
  summary: string;
  status: NodeStatus;
  hidden: boolean;
  sectionDataId: string;
  thumbnailDataUrl?: string;
  nodeType: NodeSectionType;
}

export type DesignNode = Node<DesignNodeData>;
export type DesignEdge = Edge;

export { type NodeSectionType, type NodeStatus };

export const NODE_SECTION_LABELS: Record<NodeSectionType, string> = {
  header: 'Header',
  hero: 'Hero',
  features: 'Features',
  imageText: 'Image + Text',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'Call to Action',
  footer: 'Footer',
};

export const NODE_SECTION_ICONS: Record<NodeSectionType, string> = {
  header: '🔝',
  hero: '🦸',
  features: '✨',
  imageText: '🖼️',
  gallery: '🎨',
  testimonials: '💬',
  pricing: '💰',
  faq: '❓',
  cta: '🚀',
  footer: '📋',
};

export const NODE_SECTION_COLORS: Record<NodeSectionType, string> = {
  header: '#6366f1',
  hero: '#8b5cf6',
  features: '#ec4899',
  imageText: '#f59e0b',
  gallery: '#10b981',
  testimonials: '#14b8a6',
  pricing: '#3b82f6',
  faq: '#f97316',
  cta: '#ef4444',
  footer: '#6b7280',
};
