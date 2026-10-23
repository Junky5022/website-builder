import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project } from '../types/project';
import type { DesignTokens } from '../types/design-tokens';
import type { SectionData, SectionDataMap } from '../types/sections';
import type { DesignNode, DesignEdge } from '../types/nodes';
import type { ChatMessage, AIChange } from '../types/ai';
import type { CanvasElement } from '../types/elements';
import {
  sectionDataToElements,
  addElementToTree,
  updateElementInTree,
  deleteElementFromTree,
  duplicateElementInTree,
  moveElementInTree,
  extractElementFromTree,
} from '../services/analyzer/elementConverter';
import {
  saveProject,
  loadProject,
  createBlankProject,
  generateId,
  getActiveProjectId,
  setActiveProjectId,
} from '../utils/storage';

// ─── Snapshot for undo/redo ──────────────────────────────────────────────────
interface Snapshot {
  tokens: DesignTokens;
  nodes: DesignNode[];
  edges: DesignEdge[];
  sectionData: SectionDataMap;
}

interface ProjectStore {
  // ── Project ──────────────────────────────────────────────────────────────
  project: Project | null;
  isSaving: boolean;

  // ── History ──────────────────────────────────────────────────────────────
  past: Snapshot[];
  future: Snapshot[];

  // ── Pending AI changes ───────────────────────────────────────────────────
  pendingChanges: AIChange[];

  // ── Actions ──────────────────────────────────────────────────────────────
  loadProject: (id: string) => boolean;
  setProject: (project: Project) => void;
  createProject: (name: string) => Project;
  saveNow: () => void;

  // Tokens
  updateTokens: (tokens: Partial<DesignTokens>) => void;

  // Nodes / Edges
  setNodes: (nodes: DesignNode[]) => void;
  setEdges: (edges: DesignEdge[]) => void;
  addNode: (node: DesignNode) => void;
  updateNode: (id: string, data: Partial<DesignNode['data']>) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNode: (id: string) => void;
  moveNode: (id: string, direction: 'up' | 'down') => void;
  reorderNodes: (fromIndex: number, toIndex: number) => void;

  // Section data
  setSectionData: (id: string, data: SectionData) => void;
  updateSectionData: (id: string, patch: Partial<SectionData>) => void;
  setClonedPageHtml: (html: string | undefined, url?: string) => void;

