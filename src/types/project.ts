import type { DesignTokens } from './design-tokens';
import type { SectionDataMap } from './sections';
import type { DesignNode, DesignEdge } from './nodes';
import type { ChatMessage } from './ai';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface SourceInfo {
  type: 'url' | 'screenshot' | 'htmlFile' | 'imageFiles' | 'pastedCode' | 'none';
  url?: string;
  fileName?: string;
  analyzedAt?: number;
}

export interface Project extends ProjectMeta {
  tokens: DesignTokens;
  nodes: DesignNode[];
  edges: DesignEdge[];
  sectionData: SectionDataMap;
  chatHistory: ChatMessage[];
  sourceInfo: SourceInfo;
  clonedPageHtml?: string;
}
