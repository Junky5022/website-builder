export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // base64
  timestamp: number;
}

export interface AIChange {
  id: string;
  description: string;
  affectedNodeIds: string[];
  patch: AIChangePatch;
  status: 'pending' | 'applied' | 'discarded';
  timestamp: number;
}

export interface AIChangePatch {
  sectionData?: Record<string, Partial<import('./sections').SectionData>>;
  tokens?: Partial<import('./design-tokens').DesignTokens>;
  nodeOrder?: string[]; // ids in desired order → will rebuild edges
  newNodes?: Array<{
    type: import('./sections').NodeSectionType;
    label: string;
    sectionData: import('./sections').SectionData;
  }>;
  deleteNodeIds?: string[];
  renameNodes?: Record<string, string>;
  // Live DOM modifications
  domReplacements?: Array<{
    selector?: string; // CSS selector or text hint
    oldText?: string;  // exact text to find and replace
    newText?: string;  // replacement text
    newHtml?: string;  // replacement HTML
    styles?: Record<string, string>; // CSS styles to apply (e.g. { "color": "#ff0000", "background-color": "#000" })
  }>;
  newClonedHtml?: string; // Full updated HTML if the AI rewrites sections
}

export interface PageAnalysis {
  sections: Array<{
    type: import('./sections').NodeSectionType;
    order: number;
    label: string;
    summary: string;
    sectionData: import('./sections').SectionData;
  }>;
  tokens: Partial<import('./design-tokens').DesignTokens>;
  notes: string[];
}

export interface AIProvider {
  analyzeUrl(
    html: string,
    url: string,
    images?: Array<{ base64: string; mimeType: string }>
  ): Promise<PageAnalysis>;
  analyzeHtml(html: string): Promise<PageAnalysis>;
  analyzeImages(images: Array<{ base64: string; mimeType: string }>): Promise<PageAnalysis>;
  chat(
    messages: ChatMessage[],
    context: DesignContext
  ): Promise<{ explanation: string; changes: AIChange[] }>;
}

export interface DesignContext {
  projectName: string;
  tokens: import('./design-tokens').DesignTokens;
  sections: Array<{
    id: string;
    type: import('./sections').NodeSectionType;
    label: string;
    data: import('./sections').SectionData;
  }>;
  selectedNodeIds: string[];
  clonedPageHtml?: string;
  selectedElementContext?: {
    tagName: string;
    text: string;
    selector?: string;
  };
}