  // Element sandbox
  setElements: (sectionId: string, elements: CanvasElement[]) => void;
  addElement: (sectionId: string, element: CanvasElement, targetElementId?: string, position?: 'before' | 'after' | 'inside') => void;
  updateElement: (sectionId: string, elementId: string, patch: Partial<CanvasElement>) => void;
  deleteElement: (sectionId: string, elementId: string) => void;
  duplicateElement: (sectionId: string, elementId: string) => void;
  moveElement: (sectionId: string, elementId: string, direction: 'up' | 'down') => void;
  moveElementTo: (
    sourceSectionId: string,
    elementId: string,
    targetSectionId: string,
    targetElementId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;

  // Chat
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // AI changes
  addPendingChange: (change: AIChange) => void;
  applyChange: (changeId: string) => void;
  discardChange: (changeId: string) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    project: null,
    isSaving: false,
    past: [],
    future: [],
    pendingChanges: [],

    loadProject(id) {
      const p = loadProject(id);
      if (!p) return false;
      setActiveProjectId(id);
      set((s) => { s.project = p; s.past = []; s.future = []; });
      return true;
    },

    setProject(project) {
      setActiveProjectId(project.id);
      set((s) => { s.project = project; s.past = []; s.future = []; });
    },

    createProject(name) {
      const p = createBlankProject(name);
      setActiveProjectId(p.id);
      set((s) => { s.project = p; s.past = []; s.future = []; });
      saveProject(p);
      return p;
    },

    saveNow() {
      const { project } = get();
      if (!project) return;
      set((s) => { s.isSaving = true; });
      saveProject(project);
      setTimeout(() => set((s) => { s.isSaving = false; }), 600);
    },

    updateTokens(tokens) {
      get().pushHistory();
      set((s) => {
        if (!s.project) return;
        s.project.tokens = { ...s.project.tokens, ...tokens } as DesignTokens;
        if (tokens.colors) s.project.tokens.colors = { ...s.project.tokens.colors, ...tokens.colors };
        if (tokens.typography) s.project.tokens.typography = { ...s.project.tokens.typography, ...tokens.typography };
        if (tokens.spacing) s.project.tokens.spacing = { ...s.project.tokens.spacing, ...tokens.spacing };
      });
      scheduleAutosave(get);
    },

    setNodes(nodes) {
      set((s) => { if (s.project) s.project.nodes = nodes; });
      scheduleAutosave(get);
    },

    setEdges(edges) {
      set((s) => { if (s.project) s.project.edges = edges; });
      scheduleAutosave(get);
    },

    addNode(node) {
      get().pushHistory();
      set((s) => { if (s.project) s.project.nodes.push(node as any); });
      scheduleAutosave(get);
    },

    updateNode(id, data) {
      set((s) => {
        if (!s.project) return;
        const n = s.project.nodes.find((n) => n.id === id);
        if (n) Object.assign(n.data, data);
      });
      scheduleAutosave(get);
    },

    deleteNodes(ids) {
      get().pushHistory();
      set((s) => {
        if (!s.project) return;
        s.project.nodes = s.project.nodes.filter((n) => !ids.includes(n.id));
        s.project.edges = s.project.edges.filter(
          (e) => !ids.includes(e.source) && !ids.includes(e.target)
        );
        ids.forEach((id) => {
          const node = get().project?.nodes.find((n) => n.id === id);
          if (node) delete s.project!.sectionData[node.data.sectionDataId];
        });
      });
      scheduleAutosave(get);
    },

    duplicateNode(id) {
      const { project } = get();
      if (!project) return;
      const node = project.nodes.find((n) => n.id === id);
      if (!node) return;
      const newId = generateId();
      const newSectionId = generateId();
      const origSection = project.sectionData[node.data.sectionDataId];
      get().pushHistory();
      set((s) => {
        if (!s.project) return;
        s.project.nodes.push({
          ...node,
          id: newId,
          position: { x: node.position.x + 20, y: node.position.y + 20 },
          data: { ...node.data, label: node.data.label + ' (copy)', sectionDataId: newSectionId },
        } as any);
        if (origSection) {
          s.project.sectionData[newSectionId] = { ...origSection, id: newSectionId } as any;
        }
      });
      scheduleAutosave(get);
    },

    reorderNodes(fromIndex, toIndex) {
      const { project } = get();
      if (!project) return;
      const nodes = [...project.nodes].sort((a, b) => a.position.y - b.position.y);
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= nodes.length || toIndex >= nodes.length) {
        return;
      }
      get().pushHistory();
      const [moved] = nodes.splice(fromIndex, 1);
      nodes.splice(toIndex, 0, moved);

      // Re-assign y coordinates sequentially so order persists
      nodes.forEach((n, idx) => {
        n.position.y = idx * 250;
      });

      const newEdges = nodes.slice(1).map((node, idx) => ({
        id: `e-${nodes[idx].id}-${node.id}`,
        source: nodes[idx].id,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }));

      set((s) => {
        if (!s.project) return;
        s.project.nodes = nodes as any;
        s.project.edges = newEdges as any;
      });
      scheduleAutosave(get);
    },

    moveNode(id, direction) {
      const { project } = get();
      if (!project) return;
      const nodes = [...project.nodes].sort((a, b) => a.position.y - b.position.y);
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      get().reorderNodes(idx, targetIdx);
    },

    setSectionData(id, data) {
      set((s) => { if (s.project) s.project.sectionData[id] = data; });
      scheduleAutosave(get);
    },

    updateSectionData(id, patch) {
      set((s) => {
        if (!s.project || !s.project.sectionData[id]) return;
        Object.assign(s.project.sectionData[id], patch);
      });
      scheduleAutosave(get);
    },

    setClonedPageHtml(html, url) {
      get().pushHistory();
      set((s) => {
        if (!s.project) return;
        s.project.clonedPageHtml = html;
        if (url) {
          s.project.sourceInfo = {
            type: 'url',
            url,
            analyzedAt: Date.now(),
          };
        }
      });
      scheduleAutosave(get);
    },

    setElements(sectionId, elements) {
      set((s) => {
        if (!s.project || !s.project.sectionData[sectionId]) return;
        s.project.sectionData[sectionId].elements = elements;
      });
      scheduleAutosave(get);
    },

    addElement(sectionId, element, targetId, pos) {
      get().pushHistory();
      set((s) => {
        if (!s.project || !s.project.sectionData[sectionId]) return;
        const current = s.project.sectionData[sectionId].elements || sectionDataToElements(s.project.sectionData[sectionId]);
        s.project.sectionData[sectionId].elements = addElementToTree(current, element, targetId, pos);
      });
      scheduleAutosave(get);
    },

    updateElement(sectionId, elementId, patch) {
      set((s) => {
        if (!s.project || !s.project.sectionData[sectionId]) return;
        const current = s.project.sectionData[sectionId].elements || sectionDataToElements(s.project.sectionData[sectionId]);
        s.project.sectionData[sectionId].elements = updateElementInTree(current, elementId, patch);
      });
      scheduleAutosave(get);
    },

    deleteElement(sectionId, elementId) {
      get().pushHistory();
      set((s) => {
        if (!s.project || !s.project.sectionData[sectionId]) return;
        const current = s.project.sectionData[sectionId].elements || sectionDataToElements(s.project.sectionData[sectionId]);
        s.project.sectionData[sectionId].elements = deleteElementFromTree(current, elementId);
      });
      scheduleAutosave(get);
    },

    duplicateElement(sectionId, elementId) {
      get().pushHistory();
      set((s) => {
        if (!s.project || !s.project.sectionData[sectionId]) return;
        const current = s.project.sectionData[sectionId].elements || sectionDataToElements(s.project.sectionData[sectionId]);
        s.project.sectionData[sectionId].elements = duplicateElementInTree(current, elementId);
      });
      scheduleAutosave(get);
    },

    moveElement(sectionId, elementId, direction) {
      get().pushHistory();
      set((s) => {
        if (!s.project || !s.project.sectionData[sectionId]) return;
        const current = s.project.sectionData[sectionId].elements || sectionDataToElements(s.project.sectionData[sectionId]);
        s.project.sectionData[sectionId].elements = moveElementInTree(current, elementId, direction);
      });
      scheduleAutosave(get);
    },

    moveElementTo(sourceSectionId, elementId, targetSectionId, targetElementId, position = 'after') {
      get().pushHistory();
      set((s) => {
        if (!s.project) return;
        const srcSection = s.project.sectionData[sourceSectionId];
        const tgtSection = s.project.sectionData[targetSectionId];
        if (!srcSection || !tgtSection) return;

        const srcElements = srcSection.elements || sectionDataToElements(srcSection);
        const { extracted, remaining } = extractElementFromTree(srcElements, elementId);
        if (!extracted) return;

        if (sourceSectionId === targetSectionId) {
          srcSection.elements = addElementToTree(remaining, extracted, targetElementId, position);
        } else {
          srcSection.elements = remaining;
          const tgtElements = tgtSection.elements || sectionDataToElements(tgtSection);
          tgtSection.elements = addElementToTree(tgtElements, extracted, targetElementId, position);
        }
      });
      scheduleAutosave(get);
    },

    addChatMessage(msg) {
      set((s) => { if (s.project) s.project.chatHistory.push(msg as any); });
      scheduleAutosave(get);
    },

    clearChat() {
      set((s) => { if (s.project) s.project.chatHistory = []; });
      scheduleAutosave(get);
    },

    addPendingChange(change) {
      set((s) => { s.pendingChanges.push(change as any); });
    },

    applyChange(changeId) {
      const { project, pendingChanges } = get();
      if (!project) return;
      const change = pendingChanges.find((c) => c.id === changeId);
      if (!change) return;

      get().pushHistory();
      set((s) => {
        if (!s.project) return;
        const { patch } = change;

        // Apply token changes
        if (patch.tokens) {
          Object.assign(s.project.tokens, patch.tokens);
        }

        // Apply section data patches
        if (patch.sectionData) {
          Object.entries(patch.sectionData).forEach(([id, partial]) => {
            if (s.project!.sectionData[id]) {
              Object.assign(s.project!.sectionData[id], partial);
            }
          });
        }

        // Delete nodes
        if (patch.deleteNodeIds?.length) {
          s.project.nodes = s.project.nodes.filter(
            (n) => !patch.deleteNodeIds!.includes(n.id)
          );
        }

        // Rename nodes
        if (patch.renameNodes) {
          Object.entries(patch.renameNodes).forEach(([id, label]) => {
            const n = s.project!.nodes.find((n) => n.id === id);
            if (n) n.data.label = label;
          });
        }

        // Mark change as applied
        const ci = s.pendingChanges.findIndex((c) => c.id === changeId);
        if (ci !== -1) s.pendingChanges[ci].status = 'applied';
      });
      scheduleAutosave(get);
    },

    discardChange(changeId) {
      set((s) => {
        const ci = s.pendingChanges.findIndex((c) => c.id === changeId);
        if (ci !== -1) s.pendingChanges[ci].status = 'discarded';
      });
    },

    pushHistory() {
      const { project } = get();
      if (!project) return;
      const snap: Snapshot = {
        tokens: JSON.parse(JSON.stringify(project.tokens)),
        nodes: JSON.parse(JSON.stringify(project.nodes)),
        edges: JSON.parse(JSON.stringify(project.edges)),
        sectionData: JSON.parse(JSON.stringify(project.sectionData)),
      };
      set((s) => {
        s.past.push(snap as any);
        if (s.past.length > 50) s.past.shift();
        s.future = [];
      });
    },

    undo() {
      const { past, project } = get();
      if (!past.length || !project) return;
      const snap = past[past.length - 1];
      const current: Snapshot = {
        tokens: JSON.parse(JSON.stringify(project.tokens)),
        nodes: JSON.parse(JSON.stringify(project.nodes)),
        edges: JSON.parse(JSON.stringify(project.edges)),
        sectionData: JSON.parse(JSON.stringify(project.sectionData)),
      };
      set((s) => {
        s.future.push(current as any);
        s.past.pop();
        if (s.project) {
          s.project.tokens = snap.tokens as any;
          s.project.nodes = snap.nodes as any;
          s.project.edges = snap.edges as any;
          s.project.sectionData = snap.sectionData as any;
        }
      });
      scheduleAutosave(get);
    },

    redo() {
      const { future, project } = get();
      if (!future.length || !project) return;
      const snap = future[future.length - 1];
      const current: Snapshot = {
        tokens: JSON.parse(JSON.stringify(project.tokens)),
        nodes: JSON.parse(JSON.stringify(project.nodes)),
        edges: JSON.parse(JSON.stringify(project.edges)),
        sectionData: JSON.parse(JSON.stringify(project.sectionData)),
      };
      set((s) => {
        s.past.push(current as any);
        s.future.pop();
        if (s.project) {
          s.project.tokens = snap.tokens as any;
          s.project.nodes = snap.nodes as any;
          s.project.edges = snap.edges as any;
          s.project.sectionData = snap.sectionData as any;
        }
      });
      scheduleAutosave(get);
    },
  }))
);

function scheduleAutosave(get: () => ProjectStore) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => get().saveNow(), 2000);
}
